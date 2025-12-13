import React from 'react';
import { Smile, Frown, Angry, AlertTriangle, Meh, Music, Zap, Ban, Play, Pause } from 'lucide-react';
import { useSongs } from '../state/SongsProvider';

function SongCard({ song }) {
  if (!song) return null;
  const { playSong, isPlaying, currentTrackId } = useSongs();
  const primary = (song.primaryEmotions && song.primaryEmotions[0]) || null;
  const iconMap = {
    Joy: Smile,
    Sadness: Frown,
    Anger: Angry,
    Fear: AlertTriangle,
    Disgust: Ban,
    Surprise: Zap,
    instrumental: Music,
  };
  const colorMap = {
    Joy: '#1db954',
    Sadness: '#2d46b9',
    Anger: '#e13300',
    Fear: '#8e44ad',
    Disgust: '#16a085',
    Surprise: '#e67e22',
    instrumental: '#ff6600',
  };
  const Icon = iconMap[primary || 'instrumental'] || Music;
  const bgColor = colorMap[primary || 'instrumental'] || '#535353';

  return (
    <div className="song-card" data-id={song.id}>
      <div className="album-cover" style={{ background: bgColor }}>
        <Icon size={48} color="white" strokeWidth={2} />
        <div
          className="play-overlay"
          onClick={(e) => { e.stopPropagation(); playSong(song); }}
          style={{ cursor: 'pointer' }}
        >
          {isPlaying && currentTrackId === song.id ? (
            <Pause size={20} color="white" />
          ) : (
            <Play size={20} color="white" />
          )}
        </div>
      </div>
      <div className="song-info">
        <h3 title={song.title}>{song.title || 'Sans titre'}</h3>
        <p className="artist">
          {(primary || 'instrumental')} ({song.confidence ?? 0}%)
        </p>
        {song.primaryEmotions && song.primaryEmotions.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {song.primaryEmotions.slice(0, 4).map((e) => (
              <span key={e} className="chip" style={{ fontSize: 11 }}>{e}</span>
            ))}
          </div>
        )}
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
