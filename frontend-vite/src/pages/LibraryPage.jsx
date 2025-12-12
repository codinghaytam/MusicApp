import React, { useMemo } from 'react';
import { useSongs } from '../state/SongsProvider';
import SongCard from '../components/SongCard';
import { Smile, Frown, Angry, AlertTriangle, Meh, Music, Zap, Ban } from 'lucide-react';

function LibraryPage({ onRequestAddSong }) {
  const { songs, librarySearch, deleteSong } = useSongs();
  const [filter, setFilter] = React.useState('all');
  const [view, setView] = React.useState('grid');

  // Normalize emotion strings to improve matching (remove accents, lowercase)
  const normalize = (val) => {
    return (val || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const filteredSongs = useMemo(() => {
    let list = songs;

    if (filter !== 'all') {
      if (filter === 'instrumental') {
        list = list.filter((song) => !song.primaryEmotions || song.primaryEmotions.length === 0);
      } else {
        list = list.filter((song) => (song.primaryEmotions || []).includes(filter));
      }
    }

    const search = librarySearch.trim().toLowerCase();
    if (search) {
      list = list.filter((song) => {
        const names = (song.primaryEmotions || []).join(' ').toLowerCase();
        return (
          (song.fileName || '').toLowerCase().includes(search) ||
          (song.transcription || '').toLowerCase().includes(search) ||
          names.includes(search)
        );
      });
    }

    return list;
  }, [songs, filter, librarySearch]);

  const handleFilterClick = (id) => {
    setFilter(id);
  };

  const handleDelete = async (id) => {
    await deleteSong(id);
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

  const chips = [
    { id: 'all', label: 'Tous', Icon: null },
    { id: 'Joy', label: 'Joy', Icon: Smile },
    { id: 'Sadness', label: 'Sadness', Icon: Frown },
    { id: 'Anger', label: 'Anger', Icon: Angry },
    { id: 'Fear', label: 'Fear', Icon: AlertTriangle },
    { id: 'Disgust', label: 'Disgust', Icon: Ban },
    { id: 'Surprise', label: 'Surprise', Icon: Zap },
    { id: 'instrumental', label: 'Instrumental', Icon: Music },
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {chip.Icon && <chip.Icon size={16} />}
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

      {!filteredSongs.length ? (
        // Empty state inside content to keep filters accessible
        renderEmptyState()
      ) : view === 'grid' ? (
        <div className="songs-grid">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <div className="songs-list">
          <div className="list-header">
            <div>#</div>
            <div>Fichier</div>
            <div>Transcription</div>
            <div>Émotion</div>
            <div>Confiance</div>
            <div />
          </div>
          <div>
            {filteredSongs.map((song, index) => (
              <div key={song.id} className="song-row">
                <div className="play-cell">
                  <div className="song-number">{index + 1}</div>
                </div>
                <div className="song-title-cell">
                  <div className="mini-cover">
                    {(() => {
                      const primary = (song.primaryEmotions && song.primaryEmotions[0]) || 'instrumental';
                      const iconMap = { Joy: Smile, Sadness: Frown, Anger: Angry, Fear: AlertTriangle, Disgust: Ban, Surprise: Zap, instrumental: Music };
                      const Icon = iconMap[primary] || Music;
                      return <Icon size={20} color="white" />;
                    })()}
                  </div>
                  <div className="title-info">
                    <h4>{song.fileName || 'Sans titre'}</h4>
                    <p>{(song.primaryEmotions && song.primaryEmotions[0]) || 'instrumental'}</p>
                  </div>
                </div>
                <div className="album-cell">
                  {(song.transcription || 'Aucune transcription').substring(0, 50)}
                  {song.transcription && song.transcription.length > 50 ? '...' : ''}
                </div>
                <div className="duration-cell">{(song.primaryEmotions && song.primaryEmotions[0]) || 'instrumental'}</div>
                <div className="plays-cell">{song.confidence || 0}%</div>
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
