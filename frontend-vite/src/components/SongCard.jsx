import React from 'react';

function SongCard({ song }) {
  if (!song) return null;

  return (
    <div className="song-card" data-id={song.id}>
      <div className="album-cover" style={{ background: song.coverColor }}>
        🎵
        <div className="play-overlay">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      </div>
      <div className="song-info">
        <h3>{song.title}</h3>
        <p className="artist">{song.artist}</p>
      </div>
    </div>
  );
}

export default SongCard;
