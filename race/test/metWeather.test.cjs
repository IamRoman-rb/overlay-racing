const test = require('node:test');
const assert = require('node:assert/strict');
const { trimMet, createMetClient } = require('../src/scripts/metWeather.cjs');

const sample = (temp) => ({
  properties: {
    meta: { updated_at: '2026-11-20T13:17:01Z' },
    timeseries: [0, 1, 2].map(h => ({
      time: `2026-11-20T1${4 + h}:00:00Z`,
      data: {
        instant: { details: { air_temperature: temp + h, apparent_air_temperature: temp, wind_speed: 2.5, wind_from_direction: 290, relative_humidity: 49, cloud_area_fraction: 11.7 } },
        next_1_hours: { summary: { symbol_code: 'clearsky_day' }, details: { precipitation_amount: 0.4 } },
        next_6_hours: { summary: { symbol_code: 'rainshowers_day' }, details: { precipitation_amount: 2.8 } }
      }
    }))
  }
});

const fakeFetch = (calls, fail = () => false) => async (url, opts) => {
  calls.push({ url, ua: opts.headers['User-Agent'] });
  if (fail(url)) return { ok: false, status: 500, headers: { get: () => null } };
  return { ok: true, status: 200, headers: { get: (h) => (h === 'expires' ? 'Fri, 20 Nov 2099 14:53:42 GMT' : null) }, json: async () => sample(20) };
};
const noSleep = { sleep: async () => {}, gapMs: 0 };

test('MET: recorta la respuesta a lo que usa el programa', () => {
  const r = trimMet(sample(25), 2);
  assert.equal(r.series.length, 2);
  assert.deepEqual(r.series[0], { time: '2026-11-20T14:00:00Z', t: 25, at: 25, ws: 2.5, wd: 290, rh: 49, cloud: 11.7, p1: 0.4, p6: 2.8, s1: 'clearsky_day', s6: 'rainshowers_day' });
  assert.deepEqual(trimMet(null).series, []);
});

test('MET: User-Agent propio, 4 decimales y caché hasta el Expires', async () => {
  const calls = [];
  const met = createMetClient({ version: '3.1.31', fetchImpl: fakeFetch(calls), ...noSleep });
  const out = await met.forecast([{ lat: -34.694312, lon: -58.459377 }, { lat: -34.7, lon: -58.5 }], { complete: true });
  assert.equal(out.length, 2);
  assert.equal(calls[0].ua, 'OverlayRacing/3.1.31 overlayracing.site');
  assert.match(calls[0].url, /complete\?lat=-34\.6943&lon=-58\.4594$/);
  await met.forecast([{ lat: -34.694312, lon: -58.459377 }], { complete: true });
  assert.equal(calls.length, 2, 'el segundo pedido sale de la caché');
});

test('MET: puntos que fallan quedan en null; si fallan todos, error', async () => {
  const calls = [];
  const met = createMetClient({ fetchImpl: fakeFetch(calls, (u) => u.includes('lat=1')), ...noSleep });
  const out = await met.forecast([{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }]);
  assert.equal(out[0], null);
  assert.equal(out[1].series.length, 3);
  const bad = createMetClient({ fetchImpl: fakeFetch([], () => true), ...noSleep });
  await assert.rejects(() => bad.forecast([{ lat: 1, lon: 1 }]), /HTTP 500/);
  await assert.rejects(() => bad.forecast([]), /Sin coordenadas/);
});
