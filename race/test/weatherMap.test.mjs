import test from 'node:test';
import assert from 'node:assert/strict';
import {
  symbolToWmo, solarElevation, estimateRadiation, weatherFromMet, rainInfo, rainText,
  mapBox, gridPoints, gridFromMet, sampleGrid, windComponents, projector, decodeRings, ringsInBox, pickCities,
  tempRgb, rainRgb, demoGrid, MAP_SCALES, satelliteUrl, frameLabel
} from '../src/utils/weatherMap.js';

test('símbolos de MET -> códigos WMO', () => {
  assert.equal(symbolToWmo('clearsky_day'), 0);
  assert.equal(symbolToWmo('partlycloudy_night'), 2);
  assert.equal(symbolToWmo('lightrainshowers_day'), 80);
  assert.equal(symbolToWmo('heavyrain'), 65);
  assert.equal(symbolToWmo('rainandthunder'), 95);
  assert.equal(symbolToWmo('snow'), 73);
  assert.equal(symbolToWmo(null), null);
});

test('sol: alto al mediodía de verano, bajo el horizonte de noche', () => {
  // Buenos Aires, 21 de diciembre ~13:00 hora local (16:00 UTC): el sol está casi en el cenit
  assert.ok(solarElevation(-34.6, -58.4, new Date('2026-12-21T16:00:00Z')) > 75);
  assert.ok(solarElevation(-34.6, -58.4, new Date('2026-12-21T05:00:00Z')) < 0);
  const clear = estimateRadiation(-34.6, -58.4, new Date('2026-12-21T16:00:00Z'), 0);
  assert.ok(clear > 900 && clear < 1100, String(clear));
  assert.ok(estimateRadiation(-34.6, -58.4, new Date('2026-12-21T16:00:00Z'), 100) < clear * 0.3);
  assert.equal(estimateRadiation(-34.6, -58.4, new Date('2026-12-21T05:00:00Z'), 0), 0);
});

const series = (t0) => Array.from({ length: 8 }, (_, h) => ({
  time: new Date(Date.UTC(2026, 10, 20, 14 + h)).toISOString().replace('.000', ''),
  t: t0 + h, at: null, ws: 5, wd: 270, rh: 50, cloud: 20, p1: h === 2 ? 1.2 : 0, p6: 2.8, s1: 'clearsky_day', s6: 'rainshowers_day'
}));

test('clima puntual desde MET', () => {
  const wd = weatherFromMet({ series: series(25) }, { lat: -34.69, lon: -58.46, now: Date.UTC(2026, 10, 20, 14, 10), formatTime: (iso) => iso.slice(11, 16) });
  assert.equal(wd.temp, 25);
  assert.equal(wd.windSpeed, 18);
  assert.equal(wd.weathercode, 0);
  assert.equal(wd.precip6h, 2.8);
  assert.equal(wd.forecast.length, 6);
  assert.equal(wd.forecast[1].time, '16:00');
  assert.equal(wd.forecast[1].precip, 1.2);
  assert.ok(Number.isFinite(wd.feelsLike));
  assert.ok(wd.radiation > 500);
  assert.equal(wd.source, 'met');
  assert.throws(() => weatherFromMet({ series: [] }));
});

test('lluvia: mm de MET, % de los datos viejos', () => {
  assert.deepEqual(rainInfo({ precip6h: 2.84 }), { value: 2.8, unit: 'mm', wet: true });
  assert.deepEqual(rainInfo({ precipProb: 70 }), { value: 70, unit: '%', wet: true });
  assert.equal(rainInfo({}), null);
  assert.equal(rainText({ precip6h: 0.4 }), '0,4 mm');
  assert.equal(rainText({}), '-');
});

test('zona del mapa y grilla', () => {
  const box = mapBox(-34.69, -58.46, 'province');
  assert.ok(box.north > -34.69 && box.south < -34.69 && box.west < -58.46 && box.east > -58.46);
  // 16:10 en km: el ancho en grados es mayor que el alto, corregido por la latitud
  const wKm = (box.east - box.west) * 111.32 * Math.cos(34.69 * Math.PI / 180);
  const hKm = (box.north - box.south) * 111.32;
  assert.ok(Math.abs(wKm / hKm - 1.6) < 0.01);
  const pts = gridPoints(box, 4, 3);
  assert.equal(pts.length, 12);
  assert.deepEqual([pts[0].lat, pts[0].lon], [box.north, box.west]);
  assert.deepEqual([pts[11].lat, pts[11].lon], [box.south, box.east]);
  const pj = projector(box, 800, 500);
  assert.ok(Math.abs(pj.x(-58.46) - 400) < 0.5 && Math.abs(pj.y(-34.69) - 250) < 0.5);
});

test('grilla desde MET: cuadros por hora, huecos rellenados', () => {
  const box = mapBox(-34.69, -58.46, 'region');
  const list = Array.from({ length: 6 }, (_, i) => (i === 4 ? null : { series: series(20 + i) }));
  const g = gridFromMet(list, { box, nx: 3, ny: 2, scale: 'region', now: Date.UTC(2026, 10, 20, 14), formatTime: (iso) => iso.slice(11, 16) });
  assert.equal(g.frames.length, 7);
  assert.equal(g.frames[0].time, '14:00');
  assert.equal(g.frames[0].temp[0], 20);
  assert.ok(Number.isFinite(g.frames[0].temp[4]), 'el punto que falló se completa con los vecinos');
  assert.equal(g.frames[0].wind[0], 18);
  assert.match(g.frames[0].iso, /^2026-11-20T14:00/);
  assert.throws(() => gridFromMet([null], { box, nx: 3, ny: 2 }));
});

test('interpolación y viento en pantalla', () => {
  assert.equal(sampleGrid([0, 10, 20, 30], 2, 2, 0.5, 0.5), 15);
  assert.equal(sampleGrid([0, 10, 20, 30], 2, 2, 1, 1), 30);
  // Viento del oeste (270): sopla hacia el este = hacia la derecha
  const { u, v } = windComponents({ wind: [10], dir: [270] });
  assert.ok(Math.abs(u[0] - 10) < 1e-9 && Math.abs(v[0]) < 1e-9);
  const s = windComponents({ wind: [10], dir: [0] });  // del norte: hacia abajo
  assert.ok(Math.abs(s.v[0] - 10) < 1e-9);
});

test('mapa: anillos con delta, recorte y ciudades sin pisarse', () => {
  const [r] = decodeRings([[[-5846, -3469, 100, 0, 0, 100]]]);
  assert.deepEqual(Array.from(r).map(v => Math.round(v * 100) / 100), [-58.46, -34.69, -57.46, -34.69, -57.46, -33.69]);
  const box = mapBox(-34.69, -58.46, 'province');
  assert.equal(ringsInBox([r], box).length, 1);
  assert.equal(ringsInBox([new Float32Array([10, 10, 11, 10, 11, 11])], box).length, 0);
  const cities = [['Buenos Aires', -34.6, -58.4, 13000000], ['Avellaneda', -34.66, -58.36, 300000], ['Rosario', -32.95, -60.67, 1300000]];
  const picked = pickCities(cities, box, 800, 500, { max: 5 });
  assert.deepEqual(picked.map(c => c.name), ['Buenos Aires', 'Rosario'], 'Avellaneda se pisa con Buenos Aires');
});

test('colores, satélite, etiquetas y grilla de ejemplo', () => {
  assert.deepEqual(tempRgb(20), [0xd6, 0xe0, 0x4a]);
  assert.equal(rainRgb(0.05), null);
  assert.ok(rainRgb(3));
  assert.match(satelliteUrl(mapBox(-34.69, -58.46), 800, 500), /^https:\/\/gibs\.earthdata\.nasa\.gov\/.*BlueMarble.*WIDTH=800&HEIGHT=500/);
  assert.match(frameLabel({ iso: '2026-11-21T18:00:00Z', time: '15:00' }), /^Sábado 21 · 15:00$/);
  const d = demoGrid();
  const { nx, ny } = MAP_SCALES.province;
  assert.equal(d.frames[0].temp.length, nx * ny);
  assert.ok(d.frames.some(f => f.rain.some(v => v > 0)));
});

test('valores exactos en el circuito y las ciudades', async () => {
  const { spotsFromMet } = await import('../src/utils/weatherMap.js');
  const frames = [{ iso: '2026-11-20T14:00:00Z' }, { iso: '2026-11-20T15:00:00Z' }];
  const sp = spotsFromMet([{ name: 'Santiago', lat: -33.45, lon: -70.66 }, { name: 'X', lat: 0, lon: 0 }], [{ series: series(24) }, null], frames);
  assert.equal(sp.length, 1);
  assert.deepEqual(sp[0].temp, [24, 25]);
  assert.deepEqual(sp[0].wind, [18, 18]);
});
