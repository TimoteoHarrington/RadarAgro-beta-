// ============================================================
// main.jsx — Vite/React entry point
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global styles (order matters: global first, then components)
import './styles/global.css';
import './styles/components.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
