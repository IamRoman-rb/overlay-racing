import test from 'node:test';
import assert from 'node:assert/strict';
import { suitColorFromPixels } from '../src/utils/suitColor.js';

// Foto sintética: fondo transparente, cara color piel arriba, traje del color pedido abajo
function photo(suit, w = 60, h = 80) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const face = y < h * 0.4 && Math.hypot(x - w / 2, y - h * 0.2) < w * 0.22;
    const body = y >= h * 0.4 && x > w * 0.1 && x < w * 0.9;
    const c = face ? [214, 160, 120, 255] : body ? [...suit, 255] : [0, 0, 0, 0];
    data.set(c, i);
  }
  return data;
}

test('color del traje', () => {
  const green = suitColorFromPixels(photo([20, 120, 50]), 60, 80);
  assert.equal(green.bg, '#147832');
  assert.equal(green.text, '#fff');
  const yellow = suitColorFromPixels(photo([250, 220, 20]), 60, 80);
  assert.equal(yellow.text, '#000');
  const black = suitColorFromPixels(photo([15, 15, 18]), 60, 80);
  assert.equal(black.bg, '#0f0f12');
  assert.equal(suitColorFromPixels(new Uint8ClampedArray(60 * 80 * 4), 60, 80), null);
});
