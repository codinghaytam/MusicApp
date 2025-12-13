import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SongsContext = createContext(null);

const API_BASE = 'http://localhost:3000/api';
const API_ORIGIN = API_BASE.replace(/\/api$/, '');
const DEFAULT_STATS = { total: 0, emotions: {}, averageConfidence: 0, topEmotion: '' };

export function SongsProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [statsLoading, setStatsLoading] = useState(false);
  // Audio playback state
  const audioRef = useRef(typeof Audio !== 'undefined' ? new Audio() : null);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      try { audio.pause(); } catch (e) {}
    };
  }, []);

  // Fetch songs from Elasticsearch on mount
  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/items?size=200`);
      if (!response.ok) throw new Error('Failed to fetch songs');
      const data = await response.json();
      setSongs(data || []);
    } catch (error) {
      console.error('Error fetching songs:', error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const addSong = async (analysisData) => {
    try {
      // Save analyzed song to Elasticsearch
      const response = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) throw new Error('Failed to save song');
      const result = await response.json();
      
      // Refresh the list
      await fetchSongs();
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Error adding song:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteSong = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete song');
      }

      // Update local state
      setSongs((prev) => prev.filter((song) => song.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting song:', error);
      return { success: false, error: error.message };
    }
  };

  const updateSong = async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update song');
      
      // Refresh the list
      await fetchSongs();
      return { success: true };
    } catch (error) {
      console.error('Error updating song:', error);
      return { success: false, error: error.message };
    }
  };

  const searchSongs = async (query) => {
    try {
      const params = new URLSearchParams({ q: query, size: '50' });
      const response = await fetch(`${API_BASE}/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to search');
      const total = parseInt(response.headers.get('X-Total-Count') || '0', 10) || 0;
      const data = await response.json();
      const results = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.results) ? data.results : []);
      return { results, total };
    } catch (error) {
      console.error('Error searching songs:', error);
      return { results: [], total: 0 };
    }
  };

  const refreshStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await fetch(`${API_BASE}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data || DEFAULT_STATS);
      return data || DEFAULT_STATS;
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(DEFAULT_STATS);
      return DEFAULT_STATS;
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Playback controls: song is an object from songs list
  const playSong = async (song) => {
    if (!song) return;
    const audio = audioRef.current;
    if (!audio) return;

    const filename = song.storedFileName || song.storedFilename || song.storedPath || song.fileName || song.fileNameOriginal || song.id;
    if (!filename) return;

    // Prefer stored file name or extract basename from storedPath
    let storedName = null;
    if (song.storedFileName) storedName = song.storedFileName;
    else if (song.storedFilename) storedName = song.storedFilename;
    else if (song.storedPath) storedName = song.storedPath.split('/').pop().split('\\').pop();
    else if (song.fileName && song.fileName === filename) storedName = filename;

    const src = storedName
      ? `${API_ORIGIN}/api/audio/${encodeURIComponent(storedName)}`
      : `${API_BASE}/audio/${encodeURIComponent(filename)}`;

    // If same track, toggle pause/play
    if (currentTrackId === song.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        try { await audio.play(); } catch (e) { console.warn('Play failed', e); }
      }
      return;
    }

    // New track: set src and play
    try {
      audio.pause();
    } catch (e) {}
    audio.src = src;
    audio.currentTime = 0;
    setCurrentTrackId(song.id);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.warn('Auto-play prevented or failed', e);
      setIsPlaying(false);
    }
  };

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch (e) {}
    setIsPlaying(false);
    setCurrentTrackId(null);
  };

  const value = {
    songs,
    setSongs,
    addSong,
    deleteSong,
    updateSong,
    searchSongs,
    stats,
    statsLoading,
    refreshStats,
    fetchSongs,
    librarySearch,
    setLibrarySearch,
    loading,
    // Playback API
    playSong,
    stopPlayback,
    isPlaying,
    currentTrackId,
    audioRef,
  };

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>;
}

export function useSongs() {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs must be used within SongsProvider');
  return ctx;
}
