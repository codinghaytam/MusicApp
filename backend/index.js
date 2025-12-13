// index.js (Version ES Module - Correction wav-decoder)

import express from 'express';
import cors from 'cors';
import { Client } from '@elastic/elasticsearch';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import logger from './logger.js';
import * as whisperService from './whisperService.js';
import { pipeline } from '@xenova/transformers';
import { fetchLibraryStats } from './stats/libraryStats.js';
// --- Sentiment pipeline (Transformers.js) ---
let emotionPipeline = null;
async function getEmotionPipeline() {
  if (emotionPipeline) return emotionPipeline;
  // Load multi-label text classification model
  emotionPipeline = await pipeline('text-classification', 'songhieng/khmer-xlmr-base-sentimental-multi-label', {
    // Enable multi-label for independent scores across classes
    // Transformers.js uses "topk" and returns array of {label, score}
    // multi_label is inferred for compatible models
  });
  return emotionPipeline;
}

function extractKeywordsWithKeyBERT(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];
  try {
    const result = spawnSync('python', [KEYBERT_SCRIPT], {
      input: trimmed,
      encoding: 'utf-8',
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || 'KeyBERT process failed');
    }
    const payload = (result.stdout || '').trim() || '[]';
    return JSON.parse(payload);
  } catch (error) {
    logger.warn('KeyBERT keyword extraction failed; fallback to heuristics.', { error: error.message });
    return trimmed.split(/\s+/).slice(0, 5);
  }
}

// --- Recréer __dirname en ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ------------------------------------

// --- Configuration du Téléchargement ---
// Note: Hugging Face env config removed because we now use the official whisper-node service.
// ------------------------------------------

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- Configuration d'Elasticsearch ---
const esClient = new Client({
  node: 'http://localhost:9200',
  auth: {
    apiKey: 'ekozdERwc0JCWHN0ZEo0X0VtVTU6OUNLU3BYNVRHN3d5VkxUdEVHWWR6dw=='
  }
});

const ES_INDEX = 'audio_analysis';
const upload = multer({ dest: 'uploads/' });
const KEYBERT_SCRIPT = path.join(__dirname, 'keyword_service.py');
const MAX_EMOTION_RESULTS = 3;
const EMOTION_LABEL_MAP = {
  anger: 'Anger',
  angry: 'Anger',
  disgust: 'Disgust',
  fear: 'Fear',
  fearful: 'Fear',
  joy: 'Joy',
  joyful: 'Joy',
  sadness: 'Sadness',
  sad: 'Sadness',
  surprise: 'Surprise',
  surprised: 'Surprise',
};

function normalizeEmotionLabel(label) {
  if (!label) return '';
  const cleaned = label.replace(/_/g, ' ').trim().toLowerCase();
  return EMOTION_LABEL_MAP[cleaned] || label.trim();
}

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// --- Endpoints API ---

app.get('/api/es-status', async (req, res) => {
  try {
    const info = await esClient.info();
    res.json({ success: true, message: `Connecté à ${info.cluster_name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Connexion échouée' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const ping = await esClient.ping();
    res.json({ success: true, elastic: !!ping });
  } catch (e) {
    res.json({ success: false, elastic: false });
  }
});

// --- ES index bootstrap (mapping) ---
async function ensureIndex() {
  try {
    const exists = await esClient.indices.exists({ index: ES_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ES_INDEX,
        settings: {
          number_of_shards: 1,
          analysis: {
            analyzer: {
              default: { type: 'standard' }
            }
          }
        },
        mappings: {
          properties: {
            fileName: { type: 'text' },
            transcription: { type: 'text' },
            transcriptionVector: { type: 'dense_vector', dims: 384, index: true, similarity: 'cosine' },
            confidence: { type: 'integer' },
            keywords: { type: 'text' },
            timestamp: { type: 'date' },
            trackId: { type: 'keyword' },
            title: { type: 'text' },
            artist: { type: 'text' },
            album: { type: 'text' },
            genre: { type: 'keyword' },
            duration: { type: 'float' },
            bitRate: { type: 'integer' },
            emotions: { type: 'keyword' },
            primaryEmotions: { type: 'keyword' },
            scores: { type: 'object' }
          }
        }
      });
      logger.info(`Index ${ES_INDEX} créé avec mapping.`);
    }
  } catch (error) {
    logger.error('ensureIndex error', { error });
  }
}

// Reindex endpoint (idempotent)
app.post('/api/reindex', async (req, res) => {
  try {
    await ensureIndex();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Reindex échouée' });
  }
});

// List recent documents
app.get('/api/items', async (req, res) => {
  const size = Math.min(parseInt(req.query.size || '50'), 200);
  try {
    const resp = await esClient.search({
      index: ES_INDEX,
      size,
      sort: [{ timestamp: { order: 'desc' } }],
      query: { match_all: {} }
    });
    const items = resp.hits.hits.map(h => ({ id: h._id, ...h._source }));
    res.json(items);
  } catch (error) {
    logger.error('Erreur items list ES:', { error });
    res.status(500).json({ success: false, message: 'Liste échouée' });
  }
});

// Get single document by id
app.get('/api/items/:id', async (req, res) => {
  try {
    const resp = await esClient.get({ index: ES_INDEX, id: req.params.id });
    res.json({ id: resp._id, ...resp._source });
  } catch (error) {
    if (error.meta && error.meta.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    logger.error('Erreur get ES:', { error });
    res.status(500).json({ success: false, message: 'Récupération échouée' });
  }
});

// Update partial fields
app.put('/api/items/:id', async (req, res) => {
  try {
    const doc = req.body || {};
    await esClient.update({
      index: ES_INDEX,
      id: req.params.id,
      doc_as_upsert: false,
      document: doc
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Erreur update ES:', { error });
    res.status(500).json({ success: false, message: 'Mise à jour échouée' });
  }
});

// Delete by id
app.delete('/api/items/:id', async (req, res) => {
  try {
    await esClient.delete({ index: ES_INDEX, id: req.params.id });
    res.status(204).end();
  } catch (error) {
    if (error.meta && error.meta.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    logger.error('Erreur suppression ES:', { error });
    res.status(500).json({ success: false, message: 'Suppression échouée' });
  }
});

// --- Configuration des modèles d'IA ---

/**
 * TÂCHE 1: Transcription (Dynamique avec Whisper)
 * (Simplified: delegate to whisperService which uses whisper-node)
 */
async function transcribeAudio(audioFilePath) {
  logger.info(`Transcription dynamique de ${audioFilePath} avec Whisper...`);
  const tempWavPath = `${audioFilePath}.wav`; // Fichier WAV temporaire

  try {
    // Étape 1: Convertir l'audio uploadé en WAV 16kHz Mono
    await new Promise((resolve, reject) => {
      ffmpeg(audioFilePath)
        .toFormat('wav')
        .audioChannels(1)    // Mono
        .audioFrequency(16000) // 16kHz
        .on('error', (err) => reject(new Error(`Erreur FFMPEG: ${err.message}`)))
        .on('end', () => resolve())
        .save(tempWavPath);
    });
    logger.info(`Audio converti en WAV: ${tempWavPath}`);

    // Delegate transcription to the whisper service (which uses whisper-node)
    const transcription = await whisperService.transcribeWav(tempWavPath, { language: 'french' });

    logger.info("Transcription réussie:", { transcription });
    return transcription;

  } catch (error) {
      logger.error("Erreur de transcription Whisper:", { error });
      return "Erreur lors de la transcription audio.";
  } finally {
      // Étape 6: Nettoyer le fichier WAV temporaire
      if (fs.existsSync(tempWavPath)) {
          fs.unlinkSync(tempWavPath);
      }
  }
}


async function analyzeEmotion(text) {
  logger.info('Analyse des émotions via Transformers.js (multi-label)...');

  // Rule: if transcription empty, mark as instrumental
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      confidence: 100,
      keywords: [],
      emotions: [],
      primaryEmotions: [],
      scores: {}
    };
  }

  // Use local Transformers.js pipeline
  const classifier = await getEmotionPipeline();
  const outputs = await classifier(trimmed, { topk: 8 });

  // Flatten and normalize predictions
  const flatOutputs = Array.isArray(outputs) ? outputs.flat() : [outputs];
  const normalized = flatOutputs
    .filter(item => item && item.label)
    .map(item => ({
      rawLabel: item.label,
      label: normalizeEmotionLabel(item.label),
      score: typeof item.score === 'number' ? item.score : 0,
    }))
    .sort((a, b) => b.score - a.score);

  const topPreds = normalized.slice(0, MAX_EMOTION_RESULTS);
  const scores = {};
  const emotions = [];

  topPreds.forEach(pred => {
    const label = pred.label || pred.rawLabel;
    if (!label) return;
    if (!emotions.includes(label)) {
      emotions.push(label);
    }
    scores[label] = Math.max(pred.score, scores[label] || 0);
  });

  if (!emotions.length) {
    const snapshot = normalized.slice(0, 3).map(p => ({ label: p.rawLabel, score: p.score }));
    logger.warn('No top emotions detected; showing raw predictions snapshot', { snapshot });
  }

  const confidence = topPreds.length ? Math.round((topPreds[0].score || 0) * 100) : 0;
  const keywords = extractKeywordsWithKeyBERT(trimmed);

  return {
    confidence,
    keywords,
    emotions,
    primaryEmotions: emotions,
    scores,
  };
}

/**
 * TÂCHE 3: L'Endpoint d'Upload et d'Analyse
 */
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier n'a été envoyé." });
  }

  const inputFile = req.file;
  const inputPath = inputFile.path;

  try {
    logger.info(`Fichier reçu: ${inputPath}`);
    const transcription = await transcribeAudio(inputPath);
    const analysis = await analyzeEmotion(transcription);

    const resultData = {
      fileName: inputFile.originalname,
      storedFileName: inputFile.filename,
      storedPath: path.join('uploads', inputFile.filename),
      transcription: transcription,
      ...analysis,
      timestamp: new Date().toISOString()
    };
    res.json(resultData);

  } catch (error) {
    logger.error("Erreur lors de l'analyse:", { error });
    res.status(500).json({ message: error.message || "Erreur interne du serveur." });
  } finally {
    // Keep uploaded original file in uploads/ so it can be served/played later.
    // The temporary WAV file is cleaned in transcribeAudio's finally block.
  }
});

/**
 * Endpoint pour SAUVEGARDER
 */
app.post('/api/save', async (req, res) => {
  const analysisData = req.body;
  try {
    const response = await esClient.index({
      index: ES_INDEX,
      document: analysisData
    });
    res.status(201).json({ success: true, id: response._id });
  } catch (error) {
    logger.error('Erreur de sauvegarde ES:', { error });
    res.status(500).json({ success: false, message: 'Sauvegarde échouée' });
  }
});

/**
 * Endpoint pour RECHERCHER
 */
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  const size = Math.min(parseInt(req.query.size || '25', 10) || 25, 200);
  const from = Math.max(parseInt(req.query.from || '0', 10) || 0, 0);

  const searchQuery = query
    ? {
        multi_match: {
          query,
          fields: ['transcription', 'primaryEmotions', 'fileName', 'keywords']
        }
      }
    : { match_all: {} };

  try {
    const response = await esClient.search({
      index: ES_INDEX,
      size,
      from,
      query: searchQuery,
    });
    const total = response.hits?.total?.value ?? 0;
    const results = response.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    }));
    res.set('X-Total-Count', String(total));
    res.json(results);
  } catch (error) {
    logger.error('Erreur de recherche ES:', { error });
    res.status(500).json({ success: false, message: 'Recherche échouée' });
  }
});

/**
 * Endpoint pour les STATISTIQUES (Corrigé pour l'erreur 404)
 */
app.get('/api/stats', async (req, res) => {
  try {
    // Prefer the library helper, but add a robust fallback to avoid _id fielddata issues
    try {
      const stats = await fetchLibraryStats(esClient, ES_INDEX);
      return res.json(stats);
    } catch (e) {
      // Fallback path: compute totals via count API and terms via keyword subfield
      const countResp = await esClient.count({ index: ES_INDEX });
      const total = (countResp.count ?? 0);
      const aggResp = await esClient.search({
        index: ES_INDEX,
        size: 0,
        aggs: {
          emotions_count: { terms: { field: 'primaryEmotions', size: 20 } },
          avg_confidence: { avg: { field: 'confidence' } }
        }
      });
      const emotionBuckets = aggResp.aggregations?.emotions_count?.buckets || [];
      const emotions = {};
      for (const b of emotionBuckets) {
        if (b && (b.key || b.key === 0)) emotions[b.key] = b.doc_count;
      }
      const avgConfidence = aggResp.aggregations?.avg_confidence?.value || 0;
      const topEmotion = emotionBuckets.length ? emotionBuckets[0].key : '';
      return res.json({ total, emotions, averageConfidence: Number(avgConfidence.toFixed(2)), topEmotion });
    }
  } catch (error) {
    if (error.meta && error.meta.body && error.meta.body.status === 404) {
      logger.warn("Avertissement : L'index 'audio_analysis' n'existe pas encore. Renvoi de stats vides.");
      return res.json({ total: 0, emotions: {}, averageConfidence: 0, topEmotion: '' });
    }
    logger.error('Erreur de statistiques ES:', { error });
    res.status(500).json({ success: false, message: 'Erreur de statistiques' });
  }
});

// Serve uploaded files statically (no directory listing)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Streaming endpoint with Range support for HTML5 audio seeking
app.get('/api/audio/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Basic safety: prevent path traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).send('Invalid filename');
    }

    const filePath = path.join(__dirname, 'uploads', filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;

    // Simple mime-type mapping for common audio types
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg' };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      if (isNaN(start) || isNaN(end) || start > end || end >= total) {
        return res.status(416).set('Content-Range', `bytes */${total}`).end();
      }
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type': contentType,
      });
      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.status(200);
      res.set({
        'Content-Length': total,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (err) {
    logger.error('Audio stream error', { err: err.message });
    res.status(500).end();
  }
});

// --- Démarrage du serveur ---
// Initialise LES DEUX classifieurs au démarrage
Promise.all([
    // Removed getClassifier() init because it used @huggingface/transformers
    (async () => {
      try {
        await whisperService.init();
        return true;
      } catch (e) {
        logger.warn('Whisper service init failed. Transcription endpoints may not work.', { error: e.message });
        return false;
      }
    })(),
    (async () => {
      try {
        await getEmotionPipeline();
        logger.info('Transformers.js sentiment model initialisé.');
        return true;
      } catch (e) {
        logger.warn('Initialisation du modèle de sentiment a échoué.', { error: e.message });
        return false;
      }
    })(),
    ensureIndex(),
]).then(() => {
    app.listen(port, () => {
        logger.info(`Serveur backend démarré sur http://localhost:${port}`);
        logger.info("Modèles prêts: Whisper (Xenova/whisper-tiny) et Sentiment (Transformers.js). ES routes opérationnelles.");
    });
}).catch(err => {
    logger.error("Échec du démarrage du serveur.", { err });
});
