"""Standalone KeyBERT keyword extractor used by the Node backend.
Reads transcription text from STDIN and writes a JSON array of keyphrases to STDOUT."""
import json
import sys

try:
    from keybert import KeyBERT
except ImportError as exc:  # pragma: no cover
    raise SystemExit("KeyBERT is required. Install with: pip install keybert") from exc

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
_kw_model = None

def get_model():
    global _kw_model
    if _kw_model is None:
        _kw_model = KeyBERT(model=MODEL_NAME)
    return _kw_model

def main():
    text = sys.stdin.read().strip()
    if not text:
        print("[]")
        return
    model = get_model()
    keywords = model.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 3),
        stop_words="english",
        top_n=8,
        use_mmr=True,
        diversity=0.7,
    )
    phrases = [phrase for phrase, _ in keywords]
    print(json.dumps(phrases, ensure_ascii=False))

if __name__ == "__main__":
    main()
