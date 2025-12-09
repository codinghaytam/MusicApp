import React, { createContext, useContext, useState } from 'react';

const LogsContext = createContext(null);

export function LogsProvider({ children }) {
  const [logs, setLogs] = useState([]);

  const addLog = (type, action, details) => {
    const log = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      type,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [log, ...prev].slice(0, 100));
  };

  const clearLogs = () => setLogs([]);

  const value = {
    logs,
    setLogs,
    addLog,
    clearLogs,
  };

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
}

export function useLogs() {
  const ctx = useContext(LogsContext);
  if (!ctx) throw new Error('useLogs must be used within LogsProvider');
  return ctx;
}
