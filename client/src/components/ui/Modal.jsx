import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockBodyScroll, unlockBodyScroll } from './scrollLock';

/**
 * BJS & Bar Aspirants Academy - Universal Modal Component
 * Built with React Portal (document.body), body scroll lock,
 * accessible dialog semantics, focus trap, and escape key listener.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  headerAction,
  footer,
  maxWidth = 'max-w-2xl',
  maxHeight = 'max-h-[calc(100dvh-2rem)]',
  className = '',
  zIndex = 'z-[9990]',
  closeOnEsc = true,
  closeOnBackdropClick = true,
  showCloseButton = true,
  ariaLabel,
  customHeader = null
}) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef(null);
  const prevFocusedElement = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Body scroll lock management & focus retention
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();
    prevFocusedElement.current = document.activeElement;

    // Focus the first actionable element or the modal container
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 40);

    return () => {
      clearTimeout(timer);
      unlockBodyScroll();
      if (prevFocusedElement.current && typeof prevFocusedElement.current.focus === 'function') {
        prevFocusedElement.current.focus();
      }
    };
  }, [isOpen]);

  // Escape key handler & focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }

      // Tab trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn`}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || (typeof title === 'string' ? title : 'Dialog')}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} ${maxHeight} rounded-2xl sm:rounded-3xl bg-[#0b1325] border border-slate-800 shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-100 font-sans outline-none ${className}`}
      >
        {/* Custom Header or Standard Header */}
        {customHeader !== null ? (
          customHeader
        ) : (title || showCloseButton) ? (
          <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {icon && <span className="text-xl shrink-0">{icon}</span>}
              <div className="min-w-0">
                {title && (
                  <h3 className="font-extrabold text-white text-sm sm:text-base truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[11px] text-slate-400 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerAction}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all border border-slate-700/60 cursor-pointer"
                  title="Close (Esc)"
                  aria-label="Close"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="border-t border-slate-800 px-4 sm:px-6 py-3 bg-slate-900/90 shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
