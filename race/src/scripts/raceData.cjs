'use strict';
// =========================================================================
// ANÁLISIS DE CARRERA (proceso principal)
// =========================================================================
// Toma el leaderboard crudo que devuelven Speedhive / Race Monitor / Orbits ({ session, drivers }) y le agrega lo que
// necesitan las gráficas y el panel, antes de mandarlo a las ventanas y a los overlays remotos:
//   - correcciones manuales (nombre, penalización de tiempo, descalificación) con el orden recalculado
//   - categoría detectada, clases (multiclase), posición dentro de la clase y líder de cada clase
//   - grilla de largada y posiciones ganadas / perdidas
//   - sectores (mejor personal, mejor absoluto, colores violeta / verde / amarillo y vuelta teórica)
//   - pasadas por meta de cada piloto: brecha vuelta a vuelta entre dos pilotos y posición estimada en el circuito
//   - alertas automáticas (vuelta rápida, cambio de líder, posible abandono, cambio de bandera)
// Todo es código puro (sin Electron) para poder probarlo con `node --test`.

const MAX_ALERTS = 30;

// ---------------------------------------------------------------------------
// Marcas de autos (logos en race/public/brands/<slug>.png, índice en src/data/brands.json)
// ---------------------------------------------------------------------------
let BRANDS = [];
try { BRANDS = require('../data/brands.json'); } catch (e) { BRANDS = []; }
const normalizeWords = (s) => ' ' + String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const EXTRA_ALIASES = {
  volkswagen: ['vw'], 'mercedes-benz': ['mercedes', 'mb'], chevrolet: ['chevy', 'chev'], 'alfa-romeo': ['alfa'],
  'land-rover': ['landrover'], 'aston-martin': ['aston'], 'rolls-royce': ['rolls'], citroen: ['citroen'], peugeot: ['peugot']
};
// Alias -> slug, de más largo a más corto (para que "alfa romeo" gane sobre "alfa")
// Las submarcas ("ford-mustang") no se detectan solas: se prefiere la marca madre; se pueden elegir a mano en PILOTOS.
const BRAND_ALIASES = (() => {
  const slugs = new Set(BRANDS.map(b => b.slug));
  const list = [];
  BRANDS.forEach(b => {
    if (b.slug.includes('-') && slugs.has(b.slug.split('-')[0])) return;
    const words = new Set([normalizeWords(b.name).trim(), b.slug.replace(/-/g, ' '), b.slug.replace(/-/g, '')]);
    words.forEach(w => { if (w) list.push({ alias: w, slug: b.slug, curated: false }); });
    (EXTRA_ALIASES[b.slug] || []).forEach(a => list.push({ alias: a, slug: b.slug, curated: true }));
  });
  return list.sort((a, b) => b.alias.length - a.alias.length);
})();

// Marca a partir de los textos que informa la fuente (clase, equipo, datos adicionales). Devuelve el slug o ''.
// Los alias de menos de 3 letras sólo cuentan si son el texto entero (para no confundir "MG" dentro de otra palabra).
function detectBrand(texts) {
  for (const raw of (Array.isArray(texts) ? texts : [texts])) {
    const text = normalizeWords(raw);
    if (text.trim().length < 2) continue;
    for (const { alias, slug, curated } of BRAND_ALIASES) {
      if (alias.length < 3 && !curated ? text.trim() === alias : text.includes(` ${alias} `)) return slug;
    }
  }
  return '';
}
const brandExists = (slug) => BRANDS.some(b => b.slug === slug);

// Datos cargados a mano por piloto (pestaña PILOTOS), por número de la fuente
function normalizeRoster(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  Object.keys(raw).forEach(num => {
    const r = raw[num];
    if (!r || typeof r !== 'object') return;
    const e = {};
    const clip = (v, n) => String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
    if (clip(r.name, 80)) e.name = clip(r.name, 80);
    if (clip(r.number, 6)) e.number = clip(r.number, 6);
    if (clip(r.team, 60)) e.team = clip(r.team, 60);
    if (clip(r.brand, 40) && brandExists(clip(r.brand, 40))) e.brand = clip(r.brand, 40);
    if (r.manual === true) e.manual = true;
    const key = clip(num, 12);
    if (key && (Object.keys(e).length)) out[key] = e;
  });
  return out;
}
const LEADER_STABLE_TICKS = 2;      // el nuevo líder tiene que repetirse en 2 lecturas seguidas (evita falsas alarmas por un parpadeo)
const STOP_FACTOR = 2;              // sin pasar por meta durante 2 vueltas típicas => posible abandono
const STOP_MIN_EXTRA = 45;          // ... y como mínimo una vuelta típica + 45 s
const MAX_TRACKED_LAPS = 400;

// ---------------------------------------------------------------------------
// Tiempos
// ---------------------------------------------------------------------------

// "1:23.456", "83.456", "1:02:03.4", "+1.234", "83,456" -> segundos. null si no es un tiempo ("-", "IN PIT", "1 LAP").
function timeToSeconds(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null;
  const s = String(raw).trim().replace(',', '.').replace(/^\+/, '').replace(/\s*s$/i, '');
  if (!s || !/^\d+(:\d+){0,2}(\.\d+)?$/.test(s)) return null;
  let total = 0;
  for (const part of s.split(':')) total = total * 60 + parseFloat(part);
  return Number.isFinite(total) && total > 0 ? total : null;
}

// Segundos -> "1:23.456" / "58.123" / "1:02:03.456"
function formatSeconds(sec, decimals = 3) {
  if (sec === null || sec === undefined || !Number.isFinite(sec) || sec < 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  let s = (sec - h * 3600 - m * 60).toFixed(decimals);
  // 59.9996 redondea a "60.000": se pasa al minuto siguiente
  if (parseFloat(s) >= 60) return formatSeconds(Math.round(sec * 10 ** decimals) / 10 ** decimals + 1e-9, decimals);
  if (h > 0 || m > 0) s = s.padStart(decimals > 0 ? decimals + 3 : 2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`;
  if (m > 0) return `${m}:${s}`;
  return s;
}

const toInt = (v) => {
  const n = parseInt(String(v === undefined || v === null ? '' : v).trim(), 10);
  return Number.isFinite(n) ? n : null;
};

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Tipo de sesión y categoría
// ---------------------------------------------------------------------------

const QUALI_RE = /(pr[aá]ctica|practice|entrenamiento|training|\blibres?\b|\bfree\b|qualif|clasif|quali|qualy|warm[ -]?up|tanda|\bq[1-3]\b|super ?pole)/i;
const RACE_RE = /(carrera|\brace\b|final|manga|heat|serie|sprint)/i;
// Palabras que indican el tipo de sesión (no forman parte del nombre de la categoría)
const SESSION_PART_RE = /^(\d+\s*(?:era|ra|da|ta|er|°|º|st|nd|rd|th)?\.?\s*)?(carrera|race|final|manga|serie|heat|clasificaci[oó]n|clasificatoria|qualifying|quali|qualy|q[1-3]|entrenamiento|entrenamientos|pr[aá]ctica|practice|training|tanda|warm[ -]?up|sprint|super ?pole|libres?|free practice)\b/i;
const SESSION_TAIL_RE = /\s+(\d+\s*(?:era|ra|da|ta|er|°|º|st|nd|rd|th)?\.?\s+)?(carrera|race|final|manga|serie|heat|clasificaci[oó]n|clasificatoria|qualifying|quali|qualy|q[1-3]|entrenamientos?|pr[aá]ctica|practice|training|tanda|warm[ -]?up|sprint|super ?pole)\b.*$/i;

const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// Parte del nombre que describe la sesión ("GT Series - Clasificación" -> "Clasificación"), para no confundir palabras
// del nombre de la categoría ("Series", "Final 4", "Libre") con el tipo de sesión
function sessionPartOf(rawName) {
  const name = cleanName(rawName);
  const parts = name.split(/\s+[-–—|:]\s+/).map(cleanName).filter(Boolean);
  if (parts.length >= 2) {
    const idx = parts.findIndex((p, i) => i > 0 && SESSION_PART_RE.test(p));
    if (idx > 0) return parts.slice(idx).join(' ');
    if (SESSION_PART_RE.test(parts[0])) return parts[0];
  }
  const tail = name.match(SESSION_TAIL_RE);
  return tail ? tail[0].trim() : name;
}

function isQualifyingSession(session) {
  if (!session) return false;
  if (typeof session.sortMode === 'string' && session.sortMode) return session.sortMode !== 'race';
  const part = sessionPartOf(session.name);
  return QUALI_RE.test(part) && !RACE_RE.test(part);
}

// Nombre de la categoría a partir de lo que informa la fuente de cronometraje. Devuelve '' si no se puede saber con certeza:
// en ese caso el operador lo escribe a mano en el panel.
//   "125cc 4T Libre - 1era Manga"  -> "125cc 4T Libre"
//   "TC2000 Carrera 1"             -> "TC2000"
//   todos los pilotos de la misma clase (Orbits / columna Clase de Speedhive) -> esa clase
function detectCategoryName(session, drivers) {
  const name = cleanName(session && session.name);
  if (name) {
    const parts = name.split(/\s+[-–—|:]\s+/).map(cleanName).filter(Boolean);
    if (parts.length >= 2) {
      const idx = parts.findIndex((p, i) => i > 0 && SESSION_PART_RE.test(p));
      if (idx > 0) return parts.slice(0, idx).join(' - ');
      // Al revés: "1era Manga - 125cc 4T"
      if (SESSION_PART_RE.test(parts[0]) && !parts.slice(1).some(p => SESSION_PART_RE.test(p))) return parts.slice(1).join(' - ');
    }
    const tail = name.replace(SESSION_TAIL_RE, '').trim();
    if (tail && tail !== name && tail.length >= 2) return tail;
  }
  const classes = getClassNames(drivers);
  if (classes.length === 1 && Array.isArray(drivers) && drivers.length >= 2 && drivers.every(d => cleanName(d && d.make))) return classes[0];
  return '';
}

// Clases presentes en el orden en que aparecen (= la del mejor ubicado primero)
function getClassNames(drivers) {
  const seen = [];
  (Array.isArray(drivers) ? drivers : []).forEach(d => {
    const c = cleanName(d && d.make);
    if (c && !seen.includes(c)) seen.push(c);
  });
  return seen;
}

// 'auto' = multiclase si hay entre 2 y 8 clases distintas; 'on' / 'off' lo fuerzan
function isMulticlass(classes, mode) {
  if (mode === 'off') return false;
  if (mode === 'on') return classes.length >= 1;
  return classes.length >= 2 && classes.length <= 8;
}

// ---------------------------------------------------------------------------
// Correcciones manuales
// ---------------------------------------------------------------------------
// corrections = { [numero]: { name?: 'Nombre corregido', timePenalty?: segundos, dsq?: true } }
// Cada piloto corregido guarda sus valores originales en `src` para poder volver a procesarlo sin aplicar dos veces la
// penalización (por ejemplo al cargar una carrera guardada desde el panel).

function restoreSource(d) {
  const copy = Object.assign({}, d);
  if (d && d.src && typeof d.src === 'object') Object.assign(copy, d.src);
  delete copy.src;
  ['corrected', 'dsq', 'penaltySeconds', 'renamed'].forEach(k => { delete copy[k]; });
  return copy;
}

function normalizeCorrections(corrections) {
  const out = {};
  if (!corrections || typeof corrections !== 'object') return out;
  Object.keys(corrections).forEach(num => {
    const c = corrections[num];
    if (!c || typeof c !== 'object') return;
    const entry = {};
    const name = cleanName(c.name).slice(0, 80);
    if (name) entry.name = name;
    const pen = Number(c.timePenalty);
    if (Number.isFinite(pen) && pen > 0) entry.timePenalty = Math.min(3600, Math.round(pen * 1000) / 1000);
    if (c.dsq === true) entry.dsq = true;
    if (Object.keys(entry).length) out[String(num).trim().slice(0, 12)] = entry;
  });
  return out;
}

// keyOf(d) -> segundos de carrera en la última pasada por meta (para ordenar a los que están en la misma vuelta), o null
function applyCorrections(drivers, corrections, { qualifying = false, keyOf = null } = {}) {
  const corr = normalizeCorrections(corrections);
  const input = Array.isArray(drivers) ? drivers : [];
  const list = input.map(restoreSource);
  // Datos que ya pasaron por acá (por ejemplo una carrera guardada desde el panel): se vuelve al orden de la fuente
  if (input.some(d => d && d.src)) {
    list.forEach((d, i) => { d._i = i; });
    list.sort((a, b) => {
      const pa = toInt(a.pos); const pb = toInt(b.pos);
      if (pa !== null && pb !== null && pa !== pb) return pa - pb;
      if (pa === null && pb !== null) return 1;
      if (pa !== null && pb === null) return -1;
      return a._i - b._i;
    });
    list.forEach(d => { delete d._i; });
  }
  const original = new Map(list.map(d => [d, { name: d.name, totalTime: d.totalTime, pos: d.pos, diff: d.diff }]));
  let changedOrder = false;

  list.forEach(d => {
    const c = corr[String(d.number)];
    if (!c) return;
    d.corrected = true;
    if (c.name && c.name !== d.name) { d.name = c.name; d.renamed = true; }
    if (c.dsq) d.dsq = true;
    if (!qualifying && c.timePenalty) d.penaltySeconds = c.timePenalty;
  });

  const active = list.filter(d => !d.dsq);
  const disq = list.filter(d => d.dsq);
  if (disq.length) changedOrder = true;

  if (!qualifying && active.some(d => d.penaltySeconds)) {
    const key = (d) => {
      const fromCross = typeof keyOf === 'function' ? keyOf(d) : null;
      return Number.isFinite(fromCross) ? fromCross : timeToSeconds(d.totalTime);
    };
    const byLaps = new Map();
    active.forEach((d, idx) => {
      const laps = toInt(d.laps) || 0;
      if (!byLaps.has(laps)) byLaps.set(laps, []);
      byLaps.get(laps).push(idx);
    });
    byLaps.forEach(indices => {
      const group = indices.map(i => active[i]);
      if (!group.some(d => d.penaltySeconds)) return;
      const keys = group.map(key);
      // Sin el tiempo de todos los del grupo no se puede reordenar con seguridad: sólo se muestra la penalización
      if (keys.some(k => k === null)) return;
      const ranked = group
        .map((d, i) => ({ d, k: keys[i] + (d.penaltySeconds || 0), i }))
        .sort((a, b) => (a.k - b.k) || (a.i - b.i));
      if (ranked.some((r, i) => r.i !== i)) changedOrder = true;
      ranked.forEach((r, i) => {
        active[indices[i]] = r.d;
        if (i > 0) r.d.diff = `+${formatSeconds(Math.max(0, r.k - ranked[i - 1].k))}`;
        else if (indices[0] === 0) r.d.diff = '-';
      });
    });
  }

  active.forEach(d => {
    if (!d.penaltySeconds) return;
    const total = timeToSeconds(d.totalTime);
    if (total !== null) d.totalTime = formatSeconds(total + d.penaltySeconds);
  });

  if (changedOrder) active.forEach((d, i) => { d.pos = String(i + 1); });
  disq.forEach(d => { d.pos = 'DSQ'; d.diff = 'DSQ'; });
  const result = active.concat(disq);
  // Valores de la fuente de todo piloto que cambió (o de todos si cambió el orden)
  result.forEach(d => { if (d.corrected || changedOrder) d.src = original.get(d); });
  return result;
}

// ---------------------------------------------------------------------------
// Analizador con estado (una instancia por programa)
// ---------------------------------------------------------------------------

class RaceAnalyzer {
  constructor() {
    this.alerts = [];
    this.alertSeq = 0;
    this.manualGrid = null;      // { [numero]: posición } fijada a mano desde el panel (sobrevive a los cambios de sesión)
    this.resetSession('');
  }

  resetSession(key) {
    this.sessionKey = key;
    this.autoGrid = null;
    this.gridLocked = false;
    this.mode = null;            // 'total' (tiempo total de la fuente) | 'clock' (reloj de esta PC)
    this.epoch = null;
    this.track = {};             // numero -> { laps, cross: { [vuelta]: segundos }, lapSecs: [], lastCrossWall, lastLapNo }
    this.sectorPb = {};          // numero -> [s1, s2, s3]
    this.sectorBest = [null, null, null];
    this.prev = null;            // { best, flag, maxLaps } de la lectura anterior
    this.confirmedLeader = null;
    this.leaderCandidate = null;
    this.stopped = new Set();
  }

  // --- Grilla de largada ---
  setManualGrid(drivers) {
    const grid = {};
    (drivers || []).filter(d => d && !d.dsq).forEach((d, i) => {
      const p = toInt(d.pos);
      grid[String(d.srcNumber || d.number)] = p !== null ? p : i + 1;
    });
    this.manualGrid = Object.keys(grid).length ? grid : null;
  }
  // Después de borrarla no se vuelve a armar sola hasta la próxima sesión
  clearGrid() { this.manualGrid = null; this.autoGrid = null; this.gridLocked = true; }
  getGrid() { return this.manualGrid || this.autoGrid; }
  getGridInfo() {
    const grid = this.getGrid();
    return { source: this.manualGrid ? 'manual' : (this.autoGrid ? 'auto' : 'none'), count: grid ? Object.keys(grid).length : 0 };
  }

  // Segundos de carrera en la pasada por meta de la vuelta `lap` (o la última) de un piloto
  crossingTime(number, lap) {
    const t = this.track[String(number)];
    if (!t) return null;
    const l = lap === undefined ? t.lastLapNo : lap;
    const v = t.cross[l];
    return Number.isFinite(v) ? v : null;
  }

  typicalLap(number) {
    const t = this.track[String(number)];
    if (!t || !t.lapSecs.length) return null;
    const best = Math.min(...t.lapSecs);
    const recent = t.lapSecs.slice(-6).filter(s => s <= best * 1.25);
    return median(recent.length ? recent : [best]);
  }

  // Brecha vuelta a vuelta entre dos pilotos (positiva = `back` está detrás). Pendiente en s/vuelta (negativa = se acerca).
  getGapSeries(frontNumber, backNumber) {
    const f = this.track[String(frontNumber)];
    const b = this.track[String(backNumber)];
    if (!f || !b) return { series: [], rate: null, lapsToCatch: null, current: null };
    const series = [];
    Object.keys(b.cross).map(Number).sort((x, y) => x - y).forEach(lap => {
      if (Number.isFinite(f.cross[lap]) && Number.isFinite(b.cross[lap])) {
        series.push({ lap, gap: Math.round((b.cross[lap] - f.cross[lap]) * 1000) / 1000 });
      }
    });
    const tail = series.slice(-5);
    let rate = null;
    if (tail.length >= 2) {
      const n = tail.length;
      const mx = tail.reduce((s, p) => s + p.lap, 0) / n;
      const my = tail.reduce((s, p) => s + p.gap, 0) / n;
      let num = 0; let den = 0;
      tail.forEach(p => { num += (p.lap - mx) * (p.gap - my); den += (p.lap - mx) ** 2; });
      rate = den ? Math.round((num / den) * 1000) / 1000 : null;
    }
    const current = series.length ? series[series.length - 1].gap : null;
    const lapsToCatch = (rate !== null && rate < -0.02 && current !== null && current > 0) ? Math.ceil(current / -rate) : null;
    return { series, rate, lapsToCatch, current };
  }

  pushAlert(type, data, now) {
    this.alertSeq += 1;
    const alert = Object.assign({ id: `${now}-${this.alertSeq}`, type, at: now }, data);
    this.alerts.unshift(alert);
    if (this.alerts.length > MAX_ALERTS) this.alerts.length = MAX_ALERTS;
    return alert;
  }
  dismissAlert(id) { this.alerts = this.alerts.filter(a => a.id !== id); }
  clearAlerts() { this.alerts = []; }

  // --- Seguimiento de pasadas por meta ---
  trackLaps(drivers, now) {
    if (this.mode === null) {
      const withLaps = drivers.filter(d => (toInt(d.laps) || 0) > 0);
      if (withLaps.length) {
        const withTotal = withLaps.filter(d => timeToSeconds(d.totalTime) !== null);
        this.mode = withTotal.length >= withLaps.length / 2 ? 'total' : 'clock';
        this.epoch = now;
      }
    }
    drivers.forEach(d => {
      const num = String(d.number);
      const laps = toInt(d.laps);
      if (!num || num === '-' || laps === null) return;
      let t = this.track[num];
      if (!t) { t = this.track[num] = { laps, cross: {}, lapSecs: [], lastCrossWall: null, lastLapNo: null, firstSeen: now }; }
      const lastLapSec = timeToSeconds(d.lastLap);
      if (laps > t.laps || (t.lastLapNo === null && laps > 0 && this.mode === 'total')) {
        let crossT = null;
        if (this.mode === 'total') crossT = timeToSeconds(d.totalTime);
        if (crossT === null) {
          const prevT = t.cross[laps - 1];
          crossT = (Number.isFinite(prevT) && lastLapSec && laps - t.laps === 1) ? prevT + lastLapSec : (now - (this.epoch || now)) / 1000;
        }
        t.cross[laps] = Math.round(crossT * 1000) / 1000;
        // La primera vez que se ve a un piloto no se sabe cuándo pasó: no se usa para ubicarlo en el circuito
        if (laps > t.laps) t.lastCrossWall = now;
        if (laps > t.laps && lastLapSec && laps - t.laps === 1) {
          t.lapSecs.push(lastLapSec);
          if (t.lapSecs.length > 50) t.lapSecs.shift();
        }
        t.lastLapNo = laps;
        const keys = Object.keys(t.cross);
        if (keys.length > MAX_TRACKED_LAPS) delete t.cross[Math.min(...keys.map(Number))];
      }
      t.laps = Math.max(t.laps, laps);
    });
  }

  trackSectors(drivers) {
    drivers.forEach(d => {
      const num = String(d.number);
      const vals = [d.sector1, d.sector2, d.sector3].map(timeToSeconds);
      if (vals.every(v => v === null)) return;
      const pb = this.sectorPb[num] || (this.sectorPb[num] = [null, null, null]);
      vals.forEach((v, i) => {
        if (v === null) return;
        if (pb[i] === null || v < pb[i]) pb[i] = v;
        if (this.sectorBest[i] === null || v < this.sectorBest[i]) this.sectorBest[i] = v;
      });
    });
  }

  // Procesa una lectura de la fuente. opts = { corrections, multiclassMode, now }
  update(raw, opts = {}) {
    const now = Number.isFinite(opts.now) ? opts.now : Date.now();
    const session = Object.assign({}, (raw && raw.session) || {});
    const qualifying = isQualifyingSession(session);
    // Datos de la fuente sin correcciones (si llegan datos ya corregidos, se vuelve a lo que informó la fuente)
    const rawDrivers = applyCorrections(Array.isArray(raw && raw.drivers) ? raw.drivers : [], null, { qualifying });
    const newAlerts = [];

    // Sesión nueva (otro nombre) o largada nueva dentro de la misma sesión (las vueltas vuelven a cero): se reinicia todo
    const key = cleanName(session.name);
    const leaderLapsNow = rawDrivers.length ? (toInt(rawDrivers[0].laps) || 0) : 0;
    const maxLaps = rawDrivers.reduce((m, d) => Math.max(m, toInt(d.laps) || 0), 0);
    const restarted = this.prev && this.prev.maxLaps >= 3 && maxLaps <= 1 && rawDrivers.length > 0;
    if ((key && key !== this.sessionKey) || restarted) this.resetSession(key || this.sessionKey);

    if (rawDrivers.length) {
      this.trackLaps(rawDrivers, now);
      this.trackSectors(rawDrivers);
    }

    const drivers = applyCorrections(rawDrivers, opts.corrections, {
      qualifying,
      keyOf: (d) => this.crossingTime(d.number, toInt(d.laps))
    });

    // Grilla automática (sólo carreras): mientras el líder no completó vueltas se va actualizando; al largar se congela
    if (!qualifying && !this.gridLocked && drivers.length) {
      if (leaderLapsNow <= 0) {
        const g = {};
        drivers.forEach((d, i) => { if (!d.dsq) g[String(d.number)] = toInt(d.pos) || i + 1; });
        this.autoGrid = g;
      } else {
        if (!this.autoGrid && leaderLapsNow <= 1) {
          const g = {};
          drivers.forEach((d, i) => { if (!d.dsq) g[String(d.number)] = toInt(d.pos) || i + 1; });
          this.autoGrid = g;
        }
        this.gridLocked = true;
      }
    }
    const grid = qualifying ? null : this.getGrid();

    const classes = getClassNames(drivers);
    const multiclass = isMulticlass(classes, opts.multiclassMode || 'auto');
    const classCount = {};
    const sessionBest = drivers.reduce((m, d) => { const s = timeToSeconds(d.bestLap); return s !== null && (m === null || s < m) ? s : m; }, null);

    drivers.forEach(d => {
      const num = String(d.number);
      const posNum = toInt(d.pos);

      if (grid && grid[num] !== undefined && posNum !== null) {
        d.startPos = grid[num];
        d.posGain = grid[num] - posNum;
      } else { d.startPos = null; d.posGain = null; }

      const cls = multiclass ? cleanName(d.make) : '';
      d.cls = cls;
      if (multiclass && cls && !d.dsq) {
        classCount[cls] = (classCount[cls] || 0) + 1;
        d.classPos = classCount[cls];
        d.classLeader = classCount[cls] === 1;
      } else { d.classPos = null; d.classLeader = false; }

      // Sectores: color de cada sector mostrado y vuelta teórica (suma de los mejores sectores personales)
      const vals = [d.sector1, d.sector2, d.sector3].map(timeToSeconds);
      const pb = this.sectorPb[num];
      d.sectorColors = vals.map((v, i) => {
        if (v === null) return '';
        if (this.sectorBest[i] !== null && v <= this.sectorBest[i] + 0.0005) return 'purple';
        if (pb && pb[i] !== null && v <= pb[i] + 0.0005) return 'green';
        return 'yellow';
      });
      d.sectorPb = pb ? pb.map(v => (v === null ? '' : formatSeconds(v))) : ['', '', ''];
      d.theoreticalBest = pb && pb.every(v => v !== null) ? formatSeconds(pb[0] + pb[1] + pb[2]) : '';

      // Posición estimada en el circuito: segundos desde la última pasada y vuelta típica
      const tr = this.track[num];
      const lapTime = this.typicalLap(num) || timeToSeconds(d.bestLap) || timeToSeconds(d.lastLap);
      d.lapProgress = (tr && tr.lastCrossWall && lapTime) ? { since: Math.round((now - tr.lastCrossWall) / 100) / 10, lapTime: Math.round(lapTime * 1000) / 1000 } : null;
      d.onTrack = !!(d.lapProgress && d.lapProgress.since < lapTime * 1.5);

      // "En vuelta rápida" (clasificación con sectores): ningún sector parcial es peor que su mejor personal
      const hasSector = d.sectorColors.some(Boolean);
      d.onPushLap = !!(qualifying && d.onTrack && hasSector && d.sectorColors.every(c => c !== 'yellow'));

      d.stopped = false;
      d.isFastest = sessionBest !== null && timeToSeconds(d.bestLap) === sessionBest;
    });

    // --- Datos de la pestaña PILOTOS (lo que la fuente no informa o informa mal) ---
    // Se aplican después del análisis (que usa el número de la fuente) y antes de las alertas y la salida.
    const roster = normalizeRoster(opts.roster);
    drivers.forEach(d => {
      const src = String(d.number);
      const r = roster[src] || {};
      d.srcNumber = src;
      d.brand = r.brand && brandExists(r.brand) ? r.brand : detectBrand([d.make, ...(Array.isArray(d.extra) ? d.extra : [])]);
      if (r.team) d.team = r.team;
      if (r.name && !d.renamed) d.name = r.name;
      if (r.number) d.number = r.number;
    });

    // --- Alertas ---
    const leader = drivers.find(d => !d.dsq);
    const flag = String(session.flag || '').toLowerCase();
    const finished = /checker|finish|cuadros/.test(flag);
    // Volver a procesar la misma lectura (correcciones, grilla, multiclase) no genera alertas: no es información nueva
    const reprocess = !!opts.reprocess;
    if (this.prev && !reprocess) {
      // Vuelta rápida de la sesión
      if (sessionBest !== null && this.prev.best !== null && sessionBest < this.prev.best - 0.0005) {
        const who = drivers.find(d => timeToSeconds(d.bestLap) === sessionBest);
        if (who) newAlerts.push(this.pushAlert('fastestLap', { number: who.number, name: who.name, time: who.bestLap }, now));
      }
      // Cambio de bandera informado por la fuente
      if (flag && flag !== this.prev.flag) newAlerts.push(this.pushAlert('flag', { flag }, now));
    }

    // Posible abandono: no pasa por meta hace mucho mientras el resto sigue girando (sólo en carrera, sin bandera roja / cuadros)
    if (!qualifying && !finished && !/red|roja/.test(flag)) {
      const someoneMoving = drivers.some(d => d.lapProgress && d.lapProgress.since < d.lapProgress.lapTime);
      drivers.forEach(d => {
        const num = String(d.number);
        if (!d.lapProgress || d.dsq) return;
        const limit = Math.max(d.lapProgress.lapTime * STOP_FACTOR, d.lapProgress.lapTime + STOP_MIN_EXTRA);
        if (d.lapProgress.since > limit && someoneMoving) {
          d.stopped = true;
          if (!this.stopped.has(num) && !reprocess) {
            this.stopped.add(num);
            newAlerts.push(this.pushAlert('stopped', { number: d.number, name: d.name, lap: toInt(d.laps) }, now));
          }
        } else if (d.lapProgress.since < d.lapProgress.lapTime) {
          this.stopped.delete(num);
        }
      });
    }

    // Cambio de líder: el nuevo tiene que repetirse en 2 lecturas seguidas (un parpadeo de la fuente no cuenta).
    // En carrera, recién cuenta cuando el líder ya completó una vuelta; en clasificación, cuando tiene tiempo.
    const leaderValid = leader && (qualifying ? timeToSeconds(leader.bestLap) !== null : leaderLapsNow >= 1);
    if (leaderValid && reprocess) {
      this.confirmedLeader = leader.number;
      this.leaderCandidate = null;
    } else if (leaderValid) {
      if (this.confirmedLeader === null) {
        this.confirmedLeader = leader.number;
      } else if (leader.number !== this.confirmedLeader) {
        if (this.leaderCandidate && this.leaderCandidate.number === leader.number) this.leaderCandidate.ticks += 1;
        else this.leaderCandidate = { number: leader.number, ticks: 1 };
        if (this.leaderCandidate.ticks >= LEADER_STABLE_TICKS) {
          const from = drivers.find(d => d.number === this.confirmedLeader);
          newAlerts.push(this.pushAlert('leaderChange', {
            number: leader.number, name: leader.name, qualifying,
            prevNumber: this.confirmedLeader, prevName: from ? from.name : ''
          }, now));
          this.confirmedLeader = leader.number;
          this.leaderCandidate = null;
        }
      } else {
        this.leaderCandidate = null;
      }
    }

    this.prev = {
      best: sessionBest,
      flag: flag || (this.prev ? this.prev.flag : ''),
      maxLaps
    };

    const gridInfo = this.getGridInfo();
    const outSession = Object.assign(session, {
      qualifying,
      detectedCategory: detectCategoryName(session, rawDrivers),
      classes: multiclass ? classes : [],
      multiclass,
      gridSource: qualifying ? 'none' : gridInfo.source,
      bestSectors: this.sectorBest.map(v => (v === null ? '' : formatSeconds(v))),
      idealLap: this.sectorBest.every(v => v !== null) ? formatSeconds(this.sectorBest[0] + this.sectorBest[1] + this.sectorBest[2]) : '',
      bestLap: sessionBest !== null ? formatSeconds(sessionBest) : ''
    });

    return { leaderboard: Object.assign({}, raw, { session: outSession, drivers }), newAlerts };
  }
}

module.exports = {
  normalizeRoster,
  detectBrand,
  brandExists,
  RaceAnalyzer,
  applyCorrections,
  normalizeCorrections,
  detectCategoryName,
  isQualifyingSession,
  getClassNames,
  isMulticlass,
  timeToSeconds,
  formatSeconds
};
