// index.js (Version ES Module - Correction wav-decoder)

import express from 'express';
import cors from 'cors';
import { Client } from '@elastic/elasticsearch';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import * as whisperService from './whisperService.js';

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
    apiKey: 'QnFmUTBab0JFNXQ3QUhYSnE2UjA6d3FvYkxXTGhUQW1NYVRHMllKZnZuZw=='
  }
});

const ES_INDEX = 'audio_analysis';
const upload = multer({ dest: 'uploads/' });

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
            emotion: { type: 'keyword' },
            confidence: { type: 'integer' },
            icon: { type: 'keyword' },
            keywords: { type: 'text' },
            timestamp: { type: 'date' }
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
  logger.info('Analyse NLP des émotions (simplifiée)...');

  // Simple heuristic sentiment analysis as a placeholder, no heavy model
  const lower = text.toLowerCase();
  let emotion = 'neutre';
  let icon = '😐';
  let confidence = 60;

  if (/(heureux|joyeux|content|super|génial)/.test(lower)) {
    emotion = 'joyeux';
    icon = '😊';
    confidence = 80;
  } else if (/(triste|déprimé|malheureux|chagrin)/.test(lower)) {
    emotion = 'triste';
    icon = '😢';
    confidence = 80;
  } else if (/(énervé|furieux|colère|fâché)/.test(lower)) {
    emotion = 'colère';
    icon = '😠';
    confidence = 75;
  } else if (/(peur|angoissé|stressé|inquiet)/.test(lower)) {
    emotion = 'peur';
    icon = '😨';
    confidence = 75;
  }

  const keywords = text.split(/\s+/).slice(0, 5);

  return { emotion, confidence, icon, keywords };
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
      transcription: transcription,
      ...analysis,
      timestamp: new Date().toISOString()
    };
    res.json(resultData);

  } catch (error) {
    logger.error("Erreur lors de l'analyse:", { error });
    res.status(500).json({ message: error.message || "Erreur interne du serveur." });
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
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
  const query = req.query.q || '';
  try {
    const response = await esClient.search({
      index: ES_INDEX,
      query: {
        multi_match: {
          query: query,
        fields: ['transcription', 'emotion', 'fileName', 'keywords']        }
      }
    });
    const results = response.hits.hits.map(hit => hit._source);
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
    const response = await esClient.search({
      index: ES_INDEX,
      size: 0,
      aggs: {
        emotions_count: { terms: { field: 'emotion.keyword' } },
        total_docs: { value_count: { field: '_id' } }
      }
    });

    const stats = {
      total: response.aggregations.total_docs.value,
      emotions: {}
    };
    response.aggregations.emotions_count.buckets.forEach(bucket => {
      stats.emotions[bucket.key] = bucket.doc_count;
    });
    res.json(stats);
  } catch (error) {
    // Gère l'erreur si l'index n'existe pas encore
    if (error.meta && error.meta.body.status === 404) {
      logger.warn("Avertissement : L'index 'audio_analysis' n'existe pas encore. Renvoi de stats vides.");
      res.json({
        total: 0,
        emotions: {}
      });
    } else {
      logger.error('Erreur de statistiques ES:', { error });
      res.status(500).json({ success: false, message: 'Erreur de statistiques' });
    }
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
    ensureIndex(),
]).then(() => {
    app.listen(port, () => {
        logger.info(`Serveur backend démarré sur http://localhost:${port}`);
        logger.info("Modèle Whisper (Xenova/whisper-tiny) prêt ou en mode dégradé. ES routes opérationnelles.");
    });
}).catch(err => {
    logger.error("Échec du démarrage du serveur.", { err });
});
