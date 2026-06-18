// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// ── Importa o CSS do sistema de toasts/confirm ───────────────────────────────
import './components/ui.css'
// ────────────────────────────────────────────────────────────────────────────

// Ponto de entrada do React.
// Tudo que estava no main.js antigo (modais, eventos, filtros) foi migrado
// para os componentes JSX correspondentes — não precisa de nada daquilo aqui.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)