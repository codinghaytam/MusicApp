import React from 'react';

function Sidebar({ activePage, onChangePage }) {
  const handleNav = (page) => () => onChangePage(page);

  return (
    <aside className="sidebar">
      <div className="logo">🎵 Music</div>
      <nav>
        <button
          className={`nav-item ${activePage === 'library' ? 'active' : ''}`}
          data-page="library"
          onClick={handleNav('library')}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Accueil</span>
        </button>
        <button
          className={`nav-item ${activePage === 'search' ? 'active' : ''}`}
          data-page="search"
          onClick={handleNav('search')}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Rechercher</span>
        </button>
        
        <div className="nav-divider" />
        <button
          className={`nav-item ${activePage === 'playlists' ? 'active' : ''}`}
          data-page="playlists"
          onClick={handleNav('playlists')}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>Playlists</span>
        </button>
        <button
          className={`nav-item ${activePage === 'stats' ? 'active' : ''}`}
          data-page="stats"
          onClick={handleNav('stats')}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
          <span>Statistiques</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
