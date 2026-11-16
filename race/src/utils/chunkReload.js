// La interfaz está dividida en varios .js (panel, overlay, pestañas pesadas). Si una página quedó abierta
// desde antes de actualizar el programa (vMix / OBS no recargan solos) y pide un archivo que ya no existe,
// Vite avisa con el evento 'vite:preloadError'. En ese caso se recarga la página para tomar la versión nueva,
// nunca más de una vez cada 30 s (si el archivo realmente falta, no queda en bucle).

export const RELOAD_GUARD_KEY = 'chunkReloadAt';
export const RELOAD_GUARD_MS = 30000;

// Decide si corresponde recargar y, si corresponde, deja registrado el momento. Sin sessionStorage no recarga.
export function shouldReloadAfterChunkError(storage, now = Date.now()) {
  try {
    const last = Number(storage.getItem(RELOAD_GUARD_KEY)) || 0;
    if (now - last < RELOAD_GUARD_MS) return false;
    storage.setItem(RELOAD_GUARD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

export function installChunkReload(win = window) {
  win.addEventListener('vite:preloadError', (event) => {
    let storage = null;
    try { storage = win.sessionStorage; } catch { /* sessionStorage bloqueado */ }
    if (!storage || !shouldReloadAfterChunkError(storage)) return; // se deja seguir el error original
    event.preventDefault();
    win.location.reload();
  });
}
