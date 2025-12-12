import React, { useEffect, useState } from 'react';
import { useSongs } from '../state/SongsProvider';
import { Smile, Frown, Angry, AlertTriangle, Meh, Music } from 'lucide-react';

function StatsPage() {
  const { songs, getStats } = useSongs();
  const [stats, setStats] = useState({ total: 0, emotions: {} });

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getStats();
      setStats(data);
    };
    fetchStats();
  }, [songs, getStats]);

  const emotionList = Object.entries(stats.emotions || {}).sort((a, b) => b[1] - a[1]);
  const topEmotion = emotionList.length > 0 ? emotionList[0][0] : '-';
  const totalSongs = stats.total || 0;
  
  // Calculate average confidence
  const avgConfidence = songs.length > 0 
    ? (songs.reduce((sum, song) => sum + (song.confidence || 0), 0) / songs.length).toFixed(1)
    : 0;

  const emotionIconMap = {
    joyeux: Smile,
    triste: Frown,
    colère: Angry,
    peur: AlertTriangle,
    neutre: Meh,
    instrumental: Music,
  };

  return (
    <div className="content-section">
      <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">
              {totalSongs}
            </div>
            <div className="stat-label">Chansons</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {songs.length}
            </div>
            <div className="stat-label">Fichiers audio</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {avgConfidence}%
            </div>
            <div className="stat-label">Confiance moyenne</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {topEmotion}
            </div>
            <div className="stat-label">Émotion dominante</div>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: '32px', marginBottom: '16px' }}>
          Distribution des émotions
        </div>
        {emotionList.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <h3>Aucune donnée</h3>
            <p>Aucune chanson n'a encore été analysée.</p>
          </div>
        ) : (
          <div className="songs-list">
            <div className="list-header">
              <div>#</div>
              <div>Émotion</div>
              <div>Nombre de chansons</div>
              <div>Pourcentage</div>
              <div></div>
              <div></div>
            </div>
            <div>
              {emotionList.map(([emotion, count], index) => {
                const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
                const Icon = emotionIconMap[emotion] || Music;
                
                return (
                  <div key={emotion} className="song-row">
                    <div className="song-number">{index + 1}</div>
                    <div className="song-title-cell">
                      <div className="mini-cover">
                        <Icon size={20} color="white" />
                      </div>
                      <div className="title-info">
                        <h4>{emotion}</h4>
                      </div>
                    </div>
                    <div className="album-cell">{count}</div>
                    <div className="duration-cell">{percentage}%</div>
                    <div></div>
                    <div></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
  );
}

export default StatsPage;
