// BANDERA VIGENTE para mostrar dentro de las gráficas (tira, torre, contador de vueltas...).
// Manda la bandera puesta a mano en el PANEL (BANDERAS DE CARRERA, llega en sessionInfo.manualFlags); si no hay ninguna,
// la que informa el cronometraje (sessionInfo.flag: Speedhive / Race Monitor). Sin datos -> null (no se muestra nada).

// Prioridad cuando hay varias banderas manuales activas (igual que la gráfica BANDERAS)
const MANUAL_ORDER = ['red', 'tricolor', 'black', 'blue', 'checkered', 'green'];

export const FLAG_INFO = {
  green: { key: 'green', short: 'VERDE', label: 'PISTA LIBRE', color: '#1fbf5f', text: '#000000' },
  yellow: { key: 'yellow', short: 'AMARILLA', label: 'BANDERA AMARILLA', color: '#ffd60a', text: '#000000' },
  tricolor: { key: 'tricolor', short: 'SAFETY CAR', label: 'AUTO DE SEGURIDAD', color: '#ff8200', text: '#000000', stripes: ['#0033a0', '#ffffff', '#ff8200'] },
  red: { key: 'red', short: 'ROJA', label: 'BANDERA ROJA', color: '#e8183f', text: '#ffffff' },
  black: { key: 'black', short: 'NEGRA', label: 'BANDERA NEGRA', color: '#111111', text: '#ffffff', border: '#ffffff' },
  blue: { key: 'blue', short: 'AZUL', label: 'BANDERA AZUL', color: '#2980b9', text: '#ffffff' },
  checkered: { key: 'checkered', short: 'ÚLT. VUELTA', label: 'ÚLTIMA VUELTA', color: '#ffffff', text: '#000000', checker: true },
  finish: { key: 'finish', short: 'FINAL', label: 'SESIÓN FINALIZADA', color: '#ffffff', text: '#000000', checker: true },
  purple: { key: 'purple', short: 'VSC', label: 'SAFETY CAR VIRTUAL', color: '#9b59b6', text: '#ffffff' },
  white: { key: 'white', short: 'ÚLT. VUELTA', label: 'ÚLTIMA VUELTA', color: '#ffffff', text: '#000000' }
};

// Normaliza la bandera que manda el cronometraje (textos / clases en inglés o castellano)
export function timingFlagKey(raw) {
  const f = String(raw || '').toLowerCase();
  if (!f) return null;
  if (/red|roja/.test(f)) return 'red';
  if (/checker|finish|cuadros|chequered|final/.test(f)) return 'finish';
  if (/safety|\bsc\b|seguridad/.test(f)) return 'tricolor';
  if (/purple|vsc|virtual|code\s*60/.test(f)) return 'purple';
  if (/yellow|amarill|caution|fcy/.test(f)) return 'yellow';
  if (/white|blanca/.test(f)) return 'white';
  if (/green|verde/.test(f)) return 'green';
  return null;
}

export function currentFlag(sessionInfo, config) {
  const manual = sessionInfo?.manualFlags || {};
  const manualKey = MANUAL_ORDER.find(k => manual[k]);
  if (manualKey) {
    const info = { ...FLAG_INFO[manualKey], manual: true };
    if (manualKey === 'black' && config?.blackFlagNumber) info.label = `BANDERA NEGRA · AUTO ${config.blackFlagNumber}`;
    return info;
  }
  const key = timingFlagKey(sessionInfo?.flag);
  return key ? { ...FLAG_INFO[key], manual: false } : null;
}

// PROGRESO DE LA SESIÓN a partir de lo que informa el cronometraje:
//   lap: vueltas del líder · lapsToGo / total: vueltas que faltan y total (Race Monitor "Laps to go", Speedhive "laps")
//   timeToGo: tiempo restante (carreras por tiempo; "00:00:00" no cuenta) · elapsed: tiempo transcurrido
// Con la sesión terminada no se muestran faltantes. sessionInfo.manualTotalLaps: total cargado a mano en el PANEL.
export function sessionProgress(sessionInfo) {
  const s = sessionInfo || {};
  const lap = parseInt(s.laps, 10);
  const toGo = parseInt(s.lapsToGo, 10);
  const finished = timingFlagKey(s.flag) === 'finish';
  const hasToGo = !finished && Number.isFinite(toGo) && toGo >= 0 && toGo < 500;
  const lapOk = Number.isFinite(lap) && lap >= 0;
  // Total de vueltas cargado a mano en el PANEL (manda sobre lo que informa el cronometraje)
  const manualTotal = parseInt(s.manualTotalLaps, 10);
  if (Number.isFinite(manualTotal) && manualTotal > 0) {
    return {
      lap: lapOk ? lap : null,
      lapsToGo: lapOk && !finished ? Math.max(0, manualTotal - lap) : null,
      total: manualTotal,
      timeToGo: !finished && s.timeToGo && /[1-9]/.test(String(s.timeToGo)) ? String(s.timeToGo) : '',
      elapsed: s.totalTime && s.totalTime !== '-' ? String(s.totalTime) : '',
      finished,
      manual: true
    };
  }
  return {
    lap: lapOk ? lap : null,
    lapsToGo: hasToGo ? toGo : null,
    total: hasToGo && lapOk ? lap + toGo : null,
    timeToGo: !finished && s.timeToGo && /[1-9]/.test(String(s.timeToGo)) ? String(s.timeToGo) : '',
    elapsed: s.totalTime && s.totalTime !== '-' ? String(s.totalTime) : '',
    finished
  };
}
