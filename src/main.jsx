// ============================================================
// main.jsx — MIGRADO A REACT ROUTER
// ============================================================
// CAMBIO: se agrega BrowserRouter para que React Router
//         pueda leer y escribir la URL del navegador.
//         Todo lo demás queda igual.
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';   // ← NUEVO
import App from './App';

// Global styles (order matters: global first, then components)
import './styles/global.css';
import './styles/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>     {/* ← NUEVO: envuelve toda la app */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
