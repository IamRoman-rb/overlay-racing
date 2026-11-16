// Utilidades puras del frontend de carrera que se agregaron/movieron al dividir el bundle y corregir el lint.
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldReloadAfterChunkError, installChunkReload, RELOAD_GUARD_KEY, RELOAD_GUARD_MS } from '../src/utils/chunkReload.js';
import { driverPhotoUrl } from '../src/utils/useDriverPhoto.js';
import { photosEnabled } from '../src/utils/photos.js';
import { getWeatherVisual, getWindDirLabel } from '../src/utils/weather.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test('chunk faltante: recarga la primera vez y no vuelve a recargar dentro de la ventana de 30 s', () => {
  const storage = memoryStorage();
  assert.equal(shouldReloadAfterChunkError(storage, 1_000_000), true);
  assert.equal(storage.data[RELOAD_GUARD_KEY], '1000000');
  assert.equal(shouldReloadAfterChunkError(storage, 1_000_000 + RELOAD_GUARD_MS - 1), false);
  assert.equal(shouldReloadAfterChunkError(storage, 1_000_000 + RELOAD_GUARD_MS), true);
});

test('chunk faltante sin sessionStorage utilizable: no recarga (evita bucles)', () => {
  const broken = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(shouldReloadAfterChunkError(broken, 5), false);
});

test('installChunkReload: ante vite:preloadError recarga una sola vez y deja seguir el error después', () => {
  const listeners = {};
  let reloads = 0;
  const win = {
    sessionStorage: memoryStorage(),
    location: { reload: () => { reloads++; } },
    addEventListener: (name, fn) => { listeners[name] = fn; },
  };
  installChunkReload(win);
  const fire = () => { const ev = { prevented: false, preventDefault() { this.prevented = true; } }; listeners['vite:preloadError'](ev); return ev; };
  assert.equal(fire().prevented, true);
  assert.equal(reloads, 1);
  assert.equal(fire().prevented, false, 'el segundo error dentro de la ventana no se oculta');
  assert.equal(reloads, 1);
});

test('foto del piloto: URL del mini-servidor (8080) sólo con carpeta de fotos y número', () => {
  globalThis.window = { location: { hostname: '192.168.0.10' } };
  try {
    assert.equal(driverPhotoUrl('7', true), 'http://192.168.0.10:8080/photo/7');
    assert.equal(driverPhotoUrl(0, true), 'http://192.168.0.10:8080/photo/0', 'el auto #0 también tiene foto');
    assert.equal(driverPhotoUrl('12 B', true), 'http://192.168.0.10:8080/photo/12%20B');
    assert.equal(driverPhotoUrl('7', false), null);
    assert.equal(driverPhotoUrl(undefined, true), null);
    assert.equal(driverPhotoUrl('', true), null);
  } finally {
    delete globalThis.window;
  }
});

test('fotos por gráfica: requiere carpeta de fotos y la opción de esa gráfica', () => {
  assert.equal(photosEnabled({ photosPath: 'C:/fotos', showPhotos_ticker: true }, 'ticker'), true);
  assert.equal(photosEnabled({ photosPath: 'C:/fotos' }, 'ticker'), false);
  assert.equal(photosEnabled({ showPhotos_ticker: true }, 'ticker'), false);
  assert.equal(photosEnabled(undefined, 'ticker'), false);
});

test('clima: código de Open-Meteo a etiqueta/categoría y rumbo del viento', () => {
  assert.deepEqual(getWeatherVisual(0), { label: 'DESPEJADO', category: 'clear' });
  assert.deepEqual(getWeatherVisual(63), { label: 'LLUVIA', category: 'rain' });
  assert.deepEqual(getWeatherVisual(96), { label: 'TORMENTA', category: 'storm' });
  assert.deepEqual(getWeatherVisual(34), { label: 'DESPEJADO', category: 'clear' }, 'código desconocido');
  assert.equal(getWindDirLabel(0), 'N');
  assert.equal(getWindDirLabel(225), 'SO');
  assert.equal(getWindDirLabel(350), 'N');
  assert.equal(getWindDirLabel(null), '');
});
