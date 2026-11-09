import test from 'node:test';
import assert from 'node:assert/strict';
import { trackDirection, turnAt, sectorRanges, buildTrack, trackSegment, projectTilt } from '../src/utils/trackPath.js';

// Cuadrado recorrido en sentido horario en pantalla: arriba-izq -> arriba-der -> abajo-der -> abajo-izq
const cw = [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }, { x: 20, y: 80 }];
const ccw = [...cw].reverse();

test('sentido de giro', () => {
  assert.equal(trackDirection(cw, 1), 'cw');
  assert.equal(trackDirection(ccw, 1), 'ccw');
});

test('lado de las curvas', () => {
  // En sentido horario todas las curvas son a la derecha; al revés, a la izquierda
  assert.equal(turnAt(cw, 1, 0.25), 'R');
  assert.equal(turnAt(ccw, 1, 0.25), 'L');
});

test('tramos de sector', () => {
  assert.deepEqual(sectorRanges([]), [[0, 1]]);
  assert.deepEqual(sectorRanges([0.6, 0.3]), [[0, 0.3], [0.3, 0.6], [0.6, 1]]);
});

test('segmento del trazado y perspectiva', () => {
  const tr = buildTrack(cw, { width: 300, aspect: 1 });
  const seg = trackSegment(tr, 0, 0.5);
  assert.ok(seg.length > 10);
  const p = projectTilt({ x: 150, y: 50 }, { cx: 150, cy: 100, tilt: 50 });
  assert.ok(p.y > 50 && p.y < 100); // lo de atrás se acerca al centro
});
