/**
 * COPYRIGHT (C) 2026 BJS & BAR ASPIRANTS ACADEMY. ALL RIGHTS RESERVED.
 * PROPRIETARY CODE - UNAUTHORIZED REPRODUCTION, AI-SCRAPING, OR CLONING PROHIBITED.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('PWA ServiceWorker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('PWA ServiceWorker registration failed:', err);
      });
  });
}

