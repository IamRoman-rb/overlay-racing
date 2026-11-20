// CLIMA desde MET Norway (api.met.no, Instituto Meteorológico de Noruega): gratis también para uso comercial
// (licencia CC BY 4.0: hay que nombrar la fuente). Sus condiciones piden:
//   - un User-Agent que identifique a la aplicación (el navegador no deja cambiarlo: por eso se pide desde acá)
//   - coordenadas con 4 decimales como máximo
//   - respetar el encabezado Expires (no volver a pedir un punto antes de que venza) y no más de 20 pedidos por segundo
// https://api.met.no/doc/TermsOfService
//
// Se devuelve sólo lo que usa el programa (las próximas horas de cada punto), así el IPC no mueve megas de JSON.

const BASE = 'https://api.met.no/weatherapi/locationforecast/2.0';
const MAX_POINTS = 300;
const r4 = (v) => Math.round(Number(v) * 10000) / 10000;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Recorta la respuesta de MET a las próximas `hours` horas: [{ time (ISO UTC), t, at, ws (m/s), wd, rh, cloud, p1, p6, s1, s6 }]
function trimMet(json, hours = 8) {
  const ts = json && json.properties && Array.isArray(json.properties.timeseries) ? json.properties.timeseries : [];
  const series = ts.slice(0, hours).map(e => {
    const d = (e.data && e.data.instant && e.data.instant.details) || {};
    const n1 = (e.data && e.data.next_1_hours) || {};
    const n6 = (e.data && e.data.next_6_hours) || {};
    return {
      time: e.time,
      t: num(d.air_temperature),
      at: num(d.apparent_air_temperature),
      ws: num(d.wind_speed),
      wd: num(d.wind_from_direction),
      rh: num(d.relative_humidity),
      cloud: num(d.cloud_area_fraction),
      p1: num(n1.details && n1.details.precipitation_amount),
      p6: num(n6.details && n6.details.precipitation_amount),
      s1: (n1.summary && n1.summary.symbol_code) || null,
      s6: (n6.summary && n6.summary.symbol_code) || null
    };
  });
  const meta = (json && json.properties && json.properties.meta) || {};
  return { updatedAt: meta.updated_at || null, series };
}

// Cliente con caché (por punto, hasta el Expires que manda MET) y pedidos en paralelo limitados.
function createMetClient({ version = '0', fetchImpl = globalThis.fetch, concurrency = 4, gapMs = 70, now = () => Date.now(), sleep = (ms) => new Promise(r => setTimeout(r, ms)) } = {}) {
  const cache = new Map(); // clave -> { expires, data }
  const userAgent = `OverlayRacing/${version} overlayracing.site`;
  // Separación mínima entre pedidos: como mucho ~14 por segundo (MET pide no pasar de 20)
  let nextSlot = 0;
  const throttle = async () => {
    const t = now();
    const wait = Math.max(0, nextSlot - t);
    nextSlot = Math.max(t, nextSlot) + gapMs;
    if (wait > 0) await sleep(wait);
  };

  async function one(p, complete, hours) {
    const lat = r4(p.lat); const lon = r4(p.lon);
    const key = `${complete ? 'c' : 'k'}:${lat},${lon}`;
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return trimMet(hit.data, hours);
    await throttle();
    const url = `${BASE}/${complete ? 'complete' : 'compact'}?lat=${lat}&lon=${lon}`;
    const res = await fetchImpl(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`MET Norway HTTP ${res.status}`);
    const data = await res.json();
    const exp = Date.parse(res.headers && res.headers.get ? res.headers.get('expires') || '' : '');
    cache.set(key, { expires: Number.isFinite(exp) ? exp : now() + 30 * 60 * 1000, data });
    if (cache.size > 2000) cache.delete(cache.keys().next().value);
    return trimMet(data, hours);
  }

  // points: [{ lat, lon }]. Devuelve una lista del mismo largo (null en los puntos que fallaron).
  // Si fallan todos, lanza el error (sin conexión, etc.).
  async function forecast(points, { complete = false, hours = 8 } = {}) {
    const list = (Array.isArray(points) ? points : []).slice(0, MAX_POINTS)
      .filter(p => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
    if (!list.length) throw new Error('Sin coordenadas');
    const out = new Array(list.length).fill(null);
    let next = 0; let lastError = null;
    const worker = async () => {
      while (next < list.length) {
        const i = next++;
        try { out[i] = await one(list[i], complete, hours); } catch (e) { lastError = e; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
    if (out.every(v => v === null)) throw lastError || new Error('Sin datos de MET Norway');
    return out;
  }

  return { forecast, userAgent };
}

module.exports = { trimMet, createMetClient };
