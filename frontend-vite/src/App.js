import React, { useState } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LibraryPage from './pages/LibraryPage';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';
import StatsPage from './pages/StatsPage';
import LogsPage from './pages/LogsPage';

function App() {
  const [activePage, setActivePage] = useState('library');

  return (
    <div className="app-container min-h-screen w-full bg-black text-white">
      <Sidebar activePage={activePage} onChangePage={setActivePage} />
      <main className="main-content">
        <Header activePage={activePage} onAddSongClick={() => {}} />
        <section className={`page ${activePage === 'library' ? 'active' : ''}`}>
          <div className="content-section">
            <LibraryPage />
          </div>
        </section>
        <section className={`page ${activePage === 'search' ? 'active' : ''}`}>
          <div className="content-section">
            <SearchPage />
          </div>
        </section>
        <section className={`page ${activePage === 'favorites' ? 'active' : ''}`}>
          <div className="content-section">
            <FavoritesPage />
          </div>
        </section>
        <section className={`page ${activePage === 'stats' ? 'active' : ''}`}>
          <div className="content-section">
            <StatsPage />
          </div>
        </section>
        <section className={`page ${activePage === 'logs' ? 'active' : ''}`}>
          <div className="content-section">
            <LogsPage />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
