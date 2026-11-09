'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RaceAnalyzer, applyCorrections, detectCategoryName, isQualifyingSession, timeToSeconds, formatSeconds
} = require('../src/scripts/raceData.cjs');

const drv = (pos, number, name, extra = {}) => ({ pos: String(pos), number: String(number), name, laps: '0', lastLap: '-', bestLap: '-', diff: '-', totalTime: '-', make: '', ...extra });

test('timeToSeconds / formatSeconds', () => {
  assert.equal(timeToSeconds('1:23.456'), 83.456);
  assert.equal(timeToSeconds('+1.5'), 1.5);
  assert.equal(timeToSeconds('1:02:03.000'), 3723);
  assert.equal(timeToSeconds('1 LAP'), null);
  assert.equal(timeToSeconds('-'), null);
  assert.equal(formatSeconds(83.456), '1:23.456');
  assert.equal(formatSeconds(3723.5), '1:02:03.500');
  assert.equal(formatSeconds(59.9999), '1:00.000');
});

test('detectCategoryName', () => {
  assert.equal(detectCategoryName({ name: '125cc 4T Libre - 1era Manga' }, []), '125cc 4T Libre');
  assert.equal(detectCategoryName({ name: 'TC2000 Carrera 1' }, []), 'TC2000');
  assert.equal(detectCategoryName({ name: 'Turismo Nacional Clase 3 - Clasificación' }, []), 'Turismo Nacional Clase 3');
  assert.equal(detectCategoryName({ name: '1era Serie - Fórmula 4' }, []), 'Fórmula 4');
  assert.equal(detectCategoryName({ name: 'Sesión' }, [drv(1, 1, 'A', { make: 'GT3' }), drv(2, 2, 'B', { make: 'GT3' })]), 'GT3');
  assert.equal(detectCategoryName({ name: '' }, [drv(1, 1, 'A', { make: 'GT3' }), drv(2, 2, 'B', { make: 'GT4' })]), '');
  assert.equal(detectCategoryName({ name: '' }, []), '');
});

test('isQualifyingSession', () => {
  assert.equal(isQualifyingSession({ name: 'TC - Clasificación' }), true);
  assert.equal(isQualifyingSession({ name: '125cc Libre - 1era Manga' }), false);
  assert.equal(isQualifyingSession({ name: 'Entrenamiento 2' }), true);
  assert.equal(isQualifyingSession({ name: 'Final', sortMode: 'qualifying' }), true);
  // Palabras del nombre de la categoría no cuentan como tipo de sesión
  assert.equal(isQualifyingSession({ name: 'GT Series - Clasificación' }), true);
  assert.equal(isQualifyingSession({ name: 'GT Series - Carrera 1' }), false);
  assert.equal(isQualifyingSession({ name: 'Fórmula Libre - Entrenamiento 2' }), true);
});

test('applyCorrections: nombre, penalización de tiempo y DSQ', () => {
  const list = [
    drv(1, 10, 'Uno', { laps: '10', totalTime: '15:00.000' }),
    drv(2, 20, 'Dos', { laps: '10', totalTime: '15:02.000' }),
    drv(3, 30, 'Tres', { laps: '10', totalTime: '15:04.000' }),
    drv(4, 40, 'Cuatro', { laps: '9', totalTime: '15:01.000', diff: '+1 LAP' })
  ];
  const out = applyCorrections(list, { 10: { timePenalty: 3 }, 30: { name: 'Tres Bien' }, 40: { dsq: true } });
  assert.deepEqual(out.map(d => d.number), ['20', '10', '30', '40']);
  assert.deepEqual(out.map(d => d.pos), ['1', '2', '3', 'DSQ']);
  assert.equal(out[1].totalTime, '15:03.000');
  assert.equal(out[1].penaltySeconds, 3);
  assert.equal(out[1].diff, '+1.000');
  assert.equal(out[2].name, 'Tres Bien');
  assert.equal(out[0].diff, '-');
  // Volver a procesar lo ya corregido no aplica la penalización dos veces
  const again = applyCorrections(out, { 10: { timePenalty: 3 }, 30: { name: 'Tres Bien' }, 40: { dsq: true } });
  assert.equal(again.find(d => d.number === '10').totalTime, '15:03.000');
  // Sin correcciones vuelve todo a la fuente
  const clean = applyCorrections(out, {});
  assert.deepEqual(clean.map(d => d.number), ['10', '20', '30', '40']);
  assert.equal(clean[2].name, 'Tres');
});

test('applyCorrections: en clasificación la penalización de tiempo no reordena', () => {
  const list = [drv(1, 1, 'A', { bestLap: '1:20.000' }), drv(2, 2, 'B', { bestLap: '1:21.000' })];
  const out = applyCorrections(list, { 1: { timePenalty: 5 } }, { qualifying: true });
  assert.deepEqual(out.map(d => d.number), ['1', '2']);
  assert.equal(out[0].penaltySeconds, undefined);
});

test('RaceAnalyzer: grilla, posiciones ganadas, clases y categoría', () => {
  const a = new RaceAnalyzer();
  const session = { name: 'GT - Carrera 1' };
  const grid = [drv(1, 1, 'A', { make: 'GT3' }), drv(2, 2, 'B', { make: 'GT4' }), drv(3, 3, 'C', { make: 'GT3' })];
  let r = a.update({ session, drivers: grid }, { now: 0 });
  assert.equal(r.leaderboard.session.detectedCategory, 'GT');
  assert.equal(r.leaderboard.session.multiclass, true);
  assert.deepEqual(r.leaderboard.session.classes, ['GT3', 'GT4']);

  const lap1 = [
    drv(1, 3, 'C', { make: 'GT3', laps: '1', totalTime: '1:30.000', lastLap: '1:30.000' }),
    drv(2, 1, 'A', { make: 'GT3', laps: '1', totalTime: '1:31.000', lastLap: '1:31.000' }),
    drv(3, 2, 'B', { make: 'GT4', laps: '1', totalTime: '1:32.000', lastLap: '1:32.000' })
  ];
  r = a.update({ session, drivers: lap1 }, { now: 90000 });
  const byNum = Object.fromEntries(r.leaderboard.drivers.map(d => [d.number, d]));
  assert.equal(byNum['3'].posGain, 2);
  assert.equal(byNum['1'].posGain, -1);
  assert.equal(byNum['2'].posGain, -1);
  assert.equal(byNum['3'].classPos, 1);
  assert.equal(byNum['3'].classLeader, true);
  assert.equal(byNum['1'].classPos, 2);
  assert.equal(byNum['2'].classLeader, true);

  const off = a.update({ session, drivers: lap1 }, { now: 91000, multiclassMode: 'off' });
  assert.equal(off.leaderboard.session.multiclass, false);
  assert.equal(off.leaderboard.drivers[0].classPos, null);
});

test('RaceAnalyzer: brecha vuelta a vuelta y alertas', () => {
  const a = new RaceAnalyzer();
  const session = { name: 'Carrera' };
  const mk = (lap, tA, tB, lastA, lastB) => ([
    drv(1, 7, 'Siete', { laps: String(lap), totalTime: formatSeconds(tA), lastLap: formatSeconds(lastA), bestLap: formatSeconds(lastA) }),
    drv(2, 9, 'Nueve', { laps: String(lap), totalTime: formatSeconds(tB), lastLap: formatSeconds(lastB), bestLap: formatSeconds(lastB) })
  ]);
  a.update({ session, drivers: mk(0, 0, 0, 0, 0).map(d => ({ ...d, totalTime: '-', lastLap: '-', bestLap: '-' })) }, { now: 0 });
  let tA = 0; let tB = 2;
  for (let lap = 1; lap <= 5; lap++) {
    tA += 90; tB += 89.5; // el 9 descuenta medio segundo por vuelta
    a.update({ session, drivers: mk(lap, tA, tB, 90, 89.5) }, { now: lap * 90000 });
  }
  const g = a.getGapSeries('7', '9');
  assert.equal(g.series.length, 5);
  assert.equal(g.current, -0.5 + 0 + 0); // 2 - 5*0.5 = -0.5 -> ya lo pasó en tiempo
  assert.equal(g.rate, -0.5);

  // Cambio de líder confirmado en 2 lecturas
  const swapped = mk(6, tA + 92, tB + 89, 92, 89).reverse().map((d, i) => ({ ...d, pos: String(i + 1) }));
  let r = a.update({ session, drivers: swapped }, { now: 6 * 90000 });
  assert.equal(r.newAlerts.filter(x => x.type === 'leaderChange').length, 0);
  r = a.update({ session, drivers: swapped }, { now: 6 * 90000 + 1000 });
  const lc = r.newAlerts.find(x => x.type === 'leaderChange');
  assert.ok(lc);
  assert.equal(lc.number, '9');
  assert.equal(lc.prevNumber, '7');

  // Reprocesar (por ejemplo al cargar una corrección) no genera alertas aunque cambie el líder
  const back = mk(6, tA + 92, tB + 89, 92, 89);
  r = a.update({ session, drivers: back }, { now: 6 * 90000 + 1500, reprocess: true });
  r = a.update({ session, drivers: back }, { now: 6 * 90000 + 1600, reprocess: true });
  assert.equal(r.newAlerts.length, 0);
  a.update({ session, drivers: swapped }, { now: 6 * 90000 + 1700, reprocess: true });

  // Vuelta rápida nueva
  const faster = swapped.map(d => d.number === '9' ? { ...d, bestLap: '1:28.000' } : d);
  r = a.update({ session, drivers: faster }, { now: 6 * 90000 + 2000 });
  assert.ok(r.newAlerts.find(x => x.type === 'fastestLap' && x.number === '9'));

  // Cambio de bandera
  r = a.update({ session: { ...session, flag: 'yellow' }, drivers: faster }, { now: 6 * 90000 + 3000 });
  assert.ok(r.newAlerts.find(x => x.type === 'flag' && x.flag === 'yellow'));
});

test('RaceAnalyzer: posible abandono', () => {
  const a = new RaceAnalyzer();
  const session = { name: 'Carrera' };
  const base = (lapA, lapB) => [
    drv(1, 1, 'A', { laps: String(lapA), totalTime: formatSeconds(lapA * 60 || 0.001), lastLap: '1:00.000' }),
    drv(2, 2, 'B', { laps: String(lapB), totalTime: formatSeconds(lapB * 61 || 0.001), lastLap: '1:01.000' })
  ];
  a.update({ session, drivers: base(0, 0) }, { now: 0 });
  a.update({ session, drivers: base(1, 1) }, { now: 61000 });
  a.update({ session, drivers: base(2, 2) }, { now: 122000 });
  let stopped = [];
  for (let lap = 3; lap <= 6; lap++) {
    const r = a.update({ session, drivers: base(lap, 2) }, { now: lap * 60000 + 2000 });
    stopped = stopped.concat(r.newAlerts.filter(x => x.type === 'stopped'));
  }
  assert.equal(stopped.length, 1);
  assert.equal(stopped[0].number, '2');
});

test('RaceAnalyzer: sectores y vuelta teórica', () => {
  const a = new RaceAnalyzer();
  const session = { name: 'Clasificación' };
  a.update({ session, drivers: [drv(1, 1, 'A', { sector1: '30.000', sector2: '31.000', sector3: '32.000' }), drv(2, 2, 'B', { sector1: '29.500', sector2: '31.500', sector3: '32.500' })] }, { now: 0 });
  const r = a.update({ session, drivers: [drv(1, 1, 'A', { sector1: '30.200', sector2: '30.900', sector3: '' }), drv(2, 2, 'B', { sector1: '29.500', sector2: '31.500', sector3: '32.500' })] }, { now: 1000 });
  const A = r.leaderboard.drivers[0];
  assert.deepEqual(A.sectorColors, ['yellow', 'purple', '']);
  assert.equal(A.theoreticalBest, '1:32.900');
  assert.equal(r.leaderboard.session.idealLap, '1:32.400');
  assert.equal(r.leaderboard.session.qualifying, true);
});
