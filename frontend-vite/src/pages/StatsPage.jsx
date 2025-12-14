import React, { useEffect } from 'react';
import { useSongs } from '../state/SongsProvider';
import { Smile, Frown, Angry, AlertTriangle, Music, Zap, Ban, Meh } from 'lucide-react';
import { formatEmotionForDisplay } from '../lib/emotionLabels';

function StatsPage() {
  const { stats, refreshStats } = useSongs();
  const statsSnapshot = stats || { total: 0, emotions: {}, averageConfidence: 0, topEmotion: '' };

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const emotionList = Object.entries(statsSnapshot.emotions || {}).sort((a, b) => b[1] - a[1]);
  const rawTopEmotion = statsSnapshot.topEmotion || (emotionList.length > 0 ? emotionList[0][0] : '');
  const topEmotion = rawTopEmotion ? formatEmotionForDisplay(rawTopEmotion, '-') : '-';
  const totalSongs = statsSnapshot.total || 0;
  const uniqueEmotionCount = emotionList.length;
  const maxEmotionCount = emotionList.reduce((max, [, count]) => Math.max(max, count), 0) || 1;

  const emotionIconMap = {
    Joy: Smile,
    Sadness: Frown,
    Anger: Angry,
    Fear: AlertTriangle,
    Disgust: Ban,
    Surprise: Zap,
    Neutral: Meh,
    Calm: Music,
    Instrumental: Music,
  };

  const emotionColorMap = {
    Joy: '#1db954',
    Sadness: '#2d46b9',
    Anger: '#e13300',
    Fear: '#8e44ad',
    Disgust: '#16a085',
    Surprise: '#e67e22',
    Neutral: '#535353',
    Calm: '#1abc9c',
    Instrumental: '#ff6600',
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
              {uniqueEmotionCount}
            </div>
            <div className="stat-label">Émotions uniques</div>
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
          <div className="emotion-bars">
            {emotionList.map(([emotion, count], index) => {
              const percentage = totalSongs > 0 ? ((count / totalSongs) * 100).toFixed(1) : '0.0';
              const displayEmotion = formatEmotionForDisplay(emotion);
              const Icon = emotionIconMap[displayEmotion] || Music;
              const widthPercent = Math.max(4, Math.min(100, (count / maxEmotionCount) * 100));
              return (
                <div key={`${emotion}-${index}`} className="emotion-bar-row">
                  <div className="emotion-bar-label">
                    <span className="emotion-rank">{index + 1}</span>
                    <div className="emotion-label-icon">
                      <Icon size={18} />
                    </div>
                    <span>{displayEmotion}</span>
                  </div>
                  <div className="emotion-bar-track">
                    <div
                      className="emotion-bar-fill"
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: emotionColorMap[displayEmotion] || '#1db954',
                      }}
                    />
                  </div>
                  <div className="emotion-bar-value">{count} ({percentage}%)</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}

export default StatsPage;
