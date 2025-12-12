import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { SongsProvider } from './state/SongsProvider'
import { AuthProvider } from './state/AuthProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SongsProvider>
          <App />
        </SongsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
