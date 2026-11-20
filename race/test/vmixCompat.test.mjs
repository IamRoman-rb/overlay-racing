import test from 'node:test';
import assert from 'node:assert/strict';
import { insetBox, expandInset } from '../src/utils/insetBox.js';
import { detectCurves } from '../src/utils/trackPath.js';

test('insetBox expande el atajo de CSS como el navegador', () => {
  assert.deepEqual(insetBox(0), { top: 0, right: 0, bottom: 0, left: 0 });
  assert.deepEqual(insetBox('-4px'), { top: '-4px', right: '-4px', bottom: '-4px', left: '-4px' });
  assert.deepEqual(insetBox('6% 0 0 0'), { top: '6%', right: '0', bottom: '0', left: '0' });
  assert.deepEqual(insetBox('0 -30%'), { top: '0', right: '-30%', bottom: '0', left: '-30%' });
  assert.deepEqual(insetBox('12% -14% 0'), { top: '12%', right: '-14%', bottom: '0', left: '-14%' });
});

test('expandInset saca `inset` (Chrome 77 de vMix 23 no lo conoce) y respeta lo demás', () => {
  assert.deepEqual(expandInset({ inset: '6% 0 0 0', zIndex: -1 }), { top: '6%', right: '0', bottom: '0', left: '0', zIndex: -1 });
  const plain = { left: 'auto', width: '58%' };
  assert.equal(expandInset(plain), plain);
  assert.equal(expandInset(undefined), undefined);
});

test('detectCurves: un cuadrado tiene 4 curvas, todas para el mismo lado', () => {
  const sq = [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }];
  const curves = detectCurves(sq, 1);
  assert.equal(curves.length, 4);
  assert.equal(new Set(curves.map(c => c.side)).size, 1);
  curves.forEach(c => { assert.ok(c.t >= 0 && c.t < 1); assert.equal(c.auto, true); });
  for (let i = 1; i < curves.length; i++) assert.ok(curves[i].t > curves[i - 1].t);
});

test('detectCurves: sin trazado no hay curvas', () => {
  assert.deepEqual(detectCurves([], 1.5), []);
  assert.deepEqual(detectCurves([{ x: 1, y: 1 }, { x: 2, y: 2 }], 1.5), []);
});
