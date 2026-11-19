/**
 * COPYRIGHT (C) 2026 BJS & BAR ASPIRANTS ACADEMY. ALL RIGHTS RESERVED.
 * PROPRIETARY CODE - UNAUTHORIZED REPRODUCTION, AI-SCRAPING, OR CLONING PROHIBITED.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 1. AUTO-RECOVER FROM DYNAMIC IMPORT / CHUNK LOADING ERRORS
// Occurs when a new build deployment invalidates old chunk hashes in the user's browser
function handleChunkError(errMessage) {
  const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i.test(
    errMessage || ''
  );
  if (isChunkError) {
    const key = 'bjs_last_chunk_reload';
    const last = Number(sessionStorage.getItem(key) || 0);
    // Reload once per 10 seconds max to prevent loops
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(key, String(Date.now()));
      if ('caches' in window) {
        caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).finally(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  }
}

window.addEventListener('error', (event) => {
  handleChunkError(event?.message);
});

window.addEventListener('unhandledrejection', (event) => {
  handleChunkError(event?.reason?.message || event?.reason);
});

// 2. ROOT ERROR BOUNDARY TO PREVENT BLANK MOBILE SCREENS
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[RootErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  handleHardRefresh = () => {
    if ('caches' in window) {
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).finally(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((r) => r.unregister());
          });
        }
        sessionStorage.clear();
        window.location.href = '/';
      });
    } else {
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b1325] text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-5">
            <span className="text-3xl font-serif">⚖️</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-amber-400 mb-2">
            BJS & Bar Aspirants Academy
          </h1>
          <p className="text-sm text-slate-300 max-w-sm mb-6 leading-relaxed">
            একটি সাময়িক কারিগরি ত্রুটির কারণে পেজটি লোড হতে পারেনি। অনুগ্রহ করে নিচের বাটনে ক্লিক করে পেজটি রিফ্রেশ করুন।
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={this.handleHardRefresh}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🔄</span> পেজ রিফ্রেশ করুন
            </button>
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.href = '/';
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              হোম পেজে ফিরে যান
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 3. MOUNT REACT ROOT
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

// 4. SERVICE WORKER REGISTRATION & SEAMLESS PWA UPDATES
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Detect updates to service worker
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, signal skip waiting
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('PWA ServiceWorker registration failed:', err);
      });

    // Auto reload once when the controller changes to seamlessly apply newest version
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
