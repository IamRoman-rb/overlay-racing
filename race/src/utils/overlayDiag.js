// Diagnóstico del overlay al aire (no de las vistas previas del panel). Cada aviso sale una sola vez por sesión: a la consola y,
// a través del canal que registra Overlay.jsx (Socket.IO por IP o IPC en Electron), al registro del programa, porque en vMix no
// hay consola. Nunca se mandan imágenes ni datos cargados: sólo ids de gráficas, caminos del EDITOR y conteos.
let enabled = false;
let sender = null;
const seen = new Set();

export function enableDiagnostics(send) { enabled = true; sender = send || null; }

export function diagInfo(message) {
  if (!enabled) return;
  console.info(`[overlay] ${message}`);
  try { if (sender) sender(String(message).slice(0, 300)); } catch { /* sin canal: queda solo en consola */ }
}

export function diagOnce(key, message) {
  if (!enabled || seen.has(key)) return;
  seen.add(key);
  diagInfo(message);
}
