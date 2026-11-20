// PANEL DE EQUIPOS (overlayracing.site/equipos/:token): lo que se manda en vivo al servidor para que los equipos lo
// vean en el celular escaneando un QR. Dos envíos por el socket del cloud (ver main.cjs):
//   push-equipos-conditions: circuito, trazado, viento por tramo, temperatura de pista, clima y radar (lo arma el panel,
//                            utils/teamFeed.js, porque usa el cálculo de las gráficas). Se manda sólo cuando cambia.
//   push-equipos-live:       pilotos y sesión (lo arma este archivo con cada lectura del cronometraje), como mucho
//                            1 vez por segundo.
// Todos los envíos llevan la CLAVE DE EQUIPOS (secreta, pestaña CLOUD), nunca el token público del QR.

const LIVE_VERSION = 1;
const str = (v) => (v === null || v === undefined ? '' : String(v));

// Lectura del cronometraje -> datos en vivo para los equipos (sin campos internos del programa)
function buildTeamLive(leaderboard, { now = Date.now(), flags = null } = {}) {
  const s = (leaderboard && leaderboard.session) || {};
  const drivers = (leaderboard && Array.isArray(leaderboard.drivers) ? leaderboard.drivers : []).map(d => ({
    pos: str(d.pos),
    number: str(d.number),
    name: str(d.name),
    team: str(d.team),
    cls: str(d.cls),
    classPos: d.classPos ?? null,
    laps: str(d.laps),
    lastLap: str(d.lastLap),
    bestLap: str(d.bestLap),
    gap: str(d.gap),
    diff: str(d.diff),
    posGain: d.posGain ?? null,
    isFastest: !!d.isFastest,
    onTrack: !!d.onTrack,
    stopped: !!d.stopped,
    dsq: !!d.dsq,
    brand: str(d.brand),
    country: str(d.country),
    sectorColors: Array.isArray(d.sectorColors) ? d.sectorColors : [],
    // Avance de la vuelta al momento `at`: since = segundos desde la última pasada por meta, lapTime = vuelta típica.
    // La web lo extrapola: fracción = (since + segundos transcurridos desde `at`) / lapTime.
    lapProgress: d.lapProgress && Number.isFinite(d.lapProgress.since) && Number.isFinite(d.lapProgress.lapTime)
      ? { since: d.lapProgress.since, lapTime: d.lapProgress.lapTime } : null
  }));
  const activeFlags = flags && typeof flags === 'object' ? Object.keys(flags).filter(k => flags[k] === true) : [];
  return {
    v: LIVE_VERSION,
    at: now,
    session: {
      name: str(s.name),
      flag: str(s.flag),
      lapsToGo: str(s.lapsToGo),
      timeToGo: str(s.timeToGo),
      qualifying: !!s.qualifying,
      category: str(s.detectedCategory),
      multiclass: !!s.multiclass,
      classes: Array.isArray(s.classes) ? s.classes : [],
      bestLap: s.bestLap || null,
      idealLap: s.idealLap || null
    },
    flags: activeFlags,
    drivers
  };
}

// Envío con límite de frecuencia: el primero sale enseguida y, si llegan más dentro del intervalo, sale sólo el último
function createThrottle(fn, ms = 1000, { now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let last = -Infinity; let timer = null; let pending;
  const fire = () => { timer = null; last = now(); const v = pending; pending = undefined; fn(v); };
  const call = (v) => {
    pending = v;
    const wait = ms - (now() - last);
    if (wait <= 0 && !timer) { fire(); return; }
    if (!timer) timer = setTimer(fire, Math.max(0, wait));
  };
  call.cancel = () => { if (timer) clearTimer(timer); timer = null; pending = undefined; };
  return call;
}

module.exports = { buildTeamLive, createThrottle, LIVE_VERSION };
