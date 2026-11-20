import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../src/utils/trackPath.js';
import {
  estimateTrackTemp, windClass, shadeAt, analyzeTrack, windRuns, travelReversed, heatColor, lapDist
} from '../src/utils/trackConditions.js';

// Rectángulo recorrido en sentido horario visto en pantalla: arriba hacia la derecha, después baja por la derecha
const RECT = [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 50, y: 90 }, { x: 10, y: 90 }];
const track = buildTrack(RECT, { width: 300, fit: true, aspect: 1, pad: 10 });

test('temperatura del asfalto: sol suma, viento resta, de noche queda bajo el aire', () => {
  assert.equal(estimateTrackTemp({ temp: 20 }), 19);
  const sun = estimateTrackTemp({ temp: 25, radiation: 900, windSpeed: 0 });
  assert.ok(sun > 48 && sun < 52, String(sun));
  assert.ok(estimateTrackTemp({ temp: 25, radiation: 900, windSpeed: 40 }) < sun);
  assert.equal(estimateTrackTemp({}), null);
});

test('clasificación del viento', () => {
  assert.equal(windClass(0.9), 'tail');
  assert.equal(windClass(-0.9), 'head');
  assert.equal(windClass(0.1), 'cross');
});

test('sombra con borde suave y distancia circular', () => {
  assert.equal(shadeAt([{ t: 0.5, w: 0.05 }], 0.52), 1);
  assert.equal(shadeAt([{ t: 0.5, w: 0.05 }], 0.7), 0);
  assert.equal(shadeAt([{ t: 0.98, w: 0.05 }], 0.01), 1);
  assert.ok(Math.abs(lapDist(0.95, 0.05) - 0.1) < 1e-9);
});

test('viento del oeste: la recta de arriba (hacia el este) lo tiene de cola, la de abajo de frente', () => {
  const a = analyzeTrack(track, { weatherData: { temp: 20, windSpeed: 20, windDir: 270 }, north: 0 });
  const top = a.points.filter(p => p.y < 40 && p.x > 100 && p.x < 200);
  const bottom = a.points.filter(p => p.y > track.height - 40 && p.x > 100 && p.x < 200);
  assert.ok(top.length && top.every(p => p.cls === 'tail'));
  assert.ok(bottom.length && bottom.every(p => p.cls === 'head'));
  // Con el norte de la imagen a la derecha (90°), "arriba" es el oeste: la recta de arriba va al norte -> cruzado
  const b = analyzeTrack(track, { weatherData: { temp: 20, windSpeed: 20, windDir: 270 }, north: 90 });
  assert.ok(b.points.filter(p => p.y < 40 && p.x > 100 && p.x < 200).every(p => p.cls === 'cross'));
  const runs = windRuns(a);
  assert.ok(runs.some(r => r.cls === 'tail') && runs.some(r => r.cls === 'head'));
});

test('sentido invertido da vuelta el viento', () => {
  assert.equal(travelReversed(track, 'cw'), false);
  assert.equal(travelReversed(track, 'ccw'), true);
  const a = analyzeTrack(track, { weatherData: { temp: 20, windSpeed: 20, windDir: 270 }, reverse: true });
  assert.ok(a.points.filter(p => p.y < 40 && p.x > 100 && p.x < 200).every(p => p.cls === 'head'));
});

test('sombras enfrían y las mediciones mandan', () => {
  const wd = { temp: 25, radiation: 900, windSpeed: 0 };
  const a = analyzeTrack(track, { weatherData: wd, shade: [{ t: 0.5, w: 0.05 }] });
  assert.ok(a.max - a.min > 15);
  assert.ok(Math.abs(a.cold.t - 0.5) < 0.06);
  const m = analyzeTrack(track, { weatherData: wd, tempPoints: [{ t: 0.25, temp: 40 }] });
  const at = m.points.reduce((best, p) => (lapDist(p.t, 0.25) < lapDist(best.t, 0.25) ? p : best));
  assert.ok(Math.abs(at.temp - 40) < 0.6, String(at.temp));
  assert.ok(m.measured);
  // Sin clima: la medición es el valor absoluto
  const only = analyzeTrack(track, { weatherData: {}, tempPoints: [{ t: 0.1, temp: 33 }, { t: 0.6, temp: 37 }] });
  assert.ok(only.min >= 32.9 && only.max <= 37.1);
});

test('colores', () => {
  assert.match(heatColor(0.5), /^#[0-9a-f]{6}$/);
});

test('clic en CLIMA EN PISTA: agrega y quita sombras, agrega mediciones', async () => {
  const { condClickPatch } = await import('../src/utils/trackConditions.js');
  const [k1, v1] = condClickPatch({}, 'shade', { t: 0.5 });
  assert.equal(k1, 'trackShade');
  assert.deepEqual(v1, [{ t: 0.5, w: 0.03 }]);
  assert.deepEqual(condClickPatch({ trackShade: v1 }, 'shade', { t: 0.51 })[1], []);
  const [k2, v2] = condClickPatch({}, 'temp', { t: 0.25 }, 1000);
  assert.equal(k2, 'trackTempPoints');
  assert.equal(v2[0].t, 0.25);
  assert.equal(condClickPatch({}, 'shade', null), null);
});
