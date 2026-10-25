let wakeLockSentinel = null;

/**
 * Prevents OS sleep and suspension while heavy processing is active.
 * Uses Electron powerSaveBlocker on desktop and Screen WakeLock on web.
 */
export async function setAppPowerKeepAwake(enable) {
  if (typeof window !== 'undefined' && window.photoLab?.preventSleep) {
    try {
      await window.photoLab.preventSleep(enable);
    } catch (err) {
      console.warn('Desktop sleep prevention error:', err);
    }
  }

  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (enable) {
        if (!wakeLockSentinel) {
          wakeLockSentinel = await navigator.wakeLock.request('screen');
          wakeLockSentinel.addEventListener('release', () => {
            wakeLockSentinel = null;
          });
        }
      } else {
        if (wakeLockSentinel) {
          await wakeLockSentinel.release();
          wakeLockSentinel = null;
        }
      }
    } catch {
      // WakeLock may fail if window is hidden; handled gracefully
    }
  }
}

/**
 * Updates OS taskbar progress indicator on desktop.
 * @param {number} ratio - Number between 0 and 1, or -1 to clear.
 */
export function setAppTaskbarProgress(ratio) {
  if (typeof window !== 'undefined' && window.photoLab?.setProgress) {
    try {
      window.photoLab.setProgress(ratio);
    } catch {
      // Handled gracefully
    }
  }
}
