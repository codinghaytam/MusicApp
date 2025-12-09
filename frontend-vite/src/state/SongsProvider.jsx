import React, { createContext, useContext, useState } from 'react';

const SongsContext = createContext(null);

export function SongsProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [librarySearch, setLibrarySearch] = useState('');

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  const generateColor = () => {
    const colors = ['#1db954', '#e13300', '#2d46b9', '#f037a5', '#ff6600', '#8e44ad'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const detectSentiment = (title, artist) => {
    const text = `${title} ${artist}`.toLowerCase();
    const sentiments = {
      joyeux: ['happy', 'joy', 'dance', 'party', 'fun'],
      triste: ['sad', 'cry', 'lonely', 'pain'],
      énergique: ['energy', 'power', 'rock', 'hard'],
      calme: ['calm', 'peace', 'soft', 'quiet'],
      romantique: ['love', 'heart', 'kiss', 'romantic'],
    };

    for (const [sentiment, keywords] of Object.entries(sentiments)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return sentiment;
      }
    }

    const fallback = ['joyeux', 'calme', 'énergique', 'romantique'];
    return fallback[Math.floor(Math.random() * fallback.length)];
  };

  const addSong = ({ title, artist, album }) => {
    if (songs.length >= 999) {
      throw new Error('LIMIT_REACHED');
    }

    const safeTitle = title?.trim() || 'Untitled';
    const safeArtist = artist?.trim() || 'Unknown';
    const safeAlbum = album?.trim() || 'Single';

    const minutes = Math.floor(Math.random() * 3) + 2;
    const seconds = Math.floor(Math.random() * 60)
      .toString()
      .padStart(2, '0');
    const duration = `${minutes}:${seconds}`;

    const newSong = {
      id: generateId(),
      title: safeTitle,
      artist: safeArtist,
      album: safeAlbum,
      coverColor: generateColor(),
      sentiment: detectSentiment(safeTitle, safeArtist),
      rating: Math.floor(Math.random() * 3) + 3,
      duration,
      plays: 0,
      addedAt: new Date().toISOString(),
    };

    setSongs((prev) => [newSong, ...prev]);
    return newSong;
  };

  const deleteSong = (id) => {
    setSongs((prev) => prev.filter((song) => song.id !== id));
  };

  const value = {
    songs,
    setSongs,
    addSong,
    deleteSong,
    librarySearch,
    setLibrarySearch,
  };

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>;
}

export function useSongs() {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs must be used within SongsProvider');
  return ctx;
}
