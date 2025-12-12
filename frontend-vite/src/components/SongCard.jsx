import React from 'react';
import { emotionConfig, emotionIcons } from '../lib/emotionIcons';

function SongCard({ song }) {
  if (!song) return null;

  const config = emotionConfig[song.emotion] || emotionConfig.instrumental;
  const Icon = emotionIcons[song.icon] || emotionIcons.Music;
  const bgColor = config.color;

  return (
    <div className="song-card" data-id={song.id}>
      <div className="album-cover" style={{ background: bgColor }}>
        <Icon size={48} color="white" strokeWidth={2} />
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
        <h3 title={song.fileName}>{song.fileName || 'Sans titre'}</h3>
        <p className="artist">
          {song.emotion || 'neutre'} ({song.confidence || 0}%)
        </p>
        {song.transcription && (
          <p className="artist" style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
            {song.transcription.substring(0, 50)}
            {song.transcription.length > 50 ? '...' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

export default SongCard;
