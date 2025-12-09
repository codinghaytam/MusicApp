// ⚠️ INSTRUCTION FOR USER:
// Provide configuration persistence strategy (localStorage vs backend).
// For now this file only exports a simple in-memory config placeholder.

const state = {
  theme: 'dark',
};

export function getConfig() {
  return state;
}

export function setConfig(partial) {
  Object.assign(state, partial);
}

