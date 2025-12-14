import React from 'react';

function Header({ activePage, onAddSongClick }) {

  const titleMap = {
    library: 'Bibliothèque',
    search: 'Rechercher',
    favorites: 'Favoris',
    stats: 'Statistiques',
    playlists: 'Playlists',
  };

  const showAddButton = activePage === 'library';

  return (
    <header className="page-header">
      <h1 className="page-title">{titleMap[activePage] || ''}</h1>
      {activePage === 'library' && (
        <div className="header-actions">
          {showAddButton && (
            <button type="button" className="btn-primary" onClick={onAddSongClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Ajouter
            </button>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;
