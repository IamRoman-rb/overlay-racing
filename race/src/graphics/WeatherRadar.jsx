// RADAR DEL CLIMA: mapa de calor de la zona alrededor del circuito (grilla de Open-Meteo, config.weatherGrid, pedida
// desde el PANEL). El norte queda arriba y el circuito en el centro.
// Capas (PERSONALIZAR, config.weatherRadarLayer): rain (lluvia, por defecto) | temp (temperatura del aire) | wind (viento)
// Con config.weatherRadarAnimate (por defecto sí) la lluvia / temperatura recorre las próximas horas, como un radar.
// Formatos: standard | compact | large | minimal | skins.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getGraphicFrame, getFormatStyles, useImageAspect } from '../utils/raceVisuals';
import { buildTrack, DEFAULT_ASPECT } from '../utils/trackPath';
import { airColor, rainColor, median, radarLayerValues, AIR_STOPS, RAIN_STOPS } from '../utils/trackConditions';
import { windIntensityColor, getWindDirLabel } from '../utils/weather';
import CategoryTag from '../components/CategoryTag';
import { makeFx } from '../utils/contentAnim';

const FRAME_MS = 1300;
const HOLD_MS = 2600;   // pausa en "AHORA" y al final de la animación

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// Pinta la grilla n x n en un canvas chico y lo estira con suavizado: interpolación bilineal entre los puntos
function useHeatCanvas(canvasRef, { values, n, size, layer, scale }) {
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !values?.length || typeof document === 'undefined') return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const small = document.createElement('canvas');
    small.width = n; small.height = n;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(n, n);
    values.forEach((v, i) => {
      let color = null; let alpha = 0;
      if (layer === 'rain') { color = rainColor(v); alpha = color ? Math.min(235, 150 + (Number(v) || 0) * 12) : 0; }
      else if (Number.isFinite(v)) { color = airColor(scale(v)); alpha = layer === 'wind' ? 120 : 215; }
      const [r, g, b] = color ? hexRgb(color) : [0, 0, 0];
      img.data.set([r, g, b, alpha], i * 4);
    });
    sctx.putImageData(img, 0, 0);
    // Paso intermedio para suavizar más
    const mid = document.createElement('canvas');
    mid.width = n * 8; mid.height = n * 8;
    const mctx = mid.getContext('2d');
    mctx.imageSmoothingEnabled = true; mctx.imageSmoothingQuality = 'high';
    mctx.drawImage(small, 0, 0, mid.width, mid.height);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // Los puntos de la grilla van de borde a borde: medio píxel de la grilla chica queda afuera del mapa
    const cell = size / (n - 1);
    ctx.drawImage(mid, -cell / 2, -cell / 2, size + cell, size + cell);
  }, [canvasRef, values, n, size, layer, scale]);
}

export default function WeatherRadar({ config, isVisible, id = 'weatherRadar' }) {
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 1360, y: 300, scale: 1 });
  const format = config?.[`${id}Format`] || 'standard';
  const f = getFormatStyles(format === 'large' ? 'standard' : format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const compact = format === 'compact';
  const large = format === 'large';
  const S = large ? 680 : compact ? 330 : 470;
  const fs = large ? 1.35 : compact ? 0.85 : 1;
  const px = (v) => `${Math.round(v * fs)}px`;
  const layer = ['temp', 'wind'].includes(config?.weatherRadarLayer) ? config.weatherRadarLayer : 'rain';
  const grid = config?.weatherGrid || null;
  const n = grid?.n || 0;
  const frames = useMemo(() => grid?.frames || [], [grid]);
  const animate = config?.weatherRadarAnimate !== false && layer !== 'wind' && frames.length > 0;

  // Animación: -1 = ahora, 0..frames-1 = próximas horas
  const [frame, setFrame] = useState(-1);
  useEffect(() => {
    if (!animate || !isVisible) return undefined;
    let cur = -1; let timer = null;
    const tick = () => {
      cur = cur >= frames.length - 1 ? -1 : cur + 1;
      setFrame(cur);
      timer = setTimeout(tick, cur === -1 || cur === frames.length - 1 ? HOLD_MS : FRAME_MS);
    };
    const reset = setTimeout(() => setFrame(-1), 0);
    timer = setTimeout(tick, HOLD_MS);
    return () => { clearTimeout(reset); clearTimeout(timer); };
  }, [animate, isVisible, frames.length]);
  const shownFrame = animate && isVisible ? Math.min(frame, frames.length - 1) : -1;

  const values = useMemo(() => radarLayerValues(grid, layer === 'wind' ? 'temp' : layer, shownFrame), [grid, layer, shownFrame]);
  // Escala divergente de temperatura centrada en la mediana de la zona (todas las horas, para que no salte)
  const tempScale = useMemo(() => {
    const all = [...(grid?.cells || []).map(c => c.temp), ...frames.flatMap(fr => fr.temp || [])].filter(Number.isFinite);
    const med = median(all) ?? 20;
    const dev = Math.max(2, ...all.map(v => Math.abs(v - med)));
    return { med, dev, min: med - dev, max: med + dev, fn: (v) => 0.5 + (v - med) / (2 * dev) };
  }, [grid, frames]);

  const canvasRef = useRef(null);
  useHeatCanvas(canvasRef, { values, n, size: S, layer, scale: tempScale.fn });

  // Circuito en el centro (con su trazado si está dibujado)
  const trackImage = config?.trackImage || null;
  const imageAspect = useImageAspect(trackImage);
  const aspect = trackImage ? imageAspect : DEFAULT_ASPECT;
  const mini = useMemo(() => (aspect ? buildTrack(config?.trackPath, { width: S * 0.16, fit: true, pad: 2, minHeight: S * 0.06, maxHeight: S * 0.16, aspect }) : null), [config?.trackPath, aspect, S]);

  const center = Math.floor((n * n) / 2);
  const centerCell = grid?.cells?.[center];
  // Lluvia en el circuito en las próximas horas: la mayor probabilidad del punto central
  const nextProb = frames.length ? Math.max(...frames.map(fr => Number(fr.prob?.[center]) || 0)) : null;
  const rainingNear = layer === 'rain' && values.some(v => (Number(v) || 0) >= 0.1);
  const km = grid?.km || 40;
  const timeLabel = shownFrame >= 0 ? `+${shownFrame + 1} H · ${frames[shownFrame]?.time || ''}` : `AHORA${grid?.time ? ` · ${grid.time}` : ''}`;
  const place = config?.circuitName || config?.circuito || grid?.place || '';
  const fx = makeFx(config, id, isVisible);

  // Flechas de viento por punto de la grilla
  const windArrows = layer === 'wind' && grid ? grid.cells.map((c, i) => {
    if (!Number.isFinite(c.dir) || !Number.isFinite(c.wind)) return null;
    const r = Math.floor(i / n); const col = i % n;
    if (r === 0 || col === 0 || r === n - 1 || col === n - 1 || i === center) return null;   // bordes cortados y el circuito
    const x = (col / (n - 1)) * S; const y = (r / (n - 1)) * S;
    const len = Math.min(S / n * 0.9, 10 + c.wind * 0.7) * (large ? 1.3 : 1);
    return { x, y, angle: c.dir + 90, len, color: windIntensityColor(c.wind) };
  }).filter(Boolean) : [];

  const ring = (fr, label) => (
    <g key={label}>
      <circle cx={S / 2} cy={S / 2} r={(S / 2) * fr} fill="none" stroke="rgba(255,255,255,0.28)" strokeDasharray="3 5" />
      <text x={S / 2 + 4} y={S / 2 - (S / 2) * fr + 12 * fs} fontSize={9 * fs} fontWeight="800" fill="rgba(255,255,255,0.6)">{label}</text>
    </g>
  );

  const legend = layer === 'rain'
    ? { title: 'LLUVIA', left: '0,1', right: '20 MM/H', stops: RAIN_STOPS }
    : { title: layer === 'wind' ? 'AIRE' : 'TEMPERATURA', left: `${Math.round(tempScale.min)}°`, right: `${Math.round(tempScale.max)}°`, stops: AIR_STOPS };

  return (
    <div style={wrapperStyle}>
      <div className={fx.group} style={{ ...f.box, width: `${S}px` }}>
        <div style={{ display: f.minimal ? 'none' : 'flex', padding: compact ? '6px 10px' : '8px 14px', backgroundColor: f.headerBg, borderBottom: f.headerBorder, color: theme.title, fontWeight: 900, fontSize: px(12), letterSpacing: '2px', justifyContent: 'space-between', alignItems: 'center', textShadow: f.textShadow }}>
          <span>RADAR DEL CLIMA<CategoryTag config={config} id={id} /></span>
          <span style={{ color: theme.text, letterSpacing: '1px', fontSize: px(11) }}>{timeLabel}</span>
        </div>
        <div style={{ position: 'relative', width: `${S}px`, height: `${S}px`, backgroundColor: '#0d1520', overflow: 'hidden' }}>
          {/* Cuadrícula tenue de fondo */}
          <svg width={S} height={S} style={{ position: 'absolute', left: 0, top: 0 }}>
            {Array.from({ length: 7 }, (_, i) => (i + 1) / 8).map(v => (
              <g key={v}>
                <line x1={v * S} y1="0" x2={v * S} y2={S} stroke="rgba(255,255,255,0.06)" />
                <line x1="0" y1={v * S} x2={S} y2={v * S} stroke="rgba(255,255,255,0.06)" />
              </g>
            ))}
          </svg>
          <canvas ref={canvasRef} width={S} height={S} style={{ position: 'absolute', left: 0, top: 0, transition: 'opacity 0.4s' }} />
          <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden' }}>
            {ring(0.5, `${Math.round(km / 2)} KM`)}
            {ring(1, `${Math.round(km)} KM`)}
            {/* Valores de temperatura en algunos puntos */}
            {layer === 'temp' && grid && values.map((v, i) => {
              const r = Math.floor(i / n); const c = i % n;
              if (!Number.isFinite(v) || r % 2 || c % 2 || r === 0 || c === 0 || r === n - 1 || c === n - 1 || i === center) return null;
              return <text key={i} x={(c / (n - 1)) * S} y={(r / (n - 1)) * S + 4} textAnchor="middle" fontSize={11 * fs} fontWeight="900" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3 }}>{Math.round(v)}°</text>;
            })}
            {windArrows.map((a, i) => (
              <g key={i} transform={`translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${a.angle.toFixed(1)})`}>
                <path d={`M ${-a.len / 2} 0 H ${a.len / 2} M ${a.len / 2 - 5} -4 L ${a.len / 2} 0 L ${a.len / 2 - 5} 4`} stroke="#000" strokeOpacity="0.7" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d={`M ${-a.len / 2} 0 H ${a.len / 2} M ${a.len / 2 - 5} -4 L ${a.len / 2} 0 L ${a.len / 2 - 5} 4`} stroke={a.color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
            {/* Circuito en el centro */}
            <g transform={`translate(${S / 2} ${S / 2})`}>
              {mini ? (
                <g transform={`translate(${(-S * 0.08).toFixed(1)} ${(-mini.height / 2).toFixed(1)})`}>
                  <path d={mini.d} fill="none" stroke="#000" strokeWidth="5" strokeLinejoin="round" />
                  <path d={mini.d} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
                </g>
              ) : (
                <g><circle r={7 * fs} fill={theme.main} stroke="#fff" strokeWidth="2" /><circle r="2.5" fill="#fff" /></g>
              )}
              {place && <text y={(mini ? mini.height / 2 : 8) + 16 * fs} textAnchor="middle" fontSize={11 * fs} fontWeight="900" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.85)', strokeWidth: 3.5 }}>{String(place).toUpperCase().slice(0, 34)}</text>}
            </g>
            {/* Norte arriba */}
            <g transform={`translate(${S - 24 * fs} ${24 * fs})`}>
              <circle r={14 * fs} fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.35)" />
              <path d={`M 0 ${-10 * fs} L ${4.5 * fs} ${3 * fs} L 0 ${0.5 * fs} L ${-4.5 * fs} ${3 * fs} Z`} fill={theme.main} />
              <text y={10 * fs} textAnchor="middle" fontSize={8 * fs} fontWeight="900" fill="#fff">N</text>
            </g>
            {/* Progreso de la animación */}
            {animate && (
              <g transform={`translate(${12 * fs} ${S - 14 * fs})`}>
                {[-1, ...frames.map((_, i) => i)].map((k, i) => (
                  <rect key={k} x={i * 14 * fs} y={-3 * fs} width={10 * fs} height={6 * fs} rx={3 * fs} fill={k === shownFrame ? theme.main : 'rgba(255,255,255,0.35)'} />
                ))}
              </g>
            )}
            {!grid && <text x={S / 2} y={S / 2 + 60} textAnchor="middle" fill="#ccc" fontSize="13">Pedí el radar desde el PANEL (botón RADAR)</text>}
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(6), padding: compact ? '6px 10px 8px' : '8px 14px 10px', fontSize: px(10), color: theme.text, textShadow: f.textShadow }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
            <span style={{ fontWeight: 900, color: theme.title, letterSpacing: '1px' }}>{legend.title}</span>
            <span style={{ fontWeight: 800 }}>{legend.left}</span>
            <span style={{ flex: 1, height: px(8), borderRadius: px(4), background: `linear-gradient(90deg, ${legend.stops.join(', ')})` }} />
            <span style={{ fontWeight: 800 }}>{legend.right}</span>
          </div>
          {grid && (
            <div style={{ display: 'flex', gap: px(12), flexWrap: 'wrap', fontWeight: 800 }}>
              {centerCell && Number.isFinite(centerCell.temp) && <span><span style={{ color: theme.number }}>EN EL CIRCUITO </span>{Math.round(centerCell.temp)}°</span>}
              {centerCell && Number.isFinite(centerCell.wind) && <span><span style={{ color: theme.number }}>VIENTO </span>{Math.round(centerCell.wind)} KM/H {getWindDirLabel(centerCell.dir)}</span>}
              {nextProb !== null && <span><span style={{ color: theme.number }}>LLUVIA PRÓX. {frames.length} H </span>{Math.round(nextProb)}%</span>}
              {layer === 'rain' && <span style={{ color: rainingNear ? '#74b3f0' : theme.number }}>{rainingNear ? 'LLUEVE EN LA ZONA' : 'SIN LLUVIA EN LA ZONA'}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
