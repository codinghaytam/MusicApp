import asyncio
import json
import logging
import mimetypes
import os
import secrets
import subprocess
import wave
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from elasticsearch import Elasticsearch, NotFoundError
from fastapi import FastAPI, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from keybert import KeyBERT
from transformers import pipeline

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("audio_service")

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ES_NODE = os.getenv("ES_NODE", "http://localhost:9200")
ES_API_KEY = os.getenv(
    "ES_API_KEY",
    "ekozdERwc0JCWHN0ZEo0X0VtVTU6OUNLU3BYNVRHN3d5VkxUdEVHWWR6dw==",
)
ES_INDEX = "audio_analysis"

MAX_EMOTION_RESULTS = 3
EMOTION_LABEL_MAP = {
    "anger": "Anger",
    "angry": "Anger",
    "label_0": "Anger",
    "label 0": "Anger",
    "disgust": "Disgust",
    "label_1": "Disgust",
    "label 1": "Disgust",
    "fear": "Fear",
    "fearful": "Fear",
    "label_2": "Fear",
    "label 2": "Fear",
    "joy": "Joy",
    "joyful": "Joy",
    "label_3": "Joy",
    "label 3": "Joy",
    "sadness": "Sadness",
    "sad": "Sadness",
    "label_4": "Sadness",
    "label 4": "Sadness",
    "surprise": "Surprise",
    "surprised": "Surprise",
    "label_5": "Surprise",
    "label 5": "Surprise",
}
LABEL_INDEX_MAP = {
    0: "Anger",
    1: "Disgust",
    2: "Fear",
    3: "Joy",
    4: "Sadness",
    5: "Surprise",
}

app = FastAPI(title="Audio Analyzer API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR, check_dir=True), name="uploads")

es_client = Elasticsearch(ES_NODE, api_key=ES_API_KEY)
_speech_pipeline = None
_emotion_pipeline = None
_keyword_model = None
speech_lock = asyncio.Lock()
emotion_lock = asyncio.Lock()
keyword_lock = asyncio.Lock()


def derive_track_id(source_name: str | None, stored_path: Path) -> str:
    name = source_name or stored_path.name
    stem = Path(name).stem
    sanitized = "".join(ch for ch in stem if ch.isalnum() or ch in ("-", "_"))
    return sanitized or stored_path.stem


def extract_media_metadata(original_name: str | None, stored_path: Path) -> Dict[str, Any]:
    metadata: Dict[str, Any] = {"trackId": derive_track_id(original_name, stored_path)}
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "format=duration,bit_rate",
        "-of",
        "json",
        str(stored_path),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode == 0 and proc.stdout:
            data = json.loads(proc.stdout)
            fmt = data.get("format", {}) if isinstance(data, dict) else {}
            duration = fmt.get("duration")
            bit_rate = fmt.get("bit_rate")
            if duration is not None:
                try:
                    metadata["duration"] = round(float(duration), 3)
                except (TypeError, ValueError):
                    pass
            if bit_rate is not None:
                try:
                    metadata["bitRate"] = int(round(float(bit_rate) / 1000))
                except (TypeError, ValueError):
                    pass
    except FileNotFoundError:
        log.warning("ffprobe not found; skipping media metadata extraction")
    except Exception as exc:  # noqa: BLE001
        log.warning("Metadata extraction failed: %s", exc)
    return metadata


def normalize_emotion_label(label: str) -> str:
    cleaned = label.replace("_", " ").strip().lower()
    return EMOTION_LABEL_MAP.get(cleaned, label.strip())


def resolve_emotion_label(raw_label: str, classifier=None) -> str:
    if not raw_label:
        return ""
    trimmed = raw_label.strip()
    normalized = normalize_emotion_label(trimmed)
    if normalized != trimmed:
        return normalized
    if trimmed.lower().startswith("label_") and classifier is not None:
        model = getattr(classifier, "model", None)
        config = getattr(model, "config", None)
        id2label = getattr(config, "id2label", {}) or {}
        suffix = trimmed.split("_", 1)[-1]
        candidates = []
        try:
            idx = int(suffix)
            candidates.append(id2label.get(idx))
            candidates.append(LABEL_INDEX_MAP.get(idx))
        except ValueError:
            pass
        candidates.append(id2label.get(suffix))
        for candidate in candidates:
            if candidate:
                return normalize_emotion_label(str(candidate))
    return trimmed


async def ensure_index() -> None:
    exists = await asyncio.to_thread(es_client.indices.exists, index=ES_INDEX)
    if exists:
        return
    mapping = {
        "settings": {
            "number_of_shards": 1,
            "analysis": {"analyzer": {"default": {"type": "standard"}}},
        },
        "mappings": {
            "properties": {
                "fileName": {"type": "text"},
                "transcription": {"type": "text"},
                "transcriptionVector": {
                    "type": "dense_vector",
                    "dims": 384,
                    "index": True,
                    "similarity": "cosine",
                },
                "confidence": {"type": "integer"},
                "keywords": {"type": "text"},
                "timestamp": {"type": "date"},
                "trackId": {"type": "keyword"},
                "title": {"type": "text"},
                "artist": {"type": "text"},
                "album": {"type": "text"},
                "genre": {"type": "keyword"},
                "duration": {"type": "float"},
                "bitRate": {"type": "integer"},
                "emotions": {"type": "keyword"},
                "primaryEmotions": {"type": "keyword"},
                "scores": {"type": "object"},
            }
        },
    }
    await asyncio.to_thread(es_client.indices.create, index=ES_INDEX, **mapping)
    log.info("Created index %s", ES_INDEX)


async def get_speech_pipeline():
    global _speech_pipeline
    if _speech_pipeline:
        return _speech_pipeline
    async with speech_lock:
        if _speech_pipeline:
            return _speech_pipeline
        log.info("Loading whisper tiny pipeline")
        _speech_pipeline = await asyncio.to_thread(
            pipeline, "automatic-speech-recognition", "openai/whisper-tiny"
        )
    return _speech_pipeline


async def get_emotion_pipeline():
    global _emotion_pipeline
    if _emotion_pipeline:
        return _emotion_pipeline
    async with emotion_lock:
        if _emotion_pipeline:
            return _emotion_pipeline
        log.info("Loading sentiment pipeline")
        _emotion_pipeline = await asyncio.to_thread(
            pipeline,
            "text-classification",
            "songhieng/khmer-xlmr-base-sentimental-multi-label",
        )
    return _emotion_pipeline


async def get_keyword_model():
    global _keyword_model
    if _keyword_model:
        return _keyword_model
    async with keyword_lock:
        if _keyword_model:
            return _keyword_model
        log.info("Loading KeyBERT model")
        _keyword_model = await asyncio.to_thread(KeyBERT)
    return _keyword_model


async def convert_to_wav(src: Path) -> Path:
    wav_path = src.with_suffix(".wav")
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(src),
        "-ac",
        "1",
        "-ar",
        "16000",
        "-sample_fmt",
        "s16",
        str(wav_path),
    ]
    proc = await asyncio.to_thread(
        subprocess.run, cmd, capture_output=True, text=True, check=False
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "ffmpeg conversion failed")
    return wav_path


def _load_audio_array(path: Path) -> Tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as wav_file:
        sample_rate = wav_file.getframerate()
        num_channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        num_frames = wav_file.getnframes()
        frames = wav_file.readframes(num_frames)

    dtype_map = {1: np.int8, 2: np.int16, 3: np.int32, 4: np.int32}
    dtype = dtype_map.get(sample_width)
    if dtype is None:
        raise RuntimeError(f"Unsupported sample width: {sample_width}")

    audio = np.frombuffer(frames, dtype=dtype).astype(np.float32)
    if num_channels > 1:
        audio = audio.reshape(-1, num_channels).mean(axis=1)

    max_val = float(np.iinfo(dtype).max)
    if max_val:
        audio /= max_val

    return audio, sample_rate


async def transcribe_audio(wav_path: Path) -> str:
    pipeline_obj = await get_speech_pipeline()
    audio_array, sample_rate = await asyncio.to_thread(_load_audio_array, wav_path)
    result = await asyncio.to_thread(
        pipeline_obj,
        {"array": audio_array, "sampling_rate": sample_rate},
        chunk_length_s=30,
        stride_length_s=(6, 2),
    )
    if isinstance(result, str):
        text = result.strip()
        log.info("Transcription produced %s chars (string)", len(text))
        return text
    if isinstance(result, dict):
        text = result.get("text") or result.get("transcript")
        if text:
            final_text = text.strip()
            log.info("Transcription produced %s chars (dict:text)", len(final_text))
            return final_text
        segments = result.get("segments")
        if isinstance(segments, list):
            ordered = sorted(
                segments,
                key=lambda seg: seg.get("start", 0),
            )
            merged = " ".join(seg.get("text", "") for seg in ordered)
            final_text = merged.strip()
            log.info(
                "Transcription produced %s chars across %s segments",
                len(final_text),
                len(ordered),
            )
            return final_text
    raise RuntimeError("Unexpected transcription response")


async def extract_keywords(text: str) -> List[str]:
    trimmed = text.strip()
    if not trimmed:
        return []
    model = await get_keyword_model()
    pairs = await asyncio.to_thread(model.extract_keywords, trimmed, top_n=5)
    return [word for word, _ in pairs]


async def analyze_text(text: str) -> Dict[str, Any]:
    trimmed = text.strip()
    if not trimmed:
        return {
            "confidence": 100,
            "keywords": [],
            "emotions": [],
            "primaryEmotions": [],
            "scores": {},
        }
    classifier = await get_emotion_pipeline()
    outputs = await asyncio.to_thread(classifier, trimmed, top_k=8)
    rows = outputs if isinstance(outputs, list) else [outputs]
    normalized = []
    for item in rows:
        if not isinstance(item, dict):
            continue
        label = item.get("label")
        score = float(item.get("score", 0))
        if not label:
            continue
        resolved = resolve_emotion_label(str(label), classifier)
        normalized.append(
            {
                "raw": str(label),
                "label": resolved,
                "score": score,
            }
        )
    normalized.sort(key=lambda x: x["score"], reverse=True)
    top = normalized[:MAX_EMOTION_RESULTS]
    scores: Dict[str, float] = {}
    ordered: List[str] = []
    for item in top:
        name = item["label"] or item["raw"]
        if name not in ordered:
            ordered.append(name)
        scores[name] = max(item["score"], scores.get(name, 0))
    keywords = await extract_keywords(trimmed)
    confidence = int(round(top[0]["score"] * 100)) if top else 0
    return {
        "confidence": confidence,
        "keywords": keywords,
        "emotions": ordered,
        "primaryEmotions": ordered,
        "scores": {k: round(v, 4) for k, v in scores.items()},
    }


async def save_upload(file: UploadFile) -> Path:
    token = secrets.token_hex(16)
    target = UPLOAD_DIR / token
    async with asyncio.Lock():
        with target.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
    await file.close()
    return target


@app.on_event("startup")
async def on_startup() -> None:
    await ensure_index()
    asyncio.create_task(get_speech_pipeline())
    asyncio.create_task(get_emotion_pipeline())
    asyncio.create_task(get_keyword_model())
    log.info("Startup tasks scheduled")


@app.get("/api/es-status")
async def es_status() -> Dict[str, Any]:
    try:
        info = await asyncio.to_thread(es_client.info)
        name = info.get("cluster_name", "unknown")
        return {"success": True, "message": f"Connecte a {name}"}
    except Exception as exc:
        log.error("ES status failed: %s", exc)
        raise HTTPException(status_code=500, detail="Connexion echouee")


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    try:
        ping = await asyncio.to_thread(es_client.ping)
        return {"success": bool(ping), "elastic": bool(ping)}
    except Exception:
        return {"success": False, "elastic": False}


@app.post("/api/reindex")
async def reindex() -> Dict[str, Any]:
    await ensure_index()
    return {"success": True}


@app.get("/api/items")
async def list_items(size: int = Query(50, ge=1)) -> List[Dict[str, Any]]:
    size = min(size, 200)
    body = {
        "index": ES_INDEX,
        "size": size,
        "sort": [{"timestamp": {"order": "desc"}}],
        "query": {"match_all": {}},
    }
    resp = await asyncio.to_thread(es_client.search, **body)
    hits = resp.get("hits", {}).get("hits", [])
    return [{"id": h.get("_id"), **(h.get("_source") or {})} for h in hits]


@app.get("/api/items/{doc_id}")
async def get_item(doc_id: str) -> Dict[str, Any]:
    try:
        resp = await asyncio.to_thread(es_client.get, index=ES_INDEX, id=doc_id)
        return {"id": resp.get("_id"), **(resp.get("_source") or {})}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Not found")


@app.put("/api/items/{doc_id}")
async def update_item(doc_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        await asyncio.to_thread(
            es_client.update, index=ES_INDEX, id=doc_id, doc=payload, doc_as_upsert=False
        )
        return {"success": True}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Not found")


@app.delete("/api/items/{doc_id}")
async def delete_item(doc_id: str) -> Response:
    try:
        await asyncio.to_thread(es_client.delete, index=ES_INDEX, id=doc_id)
        return Response(status_code=204)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Not found")


@app.post("/api/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    stored = await save_upload(file)
    media_metadata = await asyncio.to_thread(extract_media_metadata, file.filename, stored)
    wav_path = None
    try:
        wav_path = await convert_to_wav(stored)
        transcription = await transcribe_audio(wav_path)
        analysis = await analyze_text(transcription)
    except Exception as exc:
        log.error("Analysis failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if wav_path and wav_path.exists():
            wav_path.unlink(missing_ok=True)
    return {
        "fileName": file.filename,
        "storedFileName": stored.name,
        "storedPath": f"uploads/{stored.name}",
        "transcription": transcription,
        **analysis,
        **media_metadata,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/save")
async def save_analysis(payload: Dict[str, Any]) -> Dict[str, Any]:
    resp = await asyncio.to_thread(es_client.index, index=ES_INDEX, document=payload)
    return {"success": True, "id": resp.get("_id")}


@app.get("/api/search")
async def search(
    response: Response,
    q: str | None = Query(default=None),
    size: int = Query(25, ge=1),
    offset: int = Query(0, ge=0, alias="from"),
) -> List[Dict[str, Any]]:
    size = min(size, 200)
    es_query = {"match_all": {}}
    if q:
        es_query = {
            "multi_match": {
                "query": q,
                "fields": ["transcription", "primaryEmotions", "title", "keywords"],
            }
        }
    resp = await asyncio.to_thread(
        es_client.search, index=ES_INDEX, size=size, from_=offset, query=es_query
    )
    total = resp.get("hits", {}).get("total", {}).get("value", 0)
    response.headers["X-Total-Count"] = str(total)
    hits = resp.get("hits", {}).get("hits", [])
    return [
        {"id": hit.get("_id"), "score": hit.get("_score"), **(hit.get("_source") or {})}
        for hit in hits
    ]


@app.get("/api/stats")
async def stats() -> Dict[str, Any]:
    try:
        resp = await asyncio.to_thread(
            es_client.search,
            index=ES_INDEX,
            size=0,
            aggs={
                "emotions_count": {"terms": {"field": "primaryEmotions", "size": 20}},
                "avg_confidence": {"avg": {"field": "confidence"}},
            },
        )
        total = resp.get("hits", {}).get("total", {}).get("value", 0)
        buckets = resp.get("aggregations", {}).get("emotions_count", {}).get("buckets", [])
        emotions: Dict[str, int] = {bucket["key"]: bucket["doc_count"] for bucket in buckets if bucket.get("key")}
        avg_conf = resp.get("aggregations", {}).get("avg_confidence", {}).get("value", 0)
        top_emotion = buckets[0]["key"] if buckets else ""
        return {
            "total": total,
            "emotions": emotions,
            "averageConfidence": round(avg_conf or 0, 2),
            "topEmotion": top_emotion,
        }
    except NotFoundError:
        return {"total": 0, "emotions": {}, "averageConfidence": 0, "topEmotion": ""}


def validate_filename(name: str) -> None:
    if not name or ".." in name or "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail="Invalid filename")


def slice_file(path: Path, start: int, end: int):
    with path.open("rb") as stream:
        stream.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = stream.read(min(1024 * 64, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def stream_file(path: Path):
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 64):
            yield chunk


@app.get("/api/audio/{filename}")
async def audio(filename: str, request: Request) -> StreamingResponse:
    validate_filename(filename)
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")
    media_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    if range_header and range_header.startswith("bytes="):
        start_str, _, end_str = range_header.replace("bytes=", "").partition("-")
        start = int(start_str or 0)
        end = int(end_str) if end_str else file_size - 1
        if start >= file_size or end >= file_size or start > end:
            headers = {"Content-Range": f"bytes */{file_size}"}
            return StreamingResponse(iter(()), status_code=416, headers=headers)
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
        }
        return StreamingResponse(
            slice_file(file_path, start, end),
            status_code=206,
            media_type=media_type,
            headers=headers,
        )
    headers = {"Content-Length": str(file_size), "Accept-Ranges": "bytes"}
    return StreamingResponse(stream_file(file_path), media_type=media_type, headers=headers)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="localhost", port=3000, reload=False)