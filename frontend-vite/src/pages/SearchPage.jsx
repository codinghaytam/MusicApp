import React, { useEffect, useState } from 'react';
import SongCard from '../components/SongCard';
import { useSongs } from '../state/SongsProvider';

function SearchPage() {
  const { searchSongs } = useSongs();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const normalizedQuery = query.trim();
  const isBlankQuery = normalizedQuery.length === 0;

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const { results: list, total: count } = await searchSongs(normalizedQuery);
        if (cancelled) return;
        setResults(Array.isArray(list) ? list : []);
        setTotal(count || 0);
      } catch (e) {
        if (cancelled) return;
        setError('Erreur de recherche');
        setResults([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, isBlankQuery ? 0 : 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [normalizedQuery, isBlankQuery, searchSongs]);

  const renderBody = () => {
    if (loading) {
      return (
        <p style={{ color: '#b3b3b3', textAlign: 'center', padding: 20 }}>
          Recherche...
        </p>
      );
    }

    if (error) {
      return (
        <p style={{ color: '#ff6b6b', textAlign: 'center', padding: 20 }}>
          {error}
        </p>
      );
    }

    if (!results.length) {
      return (
        <p style={{ color: '#b3b3b3', textAlign: 'center', padding: 40 }}>
          {isBlankQuery ? 'Aucune chanson disponible.' : 'Aucune chanson trouvée.'}
        </p>
      );
    }

    return (
      <div className="songs-grid" id="searchResults">
        {results.map((song, idx) => (
          <SongCard key={song.id || idx} song={song} />
        ))}
      </div>
    );
  };

  return (
    <>
      
      <div className="content-section">
        <div
          className="search-bar"
          style={{ width: '100%', maxWidth: 600, margin: '0 auto 32px' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="searchInputPageReact"
            placeholder="Artistes, chansons ou albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {!loading && !error && (
          <p style={{ textAlign: 'center', color: '#b3b3b3', marginBottom: 16 }}>
            {isBlankQuery
              ? 'Retour complet : tous les titres'
              : `${total} résultat${total === 1 ? '' : 's'}`}
          </p>
        )}
        {renderBody()}
      </div>
    </>
  );
}

export default SearchPage;
