import React, { useState } from 'react';
import { useLogs } from '../state/LogsProvider';

function LogsPage() {
  const { logs, clearLogs } = useLogs();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClearClick = () => {
    if (!logs.length) return;
    setShowConfirm(true);
  };

  const confirmClear = () => {
    clearLogs();
    setShowConfirm(false);
  };

  const cancelClear = () => setShowConfirm(false);

  const typeIcons = {
    add: '➕',
    delete: '🗑️',
    play: '▶️',
    search: '🔍',
    filter: '🎯',
  };

  const formatTime = (timestamp) => {
    const ts = new Date(timestamp);
    const now = new Date();
    const diffMs = now - ts;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  const renderEmpty = () => (
    <div id="emptyLogs" className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <h3>Aucune activité</h3>
      <p>L'historique de vos actions apparaîtra ici</p>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Historique d'activité</h1>
        <div className="header-actions">
          <button
            id="clearLogsBtn"
            type="button"
            className="btn-secondary"
            style={{ padding: '12px 24px', borderRadius: '24px' }}
            onClick={handleClearClick}
          >
            Effacer l'historique
          </button>
        </div>
      </div>
      <div className="content-section">
        {logs.length === 0 ? (
          renderEmpty()
        ) : (
          <div id="logsList" className="logs-container">
            {logs.map((log) => (
              <div key={log.id} className="log-item">
                <div className={`log-icon ${log.type}`}>
                  {typeIcons[log.type] || '📝'}
                </div>
                <div className="log-content">
                  <div className="log-header">
                    <div className="log-action">{log.action}</div>
                    <div className="log-time">{formatTime(log.timestamp)}</div>
                  </div>
                  <div
                    className="log-details"
                    dangerouslySetInnerHTML={{ __html: log.details }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#282828',
            padding: '24px',
            borderRadius: '12px',
            zIndex: 10000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxWidth: '400px',
          }}
        >
          <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>
            Effacer l'historique ?
          </h3>
          <p
            style={{
              color: '#b3b3b3',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            Cette action est irréversible.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={confirmClear}
              style={{
                flex: 1,
                padding: '10px',
                background: '#e22134',
                color: 'white',
                border: 'none',
                borderRadius: '24px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={cancelClear}
              style={{
                flex: 1,
                padding: '10px',
                background: 'transparent',
                border: '1px solid #535353',
                color: 'white',
                borderRadius: '24px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default LogsPage;
