// Las posiciones iniciales de las gráficas viven en dos lugares: race/main.cjs (siembra posiciones.json y responde
// a vMix/OBS) y race/src/data/defaultPositions.js (panel de control). main.cjs no puede importar el archivo de la
// interfaz porque el paquete del módulo no lo incluye, así que esta prueba verifica que las dos copias coincidan.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { defaultPositions } from '../src/data/defaultPositions.js';

const mainSource = fs.readFileSync(new URL('../main.cjs', import.meta.url), 'utf8');

function mainDefaultPositions() {
  const start = mainSource.indexOf('const defaultPositions = {');
  assert.ok(start >= 0, 'main.cjs define defaultPositions');
  const open = mainSource.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < mainSource.length; i++) {
    if (mainSource[i] === '{') depth++;
    else if (mainSource[i] === '}' && --depth === 0) return vm.runInNewContext(`(${mainSource.slice(open, i + 1)})`);
  }
  throw new Error('defaultPositions de main.cjs sin cerrar');
}

test('panel y main.cjs usan las mismas posiciones iniciales', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(mainDefaultPositions())), defaultPositions);
});

test('cada posición inicial es válida', () => {
  for (const [id, pos] of Object.entries(defaultPositions)) {
    assert.ok(Number.isFinite(pos.x) && Number.isFinite(pos.y), `${id}: x/y numéricos`);
    assert.ok(pos.scale > 0, `${id}: escala positiva`);
  }
});
