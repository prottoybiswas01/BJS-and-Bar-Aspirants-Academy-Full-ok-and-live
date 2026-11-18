import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

function ToastContainer({ toasts, onRemove, onPause, onResume }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md w-auto z-[99999] pointer-events-none flex flex-col gap-2.5 pt-[env(safe-area-inset-top,0)]"
      role="region"
      aria-label="System Notifications"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';
        const isInfo = t.type === 'info';

        let badgeStyle = 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-slate-950/80';
        let icon = 'ℹ️';

        if (isSuccess) {
          badgeStyle = 'bg-[#062016]/95 text-emerald-200 border-emerald-500/50 shadow-emerald-950/60';
          icon = '✅';
        } else if (isError) {
          badgeStyle = 'bg-[#290a0d]/95 text-rose-200 border-rose-500/60 shadow-rose-950/70';
          icon = '❌';
        } else if (isWarning) {
          badgeStyle = 'bg-[#2b1803]/95 text-amber-200 border-amber-500/50 shadow-amber-950/60';
          icon = '⚠️';
        } else if (isInfo) {
          badgeStyle = 'bg-[#081a2e]/95 text-cyan-200 border-cyan-500/50 shadow-cyan-950/60';
          icon = 'ℹ️';
        }

        return (
          <div
            key={t.id}
            onMouseEnter={() => onPause(t.id)}
            onMouseLeave={() => onResume(t.id)}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-fadeIn transition-all text-xs font-semibold ${badgeStyle}`}
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <span className="text-base shrink-0 mt-0.5 sm:mt-0">{icon}</span>
              <p className="break-words leading-relaxed text-slate-100 font-sans select-text">
                {t.text}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(t.id)}
              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const timersRef = useRef({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((msg, type = 'success', options = {}) => {
    if (!msg) return;
    const text = typeof msg === 'string' ? msg : (msg.text || msg.message || String(msg));
    const resolvedType = (typeof msg === 'object' && msg.type) ? msg.type : type;

    const duration = options.duration !== undefined
      ? options.duration
      : (resolvedType === 'error' ? 6000 : 4000);

    setToasts((prev) => {
      // Deduplicate: If identical message with same type is active, refresh duration
      const existing = prev.find((t) => t.text === text && t.type === resolvedType);
      if (existing) {
        if (timersRef.current[existing.id]) {
          clearTimeout(timersRef.current[existing.id]);
        }
        if (duration > 0) {
          timersRef.current[existing.id] = setTimeout(() => {
            removeToast(existing.id);
          }, duration);
        }
        return prev;
      }

      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = {
        id,
        text,
        type: resolvedType,
        duration,
        createdAt: Date.now()
      };

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      // Keep at most 4 simultaneous notifications
      return [...prev.slice(-3), newToast];
    });
  }, [removeToast]);

  const showSuccess = useCallback((msg, opts) => showToast(msg, 'success', opts), [showToast]);
  const showError = useCallback((msg, opts) => showToast(msg, 'error', opts), [showToast]);
  const showWarning = useCallback((msg, opts) => showToast(msg, 'warning', opts), [showToast]);
  const showInfo = useCallback((msg, opts) => showToast(msg, 'info', opts), [showToast]);

  const pauseToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const resumeToast = useCallback((id, remainingDuration = 2500) => {
    if (!timersRef.current[id]) {
      timersRef.current[id] = setTimeout(() => {
        removeToast(id);
      }, remainingDuration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, removeToast }}>
      {children}
      {mounted && createPortal(
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
          onPause={pauseToast}
          onResume={resumeToast}
        />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (m) => console.log('Toast fallback:', m),
      showSuccess: (m) => console.log('Success fallback:', m),
      showError: (m) => console.error('Error fallback:', m),
      showWarning: (m) => console.warn('Warning fallback:', m),
      showInfo: (m) => console.info('Info fallback:', m),
      removeToast: () => {}
    };
  }
  return context;
}
