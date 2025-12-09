import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { SongsProvider } from './state/SongsProvider';
import { LogsProvider } from './state/LogsProvider';
import { AuthProvider } from './state/AuthProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SongsProvider>
        <LogsProvider>
          <App />
        </LogsProvider>
      </SongsProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
