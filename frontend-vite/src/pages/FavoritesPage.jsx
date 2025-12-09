import React, { useMemo } from 'react';
import { useSongs } from '../state/SongsProvider';
import SongCard from '../components/SongCard';

function FavoritesPage() {
  const { songs } = useSongs();

  const favorites = useMemo(
    () => songs.filter((song) => typeof song.rating === 'number' && song.rating >= 4),
    [songs]
  );

  if (!favorites.length) {
    return (
      <div className="content-section">
        <div className="empty-state">
          <h3>Aucun favori</h3>
          <p>Marquez des chansons comme favorites pour les voir ici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div id="favoritesList" className="songs-grid">
        {favorites.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
    </div>
  );
}

export default FavoritesPage;
