import React, { useMemo } from 'react';
import { useSongs } from '../state/SongsProvider';

function StatsPage() {
  const { songs } = useSongs();

  const { totalSongs, totalPlays, avgRating, topSentiment, topSongs } = useMemo(() => {
    const totalSongsVal = songs.length;
    const totalPlaysVal = songs.reduce((sum, song) => sum + (song.plays || 0), 0);
    const avgRatingVal = totalSongsVal
      ? (songs.reduce((sum, song) => sum + (song.rating || 0), 0) / totalSongsVal).toFixed(1)
      : 0;

    const sentimentCounts = {};
    songs.forEach((song) => {
      if (!song.sentiment) return;
      sentimentCounts[song.sentiment] = (sentimentCounts[song.sentiment] || 0) + 1;
    });
    const topSentimentKey = Object.keys(sentimentCounts).reduce(
      (a, b) => (sentimentCounts[a] > sentimentCounts[b] ? a : b),
      '-'
    );

    const topSongsVal = [...songs]
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 10);

    return {
      totalSongs: totalSongsVal,
      totalPlays: totalPlaysVal,
      avgRating: avgRatingVal,
      topSentiment: topSentimentKey,
      topSongs: topSongsVal,
    };
  }, [songs]);

  return (
    <div className="page" id="statsReactPage">
      <div className="page-header">
        <h1 className="page-title">Statistiques</h1>
      </div>
      <div className="content-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" id="totalSongs">
              {totalSongs}
            </div>
            <div className="stat-label">Chansons</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" id="totalPlays">
              {totalPlays}
            </div>
            <div className="stat-label">Écoutes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" id="avgRating">
              {avgRating}
            </div>
            <div className="stat-label">Note moyenne</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" id="topSentiment">
              {topSentiment}
            </div>
            <div className="stat-label">Genre préféré</div>
          </div>
        </div>

        <div className="section-title">Les plus écoutées</div>
        {topSongs.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <h3>Aucune écoute</h3>
            <p>Aucune chanson n'a encore été écoutée.</p>
          </div>
        ) : (
          <div id="topSongs" className="songs-list">
            <div className="list-header">
              <div>#</div>
              <div>Titre</div>
              <div>Album</div>
              <div>Ajouté le</div>
              <div>Durée</div>
              <div></div>
            </div>
            <div id="topSongsList">
              {topSongs.map((song, index) => (
                <div key={song.id} className="song-row">
                  <div className="song-number">{index + 1}</div>
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
                  <div className="plays-cell">{song.plays}</div>
                  <div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsPage;
