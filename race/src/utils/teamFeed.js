// PANEL DE EQUIPOS: paquete de CONDICIONES que se manda al servidor (main.cjs > push-equipos-conditions) para que los
// equipos lo vean en overlayracing.site/equipos/:token. Lo arma el panel porque usa el mismo cálculo que las gráficas
// (trazado, viento por tramo, temperatura del asfalto). Los pilotos en vivo los arma main (src/scripts/teamFeed.cjs).
//
// Formato (versión 1): ver el prompt de la web; resumen:
//   circuit: datos del circuito; track: trazado remuestreado a N puntos equidistantes (t = i / N) en un lienzo de
//   1000 x height (y hacia abajo), con temperatura y viento por punto; weather: clima puntual; radar: grilla del radar.
import { buildTrack, pointOnTrack, nearestOnTrack, sectorRanges, DEFAULT_ASPECT } from './trackPath.js';
import { analyzeTrack, windRuns, travelReversed, northAngle, lapDist } from './trackConditions.js';
import { getWeatherVisual } from './weather.js';

export const CONDITIONS_VERSION = 1;
export const TRACK_SAMPLES = 240;
const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const r4 = (v) => (Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

function trackBlock(config, aspect) {
  const ar = Number.isFinite(aspect) && aspect > 0.2 ? aspect : DEFAULT_ASPECT;
  const track = buildTrack(config?.trackPath, { width: 1000, fit: true, pad: 0, minHeight: 10, maxHeight: 5000, aspect: ar });
  if (!track) return null;
  const north = northAngle(config);
  const analysis = analyzeTrack(track, {
    weatherData: config?.weatherData || {}, north, shade: config?.trackShade, tempPoints: config?.trackTempPoints,
    reverse: travelReversed(track, config?.circuitDirection)
  });
  // Puntos equidistantes sobre la pista: el punto i está a la fracción de vuelta i / N desde la largada
  const N = TRACK_SAMPLES;
  const near = (t) => analysis.points.reduce((b, p) => (lapDist(p.t, t) < lapDist(b.t, t) ? p : b), analysis.points[0]);
  const points = []; const temp = []; const wind = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const p = pointOnTrack(track, t);
    const a = near(t);
    points.push([r1(p.x), r1(p.y)]);
    temp.push(r1(a.temp));
    wind.push(r2(a.along));
  }
  const curves = (Array.isArray(config?.trackCurves) ? config.trackCurves : []).map(c => {
    const t = Number.isFinite(c.t) ? c.t : (nearestOnTrack(config.trackPath, ar, c) || {}).t;
    return Number.isFinite(t) ? { name: String(c.name || ''), t: r4(t) } : null;
  }).filter(Boolean);
  const runs = windRuns(analysis, 0.07).map(r => ({ type: r.cls, t: r4(r.mid.t), length: r2(r.len), kmh: Math.round(Math.abs(r.along) * analysis.windSpeed) }));
  const hasTemp = analysis.min !== null;
  return {
    width: 1000,
    height: Math.round(track.height),
    samples: N,
    points,
    start: { x: r1(track.start.x), y: r1(track.start.y), angle: r1(track.start.angle) },
    north,
    direction: travelReversed(track, config?.circuitDirection) ? 'reversed' : 'as-drawn',
    sectors: sectorRanges(config?.trackSectors).map(([a, b]) => [r4(a), r4(b)]),
    curves,
    // Temperatura del asfalto en cada punto (°C) y viento a lo largo de la pista (-1 = de frente, +1 = de cola)
    temp,
    wind,
    summary: {
      air: r1(analysis.air),
      trackTemp: r1(analysis.trackTemp),
      measured: analysis.measured,
      min: hasTemp ? r1(analysis.min) : null,
      max: hasTemp ? r1(analysis.max) : null,
      hottestT: hasTemp ? r4(analysis.hot.t) : null,
      coolestT: hasTemp ? r4(analysis.cold.t) : null,
      windShare: analysis.share,             // % de la vuelta con viento de cola / cruzado / de frente
      windRuns: runs                         // tramos largos con viento de frente o de cola
    }
  };
}

function weatherBlock(wd) {
  if (!wd || !Number.isFinite(Number(wd.temp))) return null;
  const visual = getWeatherVisual(wd.weathercode);
  return {
    temp: r1(wd.temp),
    feelsLike: r1(wd.feelsLike),
    humidity: r1(wd.humidity),
    windSpeed: r1(wd.windSpeed),
    windDir: r1(wd.windDir),
    gusts: r1(wd.gusts),
    code: wd.weathercode ?? null,
    label: visual.label,
    category: visual.category,
    precip1h: r1(wd.precip1h),
    precip6h: r1(wd.precip6h),
    precipProb: r1(wd.precipProb),
    cloudCover: r1(wd.cloudCover),
    radiation: r1(wd.radiation),
    forecast: (Array.isArray(wd.forecast) ? wd.forecast : []).slice(0, 6).map(h => ({ time: h.time, temp: r1(h.temp), code: h.code ?? null, precip: r1(h.precip) })),
    place: wd.place || null,
    updatedAt: wd.updatedAt || null,
    source: wd.source || null
  };
}

// config del panel + proporción de la imagen del circuito -> paquete de condiciones
export function buildTeamConditions(config, aspect, { now = Date.now() } = {}) {
  const c = config || {};
  const grid = c.weatherGrid && c.weatherGrid.box && Array.isArray(c.weatherGrid.frames) ? c.weatherGrid : null;
  return {
    v: CONDITIONS_VERSION,
    updatedAt: now,
    circuit: {
      name: String(c.circuitName || c.circuito || ''),
      city: String(c.circuitCity || ''),
      country: String(c.circuitCountry || ''),
      lengthM: num(c.circuitLength),
      category: String(c.categoryName || c.formationLapCategory || ''),
      event: String(c.eventTitle || c.campeonato || '')
    },
    track: trackBlock(c, aspect),
    weather: weatherBlock(c.weatherData),
    radar: grid ? { box: grid.box, nx: grid.nx, ny: grid.ny, scale: grid.scale, frames: grid.frames, spots: grid.spots || [], updatedAt: grid.updatedAt || null } : null
  };
}
