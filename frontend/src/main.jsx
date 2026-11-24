import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ensureStorageSchema } from '@core/utils/storage';

// Wipe legacy persisted blobs from previous schema versions on the very first
// load after a deploy. Runs synchronously before React mounts so no component
// can ever read stale state from a bumped schema version.
ensureStorageSchema();

// Automatically reload if a chunk fails to load due to a new deployment / updated chunk hash
window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Preload error detected, reloading page...', event);
    // Reload at most twice per tab session. A chunk that is genuinely broken
    // (dev-server error, missing file) would otherwise reload the page forever.
    const count = Number(sessionStorage.getItem('chunk_preload_reload_count') || 0);
    if (count < 2) {
        sessionStorage.setItem('chunk_preload_reload_count', String(count + 1));
        window.location.reload();
    }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
