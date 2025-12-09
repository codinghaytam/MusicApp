import React from 'react';
import { Button } from '@/components/ui/button'
import { useSongs } from '@/state/SongsProvider';
import { useLogs } from '@/state/LogsProvider';

function Header({ activePage, onAddSongClick }) {
  const { librarySearch, setLibrarySearch } = useSongs();
  const { addLog } = useLogs();

  const titleMap = {
    library: 'Bibliothèque',
    search: 'Rechercher',
    favorites: 'Favoris',
    stats: 'Statistiques',
    logs: "Historique d'activité",
    playlists: 'Playlists',
  };

  const showAddButton = activePage === 'library';

  let searchTimeout;

  const handleLibrarySearchChange = (e) => {
    const value = e.target.value;
    setLibrarySearch(value);

    window.clearTimeout(searchTimeout);
    if (value.trim().length > 2) {
      searchTimeout = window.setTimeout(() => {
        addLog(
          'search',
          'Recherche effectuée',
          `Recherche de "<span class="log-song-title">${value.trim()}</span>"`
        );
      }, 1000);
    }
  };

  return (
    <header className="page-header">
      <h1 className="page-title">{titleMap[activePage] || ''}</h1>
      {activePage === 'library' && (
        <div className="header-actions">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="searchInput"
              placeholder="Rechercher..."
              value={librarySearch}
              onChange={handleLibrarySearchChange}
            />
          </div>
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
