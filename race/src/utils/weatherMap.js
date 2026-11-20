// Datos del CLIMA (MET Norway, recortados en src/scripts/metWeather.cjs) para las gráficas, y la grilla del RADAR DEL CLIMA.
// Todo es cálculo puro para poder probarlo.

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const toRad = (d) => (d * Math.PI) / 180;

// ---------------------------------------------------------------------------------------------------------------------
// Clima puntual

// Símbolo de MET ('lightrainshowers_day') -> código WMO que ya usan las gráficas (getWeatherVisual)
export function symbolToWmo(symbol) {
  const s = String(symbol || '').replace(/_(day|night|polartwilight)$/, '');
  if (!s) return null;
  if (s.includes('thunder')) return 95;
  if (s === 'clearsky') return 0;
  if (s === 'fair') return 1;
  if (s === 'partlycloudy') return 2;
  if (s === 'cloudy') return 3;
  if (s === 'fog') return 45;
  if (s.includes('snow')) return s.includes('showers') ? 85 : s.startsWith('heavy') ? 75 : s.startsWith('light') ? 71 : 73;
  if (s.includes('sleet')) return 67;
  if (s.includes('rainshowers')) return s.startsWith('heavy') ? 82 : s.startsWith('light') ? 80 : 81;
  if (s.includes('rain')) return s.startsWith('heavy') ? 65 : s.startsWith('light') ? 61 : 63;
  return 3;
}

// Altura del sol sobre el horizonte (grados) en un lugar y momento (fórmula aproximada de la NOAA, error < 1°)
export function solarElevation(lat, lon, date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000;
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
  const g = (2 * Math.PI / 365) * (day - 1 + (hour - 12) / 24);
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const tst = hour * 60 + eqt + 4 * lon;              // tiempo solar verdadero (min)
  const ha = toRad(tst / 4 - 180);
  const phi = toRad(lat);
  const cosZ = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZ))) * 180 / Math.PI;
}

// Radiación solar estimada (W/m²): cielo despejado (Haurwitz) reducida por la nubosidad (Kasten-Czeplak).
// MET Norway no la informa; sirve para estimar la temperatura del asfalto.
export function estimateRadiation(lat, lon, date, cloudPct) {
  const h = solarElevation(lat, lon, date);
  if (h <= 0) return 0;
  const s = Math.sin(toRad(h));
  const clear = 1098 * s * Math.exp(-0.057 / s);
  const c = Math.max(0, Math.min(1, (num(cloudPct) ?? 0) / 100));
  return Math.round(clear * (1 - 0.75 * Math.pow(c, 3.4)));
}

// Sensación térmica (si MET no la manda): Steadman simplificado con humedad y viento (m/s)
function apparentTemp(t, rh, ws) {
  if (t === null) return null;
  const e = rh === null ? 0 : (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  return r1(t + 0.33 * e - 0.7 * (ws ?? 0) - 4);
}

const hhmm = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// Punto de MET -> config.weatherData (mismo formato que antes, la lluvia ahora en mm). La hora del pronóstico se
// muestra en la hora de la PC (formatTime).
export function weatherFromMet(point, { lat, lon, place = null, now = Date.now(), formatTime = hhmm } = {}) {
  const series = point?.series || [];
  if (!series.length || num(series[0].t) === null) throw new Error('Sin datos de clima');
  // El primer dato puede ser de la hora en curso: se toma el más cercano a ahora
  let idx = 0;
  series.forEach((s, i) => { if (Math.abs(Date.parse(s.time) - now) < Math.abs(Date.parse(series[idx].time) - now)) idx = i; });
  const c = series[idx];
  const forecast = series.slice(idx + 1, idx + 7).map(s => ({ time: formatTime(s.time), temp: s.t, code: symbolToWmo(s.s1), precip: s.p1 }));
  return {
    temp: c.t,
    windSpeed: c.ws === null ? null : r1(c.ws * 3.6),
    windDir: c.wd,
    weathercode: symbolToWmo(c.s1) ?? symbolToWmo(c.s6) ?? 3,
    feelsLike: c.at ?? apparentTemp(c.t, c.rh, c.ws),
    humidity: c.rh,
    precip1h: c.p1,
    precip6h: c.p6,
    cloudCover: c.cloud,
    radiation: Number.isFinite(lat) && Number.isFinite(lon) ? estimateRadiation(lat, lon, new Date(now), c.cloud) : null,
    gusts: null,
    forecast,
    place,
    source: 'met',
    updatedAt: now
  };
}

// Lluvia para las gráficas: milímetros de las próximas 6 h (MET). Con datos viejos guardados (Open-Meteo) sigue
// mostrando el %. Devuelve { value, unit, wet } o null.
export function rainInfo(wd) {
  if (!wd) return null;
  const mm = num(wd.precip6h) ?? num(wd.precip1h);
  if (mm !== null) return { value: mm < 10 ? Math.round(mm * 10) / 10 : Math.round(mm), unit: 'mm', wet: mm >= 1 };
  const p = num(wd.precipProb);
  if (p !== null) return { value: Math.round(p), unit: '%', wet: p >= 50 };
  return null;
}
export const rainText = (wd) => { const r = rainInfo(wd); return r ? `${String(r.value).replace('.', ',')}${r.unit === 'mm' ? ' mm' : '%'}` : '-'; };

// ---------------------------------------------------------------------------------------------------------------------
// RADAR DEL CLIMA: zona alrededor del circuito, proyección plana (lon/lat lineales, con la corrección cos(lat))

export const MAP_ASPECT = 16 / 10;
// km = mitad del alto de la zona. nx * ny = pedidos a MET por actualización.
export const MAP_SCALES = {
  region: { km: 120, nx: 10, ny: 7 },
  province: { km: 320, nx: 13, ny: 8 },
  country: { km: 900, nx: 16, ny: 10 }
};
export const mapScale = (s) => (MAP_SCALES[s] ? s : 'province');

export function mapBox(lat, lon, scale = 'province') {
  const { km } = MAP_SCALES[mapScale(scale)];
  const halfLat = km / 111.32;
  const halfLon = (km * MAP_ASPECT) / (111.32 * Math.max(0.2, Math.cos(toRad(lat))));
  const f4 = (v) => Math.round(v * 10000) / 10000;
  return { lat, lon, north: f4(lat + halfLat), south: f4(lat - halfLat), west: f4(lon - halfLon), east: f4(lon + halfLon) };
}

// Puntos de la grilla: de norte a sur y de oeste a este, incluyendo los bordes
export function gridPoints(box, nx, ny) {
  const pts = [];
  for (let r = 0; r < ny; r++) {
    for (let c = 0; c < nx; c++) {
      pts.push({ lat: box.north + (box.south - box.north) * (r / (ny - 1)), lon: box.west + (box.east - box.west) * (c / (nx - 1)) });
    }
  }
  return pts;
}

// Lista de puntos de MET (mismo orden que gridPoints, null si falló) -> grilla compacta para guardar.
// frames[0] = ahora; frames[1..] = próximas horas. Cada cuadro: { time, iso, temp[], rain[], wind[] (km/h), dir[] }
export function gridFromMet(list, { box, nx, ny, scale, place = null, now = Date.now(), formatTime = hhmm, hours = 7 } = {}) {
  if (!Array.isArray(list) || list.length !== nx * ny) throw new Error(`Se esperaban ${nx * ny} puntos`);
  const ref = list.find(p => p?.series?.length);
  if (!ref) throw new Error('Sin datos del radar');
  let start = 0;
  ref.series.forEach((s, i) => { if (Math.abs(Date.parse(s.time) - now) < Math.abs(Date.parse(ref.series[start].time) - now)) start = i; });
  const count = Math.min(hours, ref.series.length - start);
  const frames = [];
  for (let k = 0; k < count; k++) {
    const iso = ref.series[start + k].time;
    const pick = (fn) => fillGaps(list.map(p => { const s = p?.series?.find(x => x.time === iso); return s ? fn(s) : null; }), nx, ny);
    frames.push({
      time: formatTime(iso),
      iso,
      temp: pick(s => r1(s.t)),
      rain: pick(s => r1(s.p1 ?? 0)),
      wind: pick(s => (s.ws === null ? null : r1(s.ws * 3.6))),
      dir: pick(s => (s.wd === null ? null : Math.round(s.wd)))
    });
  }
  return { box, nx, ny, scale, place, frames, updatedAt: now, source: 'met' };
}

// Valores exactos en lugares puntuales (el circuito y las ciudades rotuladas), alineados con los cuadros de la grilla.
// Con una grilla gruesa, una ciudad al pie de la cordillera tomaría el frío de la montaña: por eso se piden aparte.
// places: [{ name, lat, lon }], list: puntos de MET en el mismo orden -> [{ name, lat, lon, temp[], rain[], wind[] }]
export function spotsFromMet(places, list, frames) {
  return (places || []).map((pl, i) => {
    const series = list?.[i]?.series;
    if (!series?.length) return null;
    const at = (iso) => series.find(x => x.time === iso) || null;
    const col = (fn) => frames.map(fr => { const s = at(fr.iso); return s ? fn(s) : null; });
    return { name: pl.name, lat: pl.lat, lon: pl.lon, temp: col(s => r1(s.t)), rain: col(s => r1(s.p1 ?? 0)), wind: col(s => (s.ws === null ? null : r1(s.ws * 3.6))) };
  }).filter(Boolean);
}
export const CIRCUIT_SPOT = '__circuito';

// Puntos sin dato (pedido fallido): promedio de los vecinos con dato
function fillGaps(values, nx, ny) {
  const out = values.slice();
  for (let pass = 0; pass < 3 && out.some(v => v === null); pass++) {
    const prev = out.slice();
    prev.forEach((v, i) => {
      if (v !== null) return;
      const r = Math.floor(i / nx); const c = i % nx; let s = 0; let n = 0;
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => {
        if (rr < 0 || cc < 0 || rr >= ny || cc >= nx) return;
        const w = prev[rr * nx + cc];
        if (w !== null) { s += w; n += 1; }
      });
      if (n) out[i] = Math.round((s / n) * 10) / 10;
    });
  }
  return out;
}

// Valor interpolado (bilineal) en la posición (fx, fy) de la grilla, en unidades de celda (0..nx-1, 0..ny-1)
export function sampleGrid(values, nx, ny, fx, fy) {
  const x = Math.max(0, Math.min(nx - 1, fx)); const y = Math.max(0, Math.min(ny - 1, fy));
  // En el último borde se usa la celda anterior con fracción 1 (así no se sale de la grilla)
  const c = Math.min(Math.floor(x), nx - 2); const r = Math.min(Math.floor(y), ny - 2); const dx = x - c; const dy = y - r;
  const v = (rr, cc) => { const w = values[rr * nx + cc]; return Number.isFinite(w) ? w : null; };
  const a = v(r, c); const b = v(r, c + 1); const d = v(r + 1, c); const e = v(r + 1, c + 1);
  if ([a, b, d, e].some(q => q === null)) return a ?? b ?? d ?? e;
  return a * (1 - dx) * (1 - dy) + b * dx * (1 - dy) + d * (1 - dx) * dy + e * dx * dy;
}

// Componentes del viento hacia donde sopla (km/h), en pantalla: u = hacia la derecha (este), v = hacia abajo (sur)
export function windComponents(frame) {
  const u = []; const v = [];
  (frame?.wind || []).forEach((s, i) => {
    const d = frame.dir?.[i];
    if (!Number.isFinite(s) || !Number.isFinite(d)) { u.push(null); v.push(null); return; }
    const to = toRad(d + 180);
    u.push(s * Math.sin(to)); v.push(-s * Math.cos(to));
  });
  return { u, v };
}

// Proyección de la zona a un rectángulo de w x h px
export function projector(box, w, h) {
  const sx = w / (box.east - box.west); const sy = h / (box.north - box.south);
  return { x: (lon) => (lon - box.west) * sx, y: (lat) => (box.north - lat) * sy };
}

// Anillos del mapa (mapa.json: centésimos de grado con delta) -> [[lon, lat, lon, lat, ...], ...] en grados
export function decodeRings(shapes) {
  const out = [];
  (shapes || []).forEach(shape => shape.forEach(flat => {
    const ring = new Float32Array(flat.length);
    let x = 0; let y = 0;
    for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; ring[i] = x / 100; ring[i + 1] = y / 100; }
    out.push(ring);
  }));
  return out;
}

// Anillos que tocan la zona (con margen)
export function ringsInBox(rings, box, margin = 0.5) {
  return rings.filter(r => {
    for (let i = 0; i < r.length; i += 2) {
      if (r[i] >= box.west - margin && r[i] <= box.east + margin && r[i + 1] >= box.south - margin && r[i + 1] <= box.north + margin) return true;
    }
    return false;
  });
}

// Ciudades a rotular: las más pobladas dentro de la zona, sin pisarse (rectángulos aproximados del cartel)
export function pickCities(cities, box, w, h, { max = 10, fontPx = 12, avoid = [] } = {}) {
  const pj = projector(box, w, h);
  const placed = avoid.map(a => ({ ...a }));
  const out = [];
  for (const [name, lat, lon, pop] of cities || []) {
    if (out.length >= max) break;
    if (lat > box.north || lat < box.south || lon < box.west || lon > box.east) continue;
    const x = pj.x(lon); const y = pj.y(lat);
    const bw = Math.max(name.length, 4) * fontPx * 0.62 + 10; const bh = fontPx * 2.6;
    const rect = { x0: x - bw / 2, x1: x + bw / 2, y0: y - bh * 0.75, y1: y + bh * 0.5 };
    if (rect.x0 < 4 || rect.x1 > w - 4 || rect.y0 < 4 || rect.y1 > h - 4) continue;
    if (placed.some(p => !(rect.x1 < p.x0 || rect.x0 > p.x1 || rect.y1 < p.y0 || rect.y0 > p.y1))) continue;
    placed.push(rect);
    out.push({ name, lat, lon, pop, x, y });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Escalas de color de los mapas meteorológicos (absolutas: el mismo color siempre es la misma temperatura)

const hexToRgb = (hx) => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function scaleColor(stops, v) {
  if (!Number.isFinite(v)) return null;
  if (v <= stops[0][0]) return hexToRgb(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [v0, c0] = stops[i - 1]; const [v1, c1] = stops[i];
      const f = (v - v0) / (v1 - v0); const a = hexToRgb(c0); const b = hexToRgb(c1);
      return a.map((x, j) => Math.round(x + (b[j] - x) * f));
    }
  }
  return hexToRgb(stops[stops.length - 1][1]);
}

// Temperatura (°C): la escala de los mapas del tiempo de TV (violeta-azul frío, verde templado, amarillo-rojo calor)
export const TEMP_STOPS = [[-20, '#7b3fa0'], [-10, '#4e4fc4'], [0, '#5aa7e8'], [5, '#4fc7c0'], [10, '#3fb26b'], [15, '#7ccf3a'], [20, '#d6e04a'], [25, '#f7b22e'], [30, '#ec5a2a'], [35, '#c4162f'], [40, '#7a0d2c'], [45, '#45081f']];
export const tempRgb = (t) => scaleColor(TEMP_STOPS, t);
// Viento (km/h): azul calmo -> verde -> amarillo -> rojo -> violeta
export const WIND_STOPS = [[0, '#3d5a9e'], [10, '#3c8fc4'], [20, '#3fb28a'], [30, '#9ccc3c'], [45, '#f2c12e'], [60, '#ea6a2a'], [80, '#c4162f'], [100, '#8e2a8a']];
export const windRgb = (s) => scaleColor(WIND_STOPS, s);
// Lluvia (mm/h): radar (celeste -> azul -> verde -> amarillo -> rojo -> violeta). Debajo de 0,1 mm: transparente.
export const RAIN_STOPS = [[0.1, '#9ad7f5'], [0.5, '#3d9be0'], [1, '#2a5fd1'], [2, '#2fb34a'], [5, '#f2d12e'], [10, '#f07d22'], [20, '#d61f2c'], [40, '#9b1fa3']];
export const rainRgb = (mm) => (Number.isFinite(mm) && mm >= 0.1 ? scaleColor(RAIN_STOPS, mm) : null);
export const toCss = (rgb, a = 1) => (rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})` : 'transparent');

// ---------------------------------------------------------------------------------------------------------------------
// Grilla de ejemplo (vista previa de PERSONALIZAR): calor al norte, frente frío con lluvia entrando por el sudoeste
export function demoGrid(lat = -34.69, lon = -58.46, scale = 'province', now = Date.now()) {
  const sc = MAP_SCALES[mapScale(scale)];
  const box = mapBox(lat, lon, scale);
  const { nx, ny } = sc;
  const frames = [];
  for (let k = 0; k < 7; k++) {
    const temp = []; const rain = []; const wind = []; const dir = [];
    for (let r = 0; r < ny; r++) {
      for (let c = 0; c < nx; c++) {
        const front = (ny - 1 - r) / (ny - 1) * 0.9 + (1 - c / (nx - 1)) * 0.7 - k * 0.12;  // > 0.9 = detrás del frente
        temp.push(Math.round((31 - r * 1.3 + Math.sin(c * 0.9 + r * 0.4) * 1.5 - (front > 0.9 ? 7 : 0)) * 10) / 10);
        rain.push(front > 0.75 && front < 1.15 ? Math.round((5 - Math.abs(front - 0.95) * 22) * 10) / 10 : 0);
        const swirl = Math.atan2(r - ny / 2, c - nx / 2) * 180 / Math.PI;
        wind.push(Math.round(12 + Math.abs(Math.sin(r + c)) * 18));
        dir.push(Math.round(front > 0.9 ? 215 : (swirl + 360 + 30) % 360));
      }
    }
    const d = new Date(now + k * 3600000);
    frames.push({ time: `${String(d.getHours()).padStart(2, '0')}:00`, iso: d.toISOString(), temp, rain: rain.map(v => Math.max(0, v)), wind, dir });
  }
  return { box, nx, ny, scale: mapScale(scale), place: 'EJEMPLO', frames, updatedAt: now, source: 'demo' };
}

// Imagen satelital de la zona (NASA GIBS, Blue Marble: uso libre citando la fuente). Misma proyección que el mapa.
export function satelliteUrl(box, w, h) {
  const W = Math.min(2048, Math.round(w)); const H = Math.min(2048, Math.round(h));
  return 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1'
    + `&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&SRS=EPSG:4326&BBOX=${box.west},${box.south},${box.east},${box.north}`
    + `&WIDTH=${W}&HEIGHT=${H}&FORMAT=image/jpeg`;
}

// "Viernes 20 · 15:00" (hora de la PC)
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export function frameLabel(frame) {
  if (!frame) return '';
  const d = frame.iso ? new Date(frame.iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${DAYS[d.getDay()]} ${d.getDate()} · ${frame.time}` : frame.time || '';
}
