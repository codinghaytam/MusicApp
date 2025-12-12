import React, { useEffect } from 'react';
import { useSongs } from '../state/SongsProvider';
import { Smile, Frown, Angry, AlertTriangle, Meh, Music, Zap, Ban } from 'lucide-react';

function StatsPage() {
  const { stats, statsLoading, refreshStats } = useSongs();
  const statsSnapshot = stats || { total: 0, emotions: {}, averageConfidence: 0, topEmotion: '' };

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const emotionList = Object.entries(statsSnapshot.emotions || {}).sort((a, b) => b[1] - a[1]);
  const topEmotion = statsSnapshot.topEmotion || (emotionList.length > 0 ? emotionList[0][0] : '-');
  const totalSongs = statsSnapshot.total || 0;
  const avgConfidence = (statsSnapshot.averageConfidence || 0).toFixed(1);

  const emotionIconMap = {
    Joy: Smile,
    Sadness: Frown,
    Anger: Angry,
    Fear: AlertTriangle,
    Disgust: Ban,
    Surprise: Zap,
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
              {totalSongs}
            </div>
            <div className="stat-label">Total indexé</div>
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
