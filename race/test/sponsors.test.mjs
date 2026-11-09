import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlacement, placementRect, rotationIndex, typeFromFile } from '../src/utils/sponsors.js';

const config = {
  sponsors: [{ id: 'a', file: 'sp_a.png' }, { id: 'b', file: 'sp_b.mp4' }],
  sponsorPlacements: {
    tower: { ids: ['a', 'zz', 'b'], dx: 10, dy: -50, w: 100, h: 40, interval: 5 },
    ticker: { ids: ['zz'] },
    battle: { ids: ['a'], w: 99999, interval: 0 }
  }
};

test('getPlacement filtra sponsors inexistentes y acota valores', () => {
  assert.deepEqual(getPlacement(config, 'tower').ids, ['a', 'b']);
  assert.equal(getPlacement(config, 'ticker'), null);
  assert.equal(getPlacement(config, 'nada'), null);
  const b = getPlacement(config, 'battle');
  assert.equal(b.w, 1920);
  assert.equal(b.interval, 2);
  assert.equal(b.dy, -76);
});

test('placementRect aplica la posición y la escala de la gráfica', () => {
  const p = getPlacement(config, 'tower');
  assert.deepEqual(placementRect(p, { x: 100, y: 200, scale: 2 }), { left: 120, top: 100, width: 200, height: 80 });
  assert.deepEqual(placementRect(p, null), { left: 10, top: -50, width: 100, height: 40 });
});

test('rotationIndex rota con el reloj', () => {
  assert.equal(rotationIndex(1, 5, 123456), 0);
  assert.equal(rotationIndex(3, 5, 0), 0);
  assert.equal(rotationIndex(3, 5, 5000), 1);
  assert.equal(rotationIndex(3, 5, 15000), 0);
});

test('typeFromFile distingue video de imagen', () => {
  assert.equal(typeFromFile('sp_x.webm'), 'video');
  assert.equal(typeFromFile('sp_x.SVG'), 'image');
});
