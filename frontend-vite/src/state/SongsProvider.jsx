import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { normalizeSongDocument, normalizeStatsPayload } from '../lib/emotionLabels';

const SongsContext = createContext(null);

const API_BASE = 'http://localhost:8000/api';
const API_ORIGIN = API_BASE.replace(/\/api$/, '');
const DEFAULT_STATS = { total: 0, emotions: {}, averageConfidence: 0, topEmotion: '' };
const PAGE_SIZE = 500;
const MAX_FETCH = 5000;

export function SongsProvider({ children }) {
  const [songs, setSongs] = useState([]);
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
      let from = 0;
      let combined = [];
      while (from < MAX_FETCH) {
        const response = await fetch(`${API_BASE}/items?size=${PAGE_SIZE}&from=${from}`);
        if (!response.ok) throw new Error('Failed to fetch songs');
        const page = await response.json();
        const list = Array.isArray(page) ? page : [];
        combined = combined.concat(list);
        if (list.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      const normalized = combined.map((song) => normalizeSongDocument(song));
      setSongs(normalized);
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

      const normalizedAnalysis = normalizeSongDocument(analysisData);
      const fallbackId =
        normalizedAnalysis.id ||
        normalizedAnalysis.storedFileName ||
        normalizedAnalysis.fileName ||
        `temp-${Date.now()}`;
      const newSong = {
        ...normalizedAnalysis,
        id: result?.id || fallbackId,
        timestamp: normalizedAnalysis.timestamp || new Date().toISOString(),
      };
      setSongs((prev) => [normalizeSongDocument(newSong), ...prev]);
      refreshStats();
      return { success: true, id: newSong.id };
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
      const normalizedResults = results.map((song) => normalizeSongDocument(song));
      return { results: normalizedResults, total };
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
      const normalizedStats = normalizeStatsPayload(data || DEFAULT_STATS);
      setStats(normalizedStats);
      return normalizedStats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      const fallback = normalizeStatsPayload(DEFAULT_STATS);
      setStats(fallback);
      return fallback;
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
