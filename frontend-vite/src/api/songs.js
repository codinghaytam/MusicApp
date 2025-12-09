import { CONFIG, apiRequest } from './client';

export function listSongs() {
  if (!CONFIG.ENDPOINTS.songs) {
    throw new Error('Songs endpoint is not configured.');
  }

  return apiRequest(CONFIG.ENDPOINTS.songs);
}

export async function searchSongs(query) {
  const q = (query || '').trim();
  if (!q) return [];
  const path = `${CONFIG.ENDPOINTS.search}?q=${encodeURIComponent(q)}`;
  return apiRequest(path);
}

