import { CONFIG, apiRequest } from './client';

export function listLogs() {
  if (!CONFIG.ENDPOINTS.logs) {
    throw new Error('Logs endpoint is not configured.');
  }

  return apiRequest(CONFIG.ENDPOINTS.logs);
}

