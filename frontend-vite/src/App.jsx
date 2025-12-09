import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LibraryPage from './pages/LibraryPage';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';
import StatsPage from './pages/StatsPage';
import LogsPage from './pages/LogsPage';
import AddSongModal from './components/AddSongModal';

function PlaylistsPage() {
  return (
    <div className="content-section">
      <div className="empty-state">
        <h3>Aucune playlist</h3>
        <p>Cette section est disponible pour de futures playlists.</p>
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const activePage = (() => {
    const path = location.pathname.replace(/^\/+/, '');
    return path || 'library';
  })();

  const handleChangePage = (page) => {
    const to = page === 'library' ? '/' : `/${page}`;
    navigate(to);
  };

  const handleRequestAddSong = () => setIsAddOpen(true);

  return (
    <div className="app-container min-h-screen w-full bg-black text-white">
      <Sidebar activePage={activePage} onChangePage={handleChangePage} />
      <main className="main-content">
        <Header activePage={activePage} onAddSongClick={() => setIsAddOpen(true)} />
        <AddSongModal open={isAddOpen} onOpenChange={setIsAddOpen} />

        <Routes>
          <Route path="/" element={<LibraryPage onRequestAddSong={handleRequestAddSong} />} />
          <Route path="/library" element={<LibraryPage onRequestAddSong={handleRequestAddSong} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
