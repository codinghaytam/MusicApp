import fs from 'fs';
import logger from './logger.js';
import { pipeline } from '@xenova/transformers';

let asrPipeline = null;

/**
 * Initialize the Hugging Face transformers pipeline for Whisper Tiny
 */
export async function init() {
  if (asrPipeline) return asrPipeline;

  try {
    logger.info('whisperService: loading ASR pipeline with Xenova/whisper-tiny');
    asrPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    logger.info('whisperService: ASR pipeline loaded successfully');
    return asrPipeline;
  } catch (err) {
    logger.error('whisperService.init: failed to load Xenova/whisper-tiny model', { err });
    throw err;
  }
}

/**
 * Transcribe a WAV file using the transformers pipeline
 * Returns the transcribed text (string).
 */
export async function transcribeWav(filePath, options = {}) {
  if (!asrPipeline) await init();

  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  const { language = 'fr', ...rest } = options;

  try {
    const result = await asrPipeline(filePath, {
      // Many Xenova whisper models auto-detect language; we still pass a hint
      language,
      ...rest,
    });

    if (typeof result === 'string') return result;
    if (result && (result.text || result.transcript)) return result.text || result.transcript;

    if (result && Array.isArray(result.segments)) {
      return result.segments.map((s) => s.text).join(' ');
    }

    throw new Error('Unexpected transcription result format from transformers ASR pipeline');
  } catch (err) {
    logger.error('whisperService.transcribeWav: transcription failed', { err });
    throw err;
  }
}
