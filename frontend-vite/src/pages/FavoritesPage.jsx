import React, { useMemo } from 'react';
import { useSongs } from '../state/SongsProvider';
import SongCard from '../components/SongCard';

function FavoritesPage() {
  const { songs } = useSongs();

  // Filter songs with high confidence (>= 75%) as "favorites"
  const favorites = useMemo(
    () => songs.filter((song) => typeof song.confidence === 'number' && song.confidence >= 75),
    [songs]
  );

  if (!favorites.length) {
    return (
      <div className="content-section">
        <div className="empty-state">
          <h3>Aucun favori</h3>
          <p>Les chansons avec une confiance élevée (≥75%) apparaîtront ici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h2 className="section-title">Chansons haute confiance</h2>
        <p style={{ color: '#b3b3b3', fontSize: '14px' }}>
          {favorites.length} chanson{favorites.length > 1 ? 's' : ''} avec confiance ≥75%
        </p>
      </div>
      <div id="favoritesList" className="songs-grid">
        {favorites.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
    </div>
  );
}

export default FavoritesPage;
