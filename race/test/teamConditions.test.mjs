import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamConditions, TRACK_SAMPLES } from '../src/utils/teamFeed.js';

const config = {
  circuitName: 'AUTÓDROMO', circuitLength: '3.200', categoryName: 'TC',
  trackPath: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 50, y: 90 }, { x: 10, y: 90 }],
  trackSectors: [0.5], trackCurves: [{ id: 'a', name: 'C1', x: 90, y: 10 }], trackShade: [{ t: 0.5, w: 0.05 }],
  weatherData: { temp: 25, windSpeed: 20, windDir: 270, weathercode: 0, radiation: 900, precip6h: 0, forecast: [{ time: '15:00', temp: 26, code: 1, precip: 0 }] },
  weatherGrid: { box: { lat: 0, lon: 0, north: 1, south: -1, west: -1, east: 1 }, nx: 2, ny: 2, scale: 'region', frames: [{ time: '14:00', temp: [1, 2, 3, 4] }] }
};

test('condiciones para los equipos: trazado, viento y temperatura por punto', () => {
  const c = buildTeamConditions(config, 1.5, { now: 5 });
  assert.equal(c.v, 1);
  assert.equal(c.updatedAt, 5);
  assert.equal(c.circuit.name, 'AUTÓDROMO');
  assert.equal(c.circuit.category, 'TC');
  const tr = c.track;
  assert.equal(tr.width, 1000);
  assert.equal(tr.points.length, TRACK_SAMPLES);
  assert.equal(tr.temp.length, TRACK_SAMPLES);
  assert.equal(tr.wind.length, TRACK_SAMPLES);
  assert.ok(tr.wind.every(v => v >= -1 && v <= 1));
  assert.ok(tr.summary.max - tr.summary.min > 5, 'la sombra enfría');
  assert.equal(tr.sectors.length, 2);
  assert.equal(tr.curves[0].name, 'C1');
  assert.equal(c.weather.label, 'DESPEJADO');
  assert.equal(c.weather.forecast.length, 1);
  assert.equal(c.radar.nx, 2);
  // Sin trazado ni clima: no rompe
  const empty = buildTeamConditions({}, 1.5);
  assert.equal(empty.track, null);
  assert.equal(empty.weather, null);
  assert.equal(empty.radar, null);
  // El paquete entra cómodo en un mensaje de socket
  assert.ok(JSON.stringify(c).length < 60000);
});
