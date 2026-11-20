import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCircuitFile, parseCircuitFile, circuitFileName, CIRCUIT_FILE_KIND } from '../src/utils/circuitFile.js';

const config = {
  trackPath: [{ x: 10, y: 10 }, { x: 90.5, y: 12 }, { x: 80, y: 88.25 }, { x: 15, y: 70 }],
  trackSectors: [0.6873, 0.2685],
  trackCurves: [{ id: 'curve_1', name: 'Curva 1', x: 96.84, y: 49.67, t: 0.0639 }, { id: 'curve_2', x: 45.22, y: 20.61 }],
  trackImage: 'data:image/jpeg;base64,/9j/AAAA',
  circuitName: 'Autódromo: Zárate?', circuitCity: 'Zárate', circuitLength: 3200, circuitDirection: 'cw',
  recordTime: '1:19.600', recordDriver: 'Juan Pérez', trackMapLineColor: '#2ecc71', trackMapShowImage: true,
  relator: 'no va al archivo'
};

test('archivo de circuito: guardar y volver a cargar deja el mismo trazado', () => {
  const file = buildCircuitFile(config, new Date('2026-11-09T12:00:00Z'));
  assert.equal(file.kind, CIRCUIT_FILE_KIND);
  assert.equal(file.data.relator, undefined, 'sólo guarda lo del circuito');
  const patch = parseCircuitFile(JSON.stringify(file));
  assert.deepEqual(patch.trackPath, config.trackPath);
  assert.deepEqual(patch.trackSectors, [0.2685, 0.6873], 'sectores ordenados');
  assert.deepEqual(patch.trackCurves, config.trackCurves);
  assert.equal(patch.trackImage, config.trackImage);
  assert.equal(patch.circuitLength, '3200');
  assert.equal(patch.circuitDirection, 'cw');
  assert.equal(patch.trackMapShowImage, true);
  assert.equal(circuitFileName(config), 'Autódromo Zárate.circuito.json');
});

test('archivo de circuito: rechaza archivos que no sirven y limpia valores raros', () => {
  assert.throws(() => parseCircuitFile('no es json'), /no se pudo leer/);
  assert.throws(() => parseCircuitFile({ foo: 1 }), /no tiene un trazado/);
  assert.throws(() => parseCircuitFile({ trackPath: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }), /menos de 3/);
  const p = parseCircuitFile({ trackPath: [{ x: -5, y: 150 }, { x: '20', y: 30 }, { x: 40, y: 'abc' }, { x: 50, y: 60 }], trackImage: 'javascript:alert(1)', trackSectors: [2, 0.5, 'x'], circuitDirection: 'raro' });
  assert.deepEqual(p.trackPath, [{ x: 0, y: 100 }, { x: 20, y: 30 }, { x: 50, y: 60 }]);
  assert.equal(p.trackImage, null);
  assert.deepEqual(p.trackSectors, [0.5]);
  assert.equal(p.circuitDirection, '');
});

test('archivo de circuito: guarda el norte del mapa y las sombras (no las mediciones)', () => {
  const file = buildCircuitFile({ ...config, trackNorth: 75, trackShade: [{ t: 0.4, w: 0.05 }], trackTempPoints: [{ t: 0.1, temp: 40 }] });
  assert.equal(file.data.trackTempPoints, undefined);
  const patch = parseCircuitFile(file);
  assert.equal(patch.trackNorth, 75);
  assert.deepEqual(patch.trackShade, [{ t: 0.4, w: 0.05 }]);
  const odd = parseCircuitFile({ trackPath: config.trackPath, trackNorth: -90, trackShade: [{ t: 3 }, { t: 0.2, w: 9 }, null] });
  assert.equal(odd.trackNorth, 270);
  assert.deepEqual(odd.trackShade, [{ t: 0.2, w: 0.03 }]);
});
