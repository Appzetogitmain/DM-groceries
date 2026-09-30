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
    const lastReload = sessionStorage.getItem('last_chunk_preload_reload');
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 15000) {
        sessionStorage.setItem('last_chunk_preload_reload', String(now));
        window.location.reload();
    }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
