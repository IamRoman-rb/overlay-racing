import { useEffect, useState } from 'react';
import { getAnimDuration, getRollClip } from './animationTiming';

// Colores de clase por defecto (multiclase). Se pueden cambiar uno por uno en el panel (config.classColors).
export const CLASS_PALETTE = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1'];

export function getClassColor(config, className, classes) {
  if (!className) return null;
  const custom = config?.classColors?.[className];
  if (custom) return custom;
  const list = Array.isArray(classes) && classes.length ? classes : [className];
  const idx = Math.max(0, list.indexOf(className));
  return CLASS_PALETTE[idx % CLASS_PALETTE.length];
}

// Colores de sectores estilo TV: violeta = mejor de la sesión, verde = mejor personal, amarillo = más lento
export const SECTOR_COLORS = { purple: '#a23cf0', green: '#21c45a', yellow: '#f5c518', '': 'rgba(255,255,255,0.12)' };

export function timeToSeconds(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(',', '.').replace(/^\+/, '');
  if (!s || !/^\d+(:\d+){0,2}(\.\d+)?$/.test(s)) return null;
  let total = 0;
  s.split(':').forEach(part => { total = total * 60 + parseFloat(part); });
  return Number.isFinite(total) && total > 0 ? total : null;
}

export function formatSeconds(sec, decimals = 3) {
  if (sec === null || sec === undefined || !Number.isFinite(sec) || sec < 0) return '';
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(decimals);
  return m > 0 ? `${m}:${s.padStart(decimals + 3, '0')}` : s;
}

// Posiciones que cambiaron en la última lectura. Cada flecha queda visible `holdMs` y después desaparece.
// Devuelve { [numero]: 'up' | 'down' }. Se compara con la lectura anterior guardada en el estado (sin efectos).
export function usePositionTrends(drivers, holdMs = 8000) {
  const [now, setNow] = useState(() => Date.now());
  const [prevDrivers, setPrevDrivers] = useState(drivers);
  const [trends, setTrends] = useState({});
  if (drivers !== prevDrivers) {
    const before = {};
    (prevDrivers || []).forEach(d => { before[d.number] = parseInt(d.pos, 10); });
    const next = {};
    Object.keys(trends).forEach(num => { if (now - trends[num].at < holdMs) next[num] = trends[num]; });
    (drivers || []).forEach(d => {
      const prev = before[d.number];
      const cur = parseInt(d.pos, 10);
      if (Number.isFinite(prev) && Number.isFinite(cur) && prev !== cur) next[d.number] = { dir: cur < prev ? 'up' : 'down', at: now };
    });
    setPrevDrivers(drivers);
    setTrends(next);
  }
  // Reloj de 1 s para que las flechas se apaguen solas aunque no lleguen datos nuevos
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const out = {};
  Object.keys(trends).forEach(num => { if (now - trends[num].at < holdMs) out[num] = trends[num].dir; });
  return out;
}

// Flecha + cantidad de posiciones: respecto de la largada (si hay grilla) o del último cambio.
// mode: 'start' (largada; si no hay grilla, último cambio) | 'live' (último cambio) | 'off'
export function getPositionArrow(driver, liveTrends, mode = 'start') {
  if (mode === 'off' || !driver) return null;
  if (mode === 'start' && Number.isFinite(driver.posGain)) {
    if (driver.posGain > 0) return { dir: 'up', n: driver.posGain };
    if (driver.posGain < 0) return { dir: 'down', n: -driver.posGain };
    return { dir: 'same', n: 0 };
  }
  const live = liveTrends && liveTrends[driver.number];
  return live ? { dir: live, n: null } : null;
}

// Reloj local para lo que se mueve entre lecturas (mapa del circuito, vuelta en curso). Devuelve
// { now, receivedAt }: receivedAt = cuándo llegaron los datos actuales a ESTA pantalla (las PC de vMix tienen otro reloj).
// Mientras la gráfica está oculta el reloj sigue, más lento, para que al aparecer no arranque con una hora vieja.
export function useLiveClock(active, data, intervalMs = 200) {
  const [now, setNow] = useState(() => Date.now());
  const [stamp, setStamp] = useState({ data, at: now });
  if (stamp.data !== data) setStamp({ data, at: now });
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), active ? intervalMs : 1000);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return { now: Math.max(now, stamp.at), receivedAt: stamp.at };
}

// Segundos desde la última pasada por meta, sumando lo que pasó desde que llegaron los datos
export function secondsSinceCross(driver, clock) {
  if (!driver || !driver.lapProgress) return null;
  return driver.lapProgress.since + Math.max(0, (clock.now - clock.receivedAt) / 1000);
}

export const ARROW_COLORS = { up: '#2ecc71', down: '#e74c3c', same: '#7f8c8d' };

// Marco común de las gráficas nuevas: posición, escala, colores del tema y transición de entrada configurables en PERSONALIZAR
export function getGraphicFrame(config, id, isVisible, defaults = { x: 100, y: 100, scale: 1 }, zIndex = 40) {
  const pos = config?.positions?.[id] || defaults;
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  let hidden = `scale(${pos.scale}) translateY(-20px)`;
  if (animStyle === 'fade') hidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') hidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') hidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') hidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') hidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;
  const shown = isVisible || animStyle === 'roll';
  return {
    wrapperStyle: {
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left', zIndex,
      pointerEvents: 'none',
      transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
      opacity: shown ? 1 : 0,
      transform: shown ? `scale(${pos.scale}) translateY(0)` : hidden,
      ...getRollClip(animStyle, isVisible)
    },
    bRad: config?.[`borderRadius_${id}`] || '8px',
    customBg: config?.[`design_${id}`] || null,
    theme: {
      bg: config?.themeBg || 'rgba(0,0,0,0.88)',
      headerBg: config?.themeHeaderBg || '#000000',
      main: config?.themeMain || '#e74c3c',
      secondary: config?.themeSecondary || '#3498db',
      accent: config?.themeAccent || '#f39c12',
      title: config?.themeTitleText || '#ffcc00',
      text: config?.themeNormalText || '#ffffff',
      number: config?.themeNumberText || '#bdc3c7'
    }
  };
}
