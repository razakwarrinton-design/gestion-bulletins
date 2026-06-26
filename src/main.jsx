import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './styles/darkmode.css';
import { DarkModeProvider } from './contexts/DarkModeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DarkModeProvider>
      <App />
    </DarkModeProvider>
  </StrictMode>,
)
