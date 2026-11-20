// CONDICIONES DE PISTA: viento y temperatura sobre el trazado, y la grilla regional del RADAR DEL CLIMA.
// Todo es cálculo puro (sin React) para poder probarlo.
//
// Qué es real y qué es estimado:
//  - El viento (dirección, fuerza, ráfagas) es el dato de Open-Meteo. Lo que se calcula es cómo le pega a cada tramo
//    según hacia dónde va el auto: de frente, de cola o cruzado. Para eso hace falta saber dónde está el norte en la
//    imagen del circuito (config.trackNorth, grados en sentido horario desde "arriba").
//  - La temperatura del asfalto NO la mide nadie: se estima con la del aire, la radiación solar y el viento. Varía
//    por zona sólo con las sombras marcadas (config.trackShade) o con las mediciones cargadas (config.trackTempPoints).

const toRad = (d) => (d * Math.PI) / 180;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.replace(',', '.'))) ? Number(v.replace(',', '.')) : null));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Distancia circular entre dos fracciones de vuelta (0..0.5)
export const lapDist = (a, b) => { const d = Math.abs((((a - b) % 1) + 1) % 1); return Math.min(d, 1 - d); };

// Ángulo del norte en la imagen: 0 = arriba (como Google Maps), 90 = a la derecha
export function northAngle(config) {
  const n = num(config?.trackNorth);
  return n === null ? 0 : ((n % 360) + 360) % 360;
}

// Temperatura del asfalto estimada (°C). Regla empírica: con sol pleno (~900 W/m²) y poco viento el asfalto queda
// ~20 °C arriba del aire; el viento lo enfría y de noche queda apenas por debajo del aire.
export function estimateTrackTemp(wd) {
  const air = num(wd?.temp);
  if (air === null) return null;
  const rad = Math.max(0, num(wd?.radiation) ?? 0);
  const wind = Math.max(0, num(wd?.windSpeed) ?? 0);
  const gain = (rad * 0.028) / (1 + wind / 35);
  return Math.round((air + gain - (rad < 20 ? 1 : 0)) * 10) / 10;
}

// Clasificación del viento en un tramo: along = componente a favor (+1 cola, -1 frente), cross = de costado
export function windClass(along) {
  if (along >= 0.5) return 'tail';
  if (along <= -0.5) return 'head';
  return 'cross';
}

// Sombra (0..1) en la fracción de vuelta t. Cada zona: { t, w } (centro y medio ancho), con un borde suave.
export function shadeAt(zones, t) {
  let s = 0;
  (Array.isArray(zones) ? zones : []).forEach(z => {
    const c = num(z?.t); const w = num(z?.w) ?? 0.03;
    if (c === null) return;
    const d = lapDist(t, c);
    const edge = 0.012;
    const v = d <= w ? 1 : d >= w + edge ? 0 : 1 - (d - w) / edge;
    s = Math.max(s, v);
  });
  return s;
}

// Mediciones válidas: [{ t, temp }]
export function validTempPoints(points) {
  return (Array.isArray(points) ? points : [])
    .map(p => ({ t: num(p?.t), temp: num(p?.temp) }))
    .filter(p => p.t !== null && p.temp !== null && p.t >= 0 && p.t <= 1);
}

// Analiza el trazado (salida de buildTrack): para cada muestra, la temperatura y el viento.
//   reverse: true si el sentido de marcha es el contrario al orden de los puntos
// Devuelve { points: [{ x, y, t, temp, along, cross, cls }], air, trackTemp, min, max, hot, cold, share, measured, gusts }
export function analyzeTrack(track, { weatherData, north = 0, shade, tempPoints, reverse = false } = {}) {
  if (!track || !track.samples?.length) return null;
  const wd = weatherData || {};
  const air = num(wd.temp);
  const trackTemp = estimateTrackTemp(wd);
  const windSpeed = Math.max(0, num(wd.windSpeed) ?? 0);
  const windDir = num(wd.windDir);
  const toward = windDir === null ? null : windDir + 180;      // hacia dónde sopla
  const sunGain = trackTemp !== null && air !== null ? Math.max(0, trackTemp - air) : 0;
  const { samples, cum, total } = track;
  const n = samples.length;

  const base = samples.map((p, i) => {
    const a = samples[(i - 1 + n) % n]; const b = samples[(i + 1) % n];
    let dx = b.x - a.x; let dy = b.y - a.y;
    if (reverse) { dx = -dx; dy = -dy; }
    // Rumbo en pantalla (horario desde arriba) -> rumbo geográfico restando el norte de la imagen
    const bearing = Math.atan2(dx, -dy) * 180 / Math.PI - north;
    let along = 0; let cross = 0;
    if (toward !== null && windSpeed > 0) {
      const rel = toRad(toward - bearing);
      along = Math.cos(rel); cross = Math.sin(rel);
    }
    const t = total ? cum[i] / total : i / n;
    // Con sombra plena el asfalto pierde ~70 % de lo que gana con el sol
    const est = trackTemp === null ? null : trackTemp - sunGain * 0.7 * shadeAt(shade, t);
    return { x: p.x, y: p.y, t, est, along, cross, cls: windSpeed > 0 && toward !== null ? windClass(along) : 'none' };
  });

  // Mediciones: se corrige la estimación con la diferencia medida, interpolada por distancia sobre la pista
  const meas = validTempPoints(tempPoints);
  const estAt = (t) => {
    let best = base[0]; let bd = Infinity;
    base.forEach(b => { const d = lapDist(b.t, t); if (d < bd) { bd = d; best = b; } });
    return best.est ?? 0;
  };
  // Sin dato de clima la estimación vale 0 y la medición pasa a ser el valor absoluto
  const offsets = meas.map(m => ({ t: m.t, off: m.temp - estAt(m.t) }));
  const points = base.map(b => {
    let temp = b.est;
    if (offsets.length) {
      let wsum = 0; let vsum = 0; let exact = null;
      offsets.forEach(o => {
        const d = lapDist(b.t, o.t);
        if (d < 1e-4) exact = o.off;
        const w = 1 / (d * d + 1e-6);
        wsum += w; vsum += w * o.off;
      });
      const off = exact !== null ? exact : vsum / wsum;
      temp = (b.est ?? 0) + off;
    }
    return { ...b, temp: temp === null ? null : Math.round(temp * 10) / 10 };
  });

  const withTemp = points.filter(p => p.temp !== null);
  let hot = null; let cold = null;
  withTemp.forEach(p => { if (!hot || p.temp > hot.temp) hot = p; if (!cold || p.temp < cold.temp) cold = p; });
  const share = { head: 0, tail: 0, cross: 0 };
  points.forEach(p => { if (share[p.cls] !== undefined) share[p.cls] += 1; });
  Object.keys(share).forEach(k => { share[k] = n ? Math.round((share[k] / n) * 100) : 0; });

  return {
    points, air, trackTemp, hot, cold,
    min: cold ? cold.temp : null, max: hot ? hot.temp : null,
    share, measured: meas.length > 0, windSpeed, windDir, gusts: num(wd.gusts)
  };
}

// Tramos largos con el mismo tipo de viento (para poner un cartel): [{ cls, mid: punto, len (fracción), along }]
export function windRuns(analysis, minLen = 0.07) {
  if (!analysis) return [];
  const pts = analysis.points;
  const n = pts.length;
  if (!n || pts[0].cls === 'none') return [];
  // Arranca en un cambio de tipo, así un tramo que cruza la largada no queda partido en dos
  let start = pts.findIndex((p, i) => p.cls !== pts[(i - 1 + n) % n].cls);
  if (start < 0) start = 0;
  const runs = [];
  let cur = null;
  for (let k = 0; k < n; k++) {
    const p = pts[(start + k) % n];
    if (!cur || cur.cls !== p.cls) { cur = { cls: p.cls, items: [] }; runs.push(cur); }
    cur.items.push(p);
  }
  return runs
    .map(r => ({ cls: r.cls, len: r.items.length / n, mid: r.items[Math.floor(r.items.length / 2)], along: r.items.reduce((s, p) => s + p.along, 0) / r.items.length }))
    .filter(r => r.len >= minLen && r.cls !== 'cross')
    .sort((a, b) => b.len - a.len)
    .slice(0, 3);
}

// ---------------------------------------------------------------------------------------------------------------------
// Escalas de color

const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbToHex = (r) => '#' + r.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
function rampColor(stops, k) {
  const x = clamp(Number.isFinite(k) ? k : 0, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const a = hexToRgb(stops[i]); const b = hexToRgb(stops[i + 1]);
  const f = x - i;
  return rgbToHex(a.map((v, j) => v + (b[j] - v) * f));
}

// Temperatura del asfalto: secuencial tipo cámara térmica. Las gráficas van sobre fondo oscuro, así que lo más caliente
// es lo más claro (violeta oscuro -> rojo -> naranja -> amarillo pálido)
export const HEAT_STOPS = ['#4a1486', '#9c179e', '#d8456c', '#f3742f', '#fdb42f', '#fcf5b0'];
export const heatColor = (k) => rampColor(HEAT_STOPS, k);

// Viento por tramo: divergente (cola azul, cruzado gris neutro, frente rojo)
export const WIND_COLORS = { tail: '#3a86ff', cross: '#9aa3ad', head: '#ff4d4d', none: '#9aa3ad' };
export function windAlongColor(along) {
  return along >= 0 ? rampColor(['#9aa3ad', '#6c9df5', '#3a86ff'], along) : rampColor(['#9aa3ad', '#f07f7f', '#ff4d4d'], -along);
}

// Temperatura del aire en el mapa regional: divergente frío / cálido con gris neutro en el medio
export const AIR_STOPS = ['#2c7bb6', '#7fb8da', '#d9dde2', '#f4a582', '#d7301f'];
export const airColor = (k) => rampColor(AIR_STOPS, k);

// Lluvia (mm/h): secuencial azul. Debajo de 0.1 mm no se pinta.
export const RAIN_STOPS = ['#bde0fe', '#74b3f0', '#3a86ff', '#1d4ed8', '#7b2cbf'];
export function rainColor(mm) {
  const v = num(mm) ?? 0;
  if (v < 0.1) return null;
  return rampColor(RAIN_STOPS, Math.log10(v * 10) / Math.log10(200)); // 0.1 .. 20 mm/h
}

// Normaliza un valor entre min y max (si son iguales, al medio)
export const norm = (v, min, max) => (max - min > 0.05 ? (v - min) / (max - min) : 0.5);

// ---------------------------------------------------------------------------------------------------------------------
// RADAR DEL CLIMA: grilla de puntos alrededor del circuito

export const RADAR_N = 9;           // 9 x 9 = 81 puntos por consulta (Open-Meteo los cuenta como 81 llamadas)

// Puntos de la grilla, de arriba (norte) a abajo y de izquierda (oeste) a derecha
export function radarGridPoints(lat, lon, km = 40, n = RADAR_N) {
  const dLat = km / 111.32;
  const dLon = km / (111.32 * Math.max(0.15, Math.cos(toRad(lat))));
  const pts = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const fy = n > 1 ? r / (n - 1) : 0.5; const fx = n > 1 ? c / (n - 1) : 0.5;
      pts.push({ lat: Math.round((lat + dLat * (1 - 2 * fy)) * 10000) / 10000, lon: Math.round((lon + dLon * (2 * fx - 1)) * 10000) / 10000 });
    }
  }
  return pts;
}

export function radarUrl(points, hours = 6) {
  const lat = points.map(p => p.lat).join(',');
  const lon = points.map(p => p.lon).join(',');
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover'
    + `&hourly=temperature_2m,precipitation,precipitation_probability&forecast_hours=${hours + 1}&wind_speed_unit=kmh&timezone=auto`;
}

// Respuesta de Open-Meteo (lista de ubicaciones) -> grilla compacta para guardar en la configuración
export function parseRadarResponse(json, { lat, lon, km, n = RADAR_N, place = null, now = Date.now() } = {}) {
  const list = Array.isArray(json) ? json : [json];
  if (list.length !== n * n) throw new Error(`Se esperaban ${n * n} puntos y llegaron ${list.length}`);
  const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
  const cells = list.map(loc => {
    const c = loc?.current || {};
    return { temp: r1(c.temperature_2m), rain: r1(c.precipitation), code: c.weather_code ?? null, wind: r1(c.wind_speed_10m), dir: Number.isFinite(c.wind_direction_10m) ? Math.round(c.wind_direction_10m) : null, cloud: Number.isFinite(c.cloud_cover) ? Math.round(c.cloud_cover) : null };
  });
  // Próximas horas (la primera hora horaria es la actual: se saltea)
  const h0 = list[0]?.hourly || {};
  const times = (h0.time || []).slice(1);
  const frames = times.map((tm, k) => ({
    time: String(tm).slice(11, 16),
    temp: list.map(loc => r1(loc?.hourly?.temperature_2m?.[k + 1])),
    rain: list.map(loc => r1(loc?.hourly?.precipitation?.[k + 1])),
    prob: list.map(loc => { const v = loc?.hourly?.precipitation_probability?.[k + 1]; return Number.isFinite(v) ? v : null; })
  }));
  return { lat, lon, km, n, place, cells, frames, time: String(list[0]?.current?.time || '').slice(11, 16), updatedAt: now };
}

// Grilla de ejemplo (vista previa de PERSONALIZAR): frente de lluvia que entra desde el sudoeste
export function demoRadarGrid(n = RADAR_N) {
  const cells = []; const frames = [];
  const rainAt = (r, c, shift) => {
    const d = (n - 1 - r) * 0.8 + c * 0.6 - shift;   // la lluvia avanza hacia el noreste
    return d < 2 ? Math.max(0, Math.round((4 - Math.abs(d - 0.5) * 2.2) * 10) / 10) : 0;
  };
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      cells.push({ temp: Math.round((19 + c * 0.5 - r * 0.3 + Math.sin(r + c) * 0.6) * 10) / 10, rain: rainAt(r, c, 0), code: 61, wind: 16 + ((r * c) % 7), dir: 225, cloud: 60 });
    }
  }
  for (let k = 1; k <= 6; k++) {
    const temp = []; const rain = []; const prob = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const v = rainAt(r, c, k * 1.3); temp.push(19 + c * 0.5 - r * 0.3 - k * 0.3); rain.push(v); prob.push(v > 0 ? 80 : 15); }
    frames.push({ time: `${String(14 + k).padStart(2, '0')}:00`, temp, rain, prob });
  }
  return { lat: 0, lon: 0, km: 40, n, place: 'EJEMPLO', cells, frames, time: '14:00', updatedAt: Date.now(), demo: true };
}

// Valores de una capa ('temp' | 'rain') para el cuadro actual (frame -1 = ahora)
export function radarLayerValues(grid, layer, frame = -1) {
  if (!grid) return [];
  const f = frame >= 0 ? grid.frames?.[frame] : null;
  if (layer === 'rain') return f ? f.rain : grid.cells.map(c => c.rain);
  return f ? f.temp : grid.cells.map(c => c.temp);
}

// Mediana (para centrar la escala divergente de la temperatura del aire)
export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// ¿Hay que invertir el sentido de marcha? Sí cuando DATOS > SENTIDO DE GIRO dice lo contrario al orden de los puntos.
export function travelReversed(track, circuitDirection) {
  if (!track || (circuitDirection !== 'cw' && circuitDirection !== 'ccw')) return false;
  const s = track.samples;
  let area = 0;
  for (let i = 0; i < s.length; i++) { const a = s[i]; const b = s[(i + 1) % s.length]; area += a.x * b.y - b.x * a.y; }
  return (area > 0 ? 'cw' : 'ccw') !== circuitDirection;
}

// CIRCUITO > CLIMA EN PISTA: clic sobre la pista (snap = nearestOnTrack). Devuelve [clave, valor] para la configuración:
// con 'shade' agrega una sombra (o la quita si ya había una ahí); con 'temp' agrega una medición vacía para completar.
export const SHADE_W = 0.03;
export function condClickPatch(config, tool, snap, now = Date.now()) {
  if (!snap || !Number.isFinite(snap.t)) return null;
  const t = Math.round(snap.t * 10000) / 10000;
  if (tool === 'temp') {
    const pts = Array.isArray(config?.trackTempPoints) ? config.trackTempPoints : [];
    return ['trackTempPoints', [...pts, { id: `m${now.toString(36)}`, t, temp: '' }]];
  }
  const zones = Array.isArray(config?.trackShade) ? config.trackShade : [];
  const hit = zones.findIndex(z => lapDist(z.t, t) <= (Number(z.w) || SHADE_W));
  return ['trackShade', hit >= 0 ? zones.filter((_, i) => i !== hit) : [...zones, { t, w: SHADE_W }]];
}
