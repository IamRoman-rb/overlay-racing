import { bridge } from './bridge';

// Diagnóstico del overlay al aire (no de las vistas previas del panel). Cada aviso sale una sola vez por sesión: a la consola
// y, si el overlay está abierto por IP (vMix / OBS en otra PC), también al registro del programa, porque en vMix no hay consola.
// Nunca se mandan imágenes ni datos cargados: sólo ids de gráficas, caminos del EDITOR y conteos.
let enabled = false;
const seen = new Set();

export function enableDiagnostics() { enabled = true; }

export function diagOnce(key, message) {
  if (!enabled || seen.has(key)) return;
  seen.add(key);
  console.warn(`[overlay] ${message}`);
  bridge.diag(message);
}

// Para avisos que se repiten sólo cuando cambia algo (por ejemplo, la configuración recibida)
export function diagInfo(message) {
  if (!enabled) return;
  console.info(`[overlay] ${message}`);
  bridge.diag(message);
}
