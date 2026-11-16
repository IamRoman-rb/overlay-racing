import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlacement, placementRect, rotationIndex, typeFromFile, sponsorTransparent, moveSponsor, liveItems, snapBox, stepDuration, VIDEO_SAFETY_MS, normalizeCrop, cropLayout, removeBackground, alphaBounds } from '../src/utils/sponsors.js';

// Imagen de prueba: fondo blanco, cuadrado rojo en el medio con un "agujero" blanco adentro
function logo(w = 20, h = 10) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const inRed = x >= 5 && x < 15 && y >= 2 && y < 8;
      const hole = x >= 9 && x < 11 && y >= 4 && y < 6;
      const c = inRed && !hole ? [200, 20, 20] : [250, 250, 250];
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  return d;
}

test('removeBackground borra el fondo que toca los bordes pero no el blanco de adentro', () => {
  const d = logo();
  const cleared = removeBackground(d, 20, 10, 30);
  assert.ok(cleared > 0);
  assert.equal(d[3], 0);                          // esquina: transparente
  assert.equal(d[(5 * 20 + 7) * 4 + 3], 255);     // rojo: queda
  assert.equal(d[(4 * 20 + 9) * 4 + 3], 255);     // agujero blanco interior: queda
  assert.deepEqual(alphaBounds(d, 20, 10), { x: 5 / 20, y: 2 / 10, w: 10 / 20, h: 6 / 10 });
});

test('removeBackground no hace nada si los bordes ya son transparentes', () => {
  const d = new Uint8ClampedArray(4 * 4 * 4);
  assert.equal(removeBackground(d, 4, 4, 40), 0);
  assert.equal(alphaBounds(d, 4, 4), null);
});

test('normalizeCrop y cropLayout', () => {
  assert.equal(normalizeCrop({ x: 0, y: 0, w: 1, h: 1 }), null);
  assert.equal(normalizeCrop({ x: 'a' }), null);
  assert.deepEqual(normalizeCrop({ x: 0.5, y: 0.5, w: 0.9, h: 0.2 }), { x: 0.5, y: 0.5, w: 0.5, h: 0.2 });
  // Imagen 400x200, recorte de la mitad derecha (200x200) en un recuadro de 100x50 -> entra a 50x50 centrado
  const l = cropLayout(100, 50, 400, 200, { x: 0.5, y: 0, w: 0.5, h: 1 }, 'contain');
  assert.deepEqual(l.clip, { left: 25, top: 0, width: 50, height: 50 });
  assert.deepEqual(l.media, { left: -50, top: 0, width: 100, height: 50 });
  // cover: llena el recuadro
  const c = cropLayout(100, 50, 400, 200, { x: 0.5, y: 0, w: 0.5, h: 1 }, 'cover');
  assert.deepEqual(c.clip, { left: 0, top: 0, width: 100, height: 50 });
  assert.equal(c.media.width, 200);
});

test('sponsorTransparent: PNG/SVG/WebP/GIF sin caja, JPG y video con caja', () => {
  assert.equal(sponsorTransparent({ type: 'image', file: 'sp_a.png' }), true);
  assert.equal(sponsorTransparent({ type: 'image', file: 'sp_a.jpg' }), false);
  assert.equal(sponsorTransparent({ type: 'video', file: 'sp_a.webm' }), false);
});

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

test('moveSponsor ordena y cambia de grupo', () => {
  const list = [{ id: 'a' }, { id: 'b', groupId: 'g' }, { id: 'c' }, { id: 'd', groupId: 'g' }];
  assert.deepEqual(moveSponsor(list, 'c', 'a', null).map(s => s.id), ['c', 'a', 'b', 'd']);
  const toG = moveSponsor(list, 'a', null, 'g');
  assert.deepEqual(toG.map(s => s.id), ['b', 'c', 'd', 'a']);
  assert.equal(toG.find(s => s.id === 'a').groupId, 'g');
  const out = moveSponsor(list, 'b', null, null);
  assert.equal(out.find(s => s.id === 'b').groupId, undefined);
  assert.deepEqual(out.map(s => s.id), ['a', 'c', 'b', 'd']);
  assert.equal(moveSponsor(list, 'zz', 'a', null), list);
});

test('liveItems y getPlacement respetan activos y grupos', () => {
  const cfg = {
    sponsors: [{ id: 'a', file: 'sp_a.png', groupId: 'g' }, { id: 'b', file: 'sp_b.png', groupId: 'g', active: false }, { id: 'c', file: 'sp_c.png' }],
    sponsorPlacements: { tower: { groups: ['g'], ids: ['c'] }, ticker: { ids: ['b'] } }
  };
  assert.deepEqual(liveItems(cfg, { rotate: true }).map(s => s.id), ['a', 'c']);
  assert.deepEqual(liveItems(cfg, { rotate: true, groupId: 'g' }).map(s => s.id), ['a']);
  assert.deepEqual(liveItems(cfg, { rotate: false, sponsorId: 'b' }).map(s => s.id), ['b']);
  assert.deepEqual(getPlacement(cfg, 'tower').ids, ['a', 'c']);
  assert.equal(getPlacement(cfg, 'ticker'), null);
});

test('snapBox pega bordes y centros a las guías cercanas', () => {
  // Gráfica de 0 a 320: el recuadro de 100 de ancho con el borde izquierdo en 4 se pega a 0
  let r = snapBox({ x: 4, y: -70, w: 100, h: 60 }, [0, 160, 320], [0, 650], 10);
  assert.equal(r.box.x, 0); assert.deepEqual(r.lines.x, [0]);
  // Centro 113 -> 160 está lejos; borde de abajo -10 se pega a 0 (queda apoyado arriba de la gráfica)
  r = snapBox({ x: 40, y: -66, w: 100, h: 60 }, [0, 160, 320], [0, 650], 10);
  assert.equal(r.box.y, -60); assert.equal(r.box.x, 40); assert.deepEqual(r.lines.y, [0]);
  // Centro 158 -> 160
  r = snapBox({ x: 108, y: 300, w: 100, h: 60 }, [0, 160, 320], [], 10);
  assert.equal(r.box.x, 110);
  // Agrandar: el borde derecho 315 se pega a 320
  r = snapBox({ x: 215, y: 0, w: 100, h: 60 }, [0, 160, 320], [], 10, 'size');
  assert.equal(r.box.w, 105); assert.equal(r.box.x, 215);
});

test('stepDuration: imágenes por segundos, videos hasta que terminan', () => {
  assert.equal(stepDuration({ type: 'image' }, 8), 8000);
  assert.equal(stepDuration({ type: 'video' }, 8), VIDEO_SAFETY_MS);
  assert.equal(stepDuration(null, 0), 6000);
});
