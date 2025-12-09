import React, { useMemo } from 'react';
import { useSongs } from '../state/SongsProvider';
import { useLogs } from '../state/LogsProvider';
import SongCard from '../components/SongCard';

function LibraryPage({ onRequestAddSong }) {
  const { songs, librarySearch, deleteSong } = useSongs();
  const { addLog } = useLogs();
  const [filter, setFilter] = React.useState('all');
  const [view, setView] = React.useState('grid');

  const filteredSongs = useMemo(() => {
    let list = songs;

    if (filter !== 'all') {
      list = list.filter((song) => song.sentiment === filter);
    }

    const search = librarySearch.trim().toLowerCase();
    if (search) {
      list = list.filter(
        (song) =>
          song.title.toLowerCase().includes(search) ||
          song.artist.toLowerCase().includes(search)
      );
    }

    return list;
  }, [songs, filter, librarySearch]);

  const handleFilterClick = (id) => {
    if (id !== filter && id !== 'all') {
      addLog(
        'filter',
        'Filtre appliqué',
        `Affichage des chansons avec le sentiment "<span class="log-song-title">${id}</span>"`
      );
    }
    setFilter(id);
  };

  const handleDelete = (id) => {
    const song = songs.find((s) => s.id === id);
    if (!song) return;

    deleteSong(id);
    addLog(
      'delete',
      'Chanson supprimée',
      `"<span class="log-song-title">${song.title}</span>" par ${song.artist} a été supprimée de la bibliothèque`
    );
  };

  const renderEmptyState = () => (
    <div className="content-section">
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <h3>Aucune chanson</h3>
        <p>Commencez à construire votre bibliothèque</p>
        <button
          type="button"
          className="btn-primary"
          onClick={onRequestAddSong}
        >
          Ajouter une chanson
        </button>
      </div>
    </div>
  );

  if (!filteredSongs.length) {
    return renderEmptyState();
  }

  const chips = [
    { id: 'all', label: 'Tous' },
    { id: 'joyeux', label: 'Joyeux' },
    { id: 'triste', label: 'Triste' },
    { id: 'énergique', label: 'Énergique' },
    { id: 'calme', label: 'Calme' },
    { id: 'romantique', label: 'Romantique' },
  ];

  return (
    <div className="content-section">
      <div className="section-header">
        <div>
          <div className="filter-chips">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`chip ${filter === chip.id ? 'active' : ''}`}
                onClick={() => handleFilterClick(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
        <div className="view-toggle">
          <button
            type="button"
            className={`view-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
          >
            Grille
          </button>
          <button
            type="button"
            className={`view-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            Liste
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="songs-grid">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <div className="songs-list">
          <div className="list-header">
            <div>#</div>
            <div>Titre</div>
            <div>Album</div>
            <div>Ajouté le</div>
            <div>Durée</div>
            <div />
          </div>
          <div>
            {filteredSongs.map((song, index) => (
              <div key={song.id} className="song-row">
                <div className="play-cell">
                  <div className="song-number">{index + 1}</div>
                </div>
                <div className="song-title-cell">
                  <div className="mini-cover" style={{ background: song.coverColor }}>
                    🎵
                  </div>
                  <div className="title-info">
                    <h4>{song.title}</h4>
                    <p>{song.artist}</p>
                  </div>
                </div>
                <div className="album-cell">{song.album}</div>
                <div className="duration-cell">
                  {song.addedAt ? new Date(song.addedAt).toLocaleDateString() : ''}
                </div>
                <div className="plays-cell">{song.duration}</div>
                <div className="actions-cell">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleDelete(song.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LibraryPage;
