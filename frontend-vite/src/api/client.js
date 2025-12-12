const CONFIG = {
  BASE_URL: 'http://localhost:3000',
  ENDPOINTS: {
    search: '/api/search',
    save: '/api/save',
    stats: '/api/stats',
    items: '/api/items',
    // Use backend items as songs list
    songs: '/api/items',
    // No logs backend; leave empty to disable
    logs: '',
  },
};

// Replace fetch-based client with Axios
import axios from 'axios';

const api = axios.create({
  baseURL: CONFIG.BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Optional: allow JSON big payloads
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

async function apiRequest(path, { method = 'GET', headers = {}, body } = {}) {
  const opts = {
    method,
    url: path,
    headers,
    data: body,
  };
  const res = await api.request(opts);
  if (res.status < 200 || res.status >= 300) {
    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text || ''}`);
  }
  return res.data;
}

export { CONFIG, apiRequest, api };
