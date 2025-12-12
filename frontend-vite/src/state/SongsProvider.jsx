import React, { createContext, useContext, useState, useEffect } from 'react';

const SongsContext = createContext(null);

const API_BASE = 'http://localhost:3000/api';

export function SongsProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [loading, setLoading] = useState(false);

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
      const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search');
      return await response.json();
    } catch (error) {
      console.error('Error searching songs:', error);
      return [];
    }
  };

  const getStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { total: 0, emotions: {} };
    }
  };

  const value = {
    songs,
    setSongs,
    addSong,
    deleteSong,
    updateSong,
    searchSongs,
    getStats,
    fetchSongs,
    librarySearch,
    setLibrarySearch,
    loading,
  };

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>;
}

export function useSongs() {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs must be used within SongsProvider');
  return ctx;
}
