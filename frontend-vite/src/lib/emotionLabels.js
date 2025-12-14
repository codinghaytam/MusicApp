const RAW_TO_FRIENDLY = {
  anger: 'Anger',
  angry: 'Anger',
  'label_0': 'Anger',
  'label 0': 'Anger',
  disgust: 'Disgust',
  'label_1': 'Disgust',
  'label 1': 'Disgust',
  fear: 'Fear',
  fearful: 'Fear',
  'label_2': 'Fear',
  'label 2': 'Fear',
  joy: 'Joy',
  joyful: 'Joy',
  'label_3': 'Joy',
  'label 3': 'Joy',
  sadness: 'Sadness',
  sad: 'Sadness',
  'label_4': 'Sadness',
  'label 4': 'Sadness',
  surprise: 'Surprise',
  surprised: 'Surprise',
  'label_5': 'Surprise',
  'label 5': 'Surprise',
  neutral: 'Neutral',
  calm: 'Calm',
  chill: 'Calm',
  relaxed: 'Calm',
  instrumental: 'Instrumental',
  ambiance: 'Instrumental',
  background: 'Instrumental',
  none: 'Instrumental',
  n_a: 'Instrumental',
};

const DEFAULT_EMOTION_LABEL = 'Instrumental';

const capitalize = (text) => {
  if (!text) return '';
  if (text.length === 1) return text.toUpperCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function normalizeEmotionLabel(label) {
  if (label == null) return '';
  const trimmed = String(label).trim();
  if (!trimmed) return '';
  const sanitized = trimmed.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const lookupKey = sanitized.toLowerCase();
  if (RAW_TO_FRIENDLY[lookupKey]) {
    return RAW_TO_FRIENDLY[lookupKey];
  }
  if (/^label\s*\d+$/.test(lookupKey)) {
    const withoutLabel = lookupKey.split(/\s+/).pop();
    if (withoutLabel && RAW_TO_FRIENDLY[`label_${withoutLabel}`]) {
      return RAW_TO_FRIENDLY[`label_${withoutLabel}`];
    }
  }
  return sanitized
    .split(' ')
    .map((part) => capitalize(part.toLowerCase()))
    .join(' ');
}

export function normalizeEmotionArray(values = []) {
  const normalized = [];
  (values || []).forEach((value) => {
    const friendly = normalizeEmotionLabel(value);
    if (friendly && !normalized.includes(friendly)) {
      normalized.push(friendly);
    }
  });
  return normalized;
}

export function normalizeEmotionScores(scores = {}) {
  const normalized = {};
  Object.entries(scores || {}).forEach(([rawLabel, value]) => {
    const friendly = normalizeEmotionLabel(rawLabel);
    if (!friendly) return;
    const numeric = typeof value === 'number' ? value : parseFloat(value) || 0;
    normalized[friendly] = Math.max(numeric, normalized[friendly] || 0);
  });
  return normalized;
}

export function normalizeEmotionHistogram(histogram = {}) {
  const bucket = {};
  Object.entries(histogram || {}).forEach(([rawLabel, count]) => {
    const friendly = normalizeEmotionLabel(rawLabel);
    if (!friendly) return;
    const numeric = typeof count === 'number' ? count : parseInt(count, 10) || 0;
    bucket[friendly] = (bucket[friendly] || 0) + numeric;
  });
  return bucket;
}

export function normalizeSongDocument(song) {
  if (!song || typeof song !== 'object') return song;
  const basePrimary = song.primaryEmotions || song.primary_emotions || [];
  const baseEmotions = song.emotions || basePrimary;
  const normalizedPrimary = normalizeEmotionArray(basePrimary);
  const normalizedEmotions = normalizeEmotionArray(baseEmotions);
  const resolvedPrimary = normalizedPrimary.length ? normalizedPrimary : normalizedEmotions;
  const resolvedEmotions = normalizedEmotions.length ? normalizedEmotions : normalizedPrimary;
  const normalizedScores = normalizeEmotionScores(song.scores);
  return {
    ...song,
    primaryEmotions: resolvedPrimary,
    emotions: resolvedEmotions,
    scores: normalizedScores,
    primaryEmotion: resolvedPrimary[0] || '',
  };
}

export function normalizeStatsPayload(stats = {}) {
  const normalizedEmotions = normalizeEmotionHistogram(stats.emotions || {});
  const sorted = Object.entries(normalizedEmotions).sort((a, b) => b[1] - a[1]);
  const normalizedTop = normalizeEmotionLabel(stats.topEmotion) || (sorted[0]?.[0] || '');
  return {
    ...stats,
    emotions: normalizedEmotions,
    topEmotion: normalizedTop,
  };
}

export function formatEmotionForDisplay(label, fallback = DEFAULT_EMOTION_LABEL) {
  const friendly = normalizeEmotionLabel(label);
  return friendly || fallback;
}

export function getEmotionFallback() {
  return DEFAULT_EMOTION_LABEL;
}
