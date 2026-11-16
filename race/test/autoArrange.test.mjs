// Acomodo automático de gráficas superpuestas (utils/autoArrange.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeGraphics, rectsOverlap } from '../src/utils/autoArrange.js';

const canvas = { width: 1920, height: 1080 };

test('sin superposición no se mueve nada', () => {
  const out = arrangeGraphics([
    { id: 'a', x: 20, y: 20, w: 300, h: 200, since: 1 },
    { id: 'b', x: 500, y: 20, w: 300, h: 200, since: 2 }
  ], canvas);
  assert.deepEqual(out, { a: { dx: 0, dy: 0 }, b: { dx: 0, dy: 0 } });
});

test('la última en salir se corre al lado libre más cercano, pegada a la otra', () => {
  const out = arrangeGraphics([
    { id: 'tower', x: 20, y: 100, w: 320, h: 600, since: 1 },
    { id: 'notice', x: 300, y: 300, w: 400, h: 120, since: 2 }
  ], canvas);
  assert.deepEqual(out.tower, { dx: 0, dy: 0 });
  // A la derecha de la torre (340 + 12 de separación) es lo más cerca: 52 px
  assert.deepEqual(out.notice, { dx: 52, dy: 0 });
});

test('el resultado no se pisa con ninguna y queda dentro de la pantalla', () => {
  const items = [
    { id: 'a', x: 800, y: 400, w: 300, h: 200, since: 1 },
    { id: 'b', x: 850, y: 450, w: 300, h: 200, since: 2 },
    { id: 'c', x: 820, y: 420, w: 200, h: 100, since: 3 }
  ];
  const out = arrangeGraphics(items, canvas);
  const moved = items.map(it => ({ x: it.x + out[it.id].dx, y: it.y + out[it.id].dy, w: it.w, h: it.h }));
  for (let i = 0; i < moved.length; i++) {
    for (let j = i + 1; j < moved.length; j++) assert.equal(rectsOverlap(moved[i], moved[j]), false, `${i} y ${j} se pisan`);
    assert.ok(moved[i].x >= 0 && moved[i].y >= 0 && moved[i].x + moved[i].w <= 1920 && moved[i].y + moved[i].h <= 1080);
  }
});

test('no se aleja más del máximo: si no hay lugar cerca, se queda', () => {
  const out = arrangeGraphics([
    { id: 'big', x: 0, y: 0, w: 1900, h: 1000, since: 1 },
    { id: 'small', x: 900, y: 500, w: 200, h: 100, since: 2 }
  ], canvas, { maxShift: 300 });
  assert.deepEqual(out.small, { dx: 0, dy: 0 });
});

test('una gráfica fija (tira de todo el ancho) nunca se mueve aunque haya salido después', () => {
  const out = arrangeGraphics([
    { id: 'notice', x: 700, y: 950, w: 400, h: 100, since: 1 },
    { id: 'ticker', x: 0, y: 1000, w: 1920, h: 80, since: 2, fixed: true }
  ], canvas);
  assert.deepEqual(out.ticker, { dx: 0, dy: 0 });
  assert.equal(out.notice.dx, 0);
  assert.ok(out.notice.dy < 0, 'el aviso sube por encima de la tira');
});
