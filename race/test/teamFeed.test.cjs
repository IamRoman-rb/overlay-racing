const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTeamLive, createThrottle } = require('../src/scripts/teamFeed.cjs');

test('equipos en vivo: pilotos, sesión y banderas activas sin campos internos', () => {
  const lb = {
    session: { name: 'CARRERA', flag: 'green', lapsToGo: '8', detectedCategory: 'TC', classes: [], multiclass: false, bestSectors: [1, 2] },
    drivers: [{ pos: '1', number: 7, name: 'JUAN', team: 'EQ', laps: '3', lastLap: '1:20.1', bestLap: '1:19.9', gap: '', diff: '', lapProgress: { since: 12.3, lapTime: 80.1 }, onTrack: true, srcName: 'interno', brandFrom: 'x' }]
  };
  const live = buildTeamLive(lb, { now: 1000, flags: { yellow: false, red: true } });
  assert.equal(live.v, 1);
  assert.equal(live.at, 1000);
  assert.deepEqual(live.flags, ['red']);
  assert.equal(live.session.category, 'TC');
  assert.equal(live.session.bestSectors, undefined);
  const d = live.drivers[0];
  assert.equal(d.number, '7');
  assert.deepEqual(d.lapProgress, { since: 12.3, lapTime: 80.1 });
  assert.equal(d.srcName, undefined);
  assert.deepEqual(buildTeamLive(null).drivers, []);
});

test('límite de frecuencia: sale el primero y después el último de cada intervalo', () => {
  let t = 0; const timers = []; const sent = [];
  const th = createThrottle((v) => sent.push(v), 1000, { now: () => t, setTimer: (fn, ms) => { timers.push({ fn, at: t + ms }); return timers.length; }, clearTimer: () => {} });
  th('a'); th('b'); th('c');
  assert.deepEqual(sent, ['a']);
  t = 1000; timers.shift().fn();
  assert.deepEqual(sent, ['a', 'c']);
  t = 2500; th('d');
  assert.deepEqual(sent, ['a', 'c', 'd']);
});
