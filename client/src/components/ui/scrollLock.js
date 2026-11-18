/**
 * BJS & Bar Aspirants Academy - Body Scroll Lock Engine
 * Reference-counted, safe for multiple concurrent modals,
 * with layout-shift compensation for desktop scrollbars.
 */

let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;

    // Compensate for disappearing scrollbar on desktop to prevent page jump
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow || '';
    document.body.style.paddingRight = originalPaddingRight || '';
  }
}

export function forceUnlockAllScroll() {
  if (typeof document === 'undefined') return;
  lockCount = 0;
  document.body.style.overflow = originalOverflow || '';
  document.body.style.paddingRight = originalPaddingRight || '';
}
