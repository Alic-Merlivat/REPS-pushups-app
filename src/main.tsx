import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BUILD_VERSION } from './version.ts';

// Auto-clean stale caches on build version bump
if (typeof window !== 'undefined' && 'caches' in window) {
  try {
    const prevVersion = localStorage.getItem('reps_app_version');
    if (prevVersion && prevVersion !== BUILD_VERSION) {
      console.log(`[Reps] New build detected (${prevVersion} -> ${BUILD_VERSION}). Purging stale cache.`);
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      }).catch(() => {});
    }
    localStorage.setItem('reps_app_version', BUILD_VERSION);
  } catch (e) {}
}

// PWA Service Worker Registration & Auto-Update
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Immediately check for updates
        reg.update().catch(() => {});

        // Re-check for updates whenever user returns to the app
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });
      })
      .catch((err) => {
        console.warn('Reps PWA ServiceWorker registration note:', err);
      });

    // When a new service worker takes over, reload to apply newest build
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
