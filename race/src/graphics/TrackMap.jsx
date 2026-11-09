import { useMemo } from 'react';
import { getGraphicFrame, getFormatStyles, useLiveClock, secondsSinceCross, getClassColor, useImageAspect } from '../utils/raceVisuals';
import { buildTrack, pointOnTrack, DEFAULT_ASPECT } from '../utils/trackPath';
import CategoryTag from '../components/CategoryTag';


// Número en negro sobre colores claros y en blanco sobre oscuros
function textOn(color) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(color || '').trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#000' : '#fff';
}

// MAPA DEL CIRCUITO EN VIVO: cada auto se ubica sobre el trazado según el tiempo desde su última pasada por meta y su
// vuelta típica. Es una estimación (no hay GPS): los que llevan demasiado sin pasar (boxes / detenidos) no se dibujan.
// El trazado marcado en la pestaña CIRCUITO se suaviza y se encuadra para ocupar todo el recuadro.
// Formatos (PERSONALIZAR): standard | compact (más chico) | dots (autos sin número) | minimal (sin caja ni encabezado) | skins.
export default function TrackMap({ drivers, config, isVisible, sessionInfo, id = 'trackMap' }) {
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 1460, y: 610, scale: 1 });
  const format = config?.trackMapFormat || 'standard';
  const f = getFormatStyles(format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const dots = format === 'dots';
  const compact = format === 'compact';
  const W = compact ? 300 : 420;
  const k = compact ? 0.75 : 1; // grosor de la pista
  const trackPath = config?.trackPath;
  // Los puntos están en % de la imagen del circuito (o de un lienzo 3:2 si no hay imagen): hace falta su proporción real
  const trackImage = config?.trackImage || null;
  const imageAspect = useImageAspect(trackImage);
  const aspect = trackImage ? imageAspect : DEFAULT_ASPECT;
  const track = useMemo(() => (aspect ? buildTrack(trackPath, { width: compact ? 300 : 420, fit: true, maxHeight: compact ? 240 : 340, minHeight: compact ? 130 : 170, pad: compact ? 16 : 22, aspect }) : null), [trackPath, compact, aspect]);
  const clock = useLiveClock(!!isVisible && !!track, drivers, 120);
  // Por defecto el mapa se dibuja sólo con los puntos del trazado; la imagen de fondo es opcional
  const showImage = config?.trackMapShowImage === true && !!config?.trackImage;
  const classes = sessionInfo?.classes || [];
  const lineColor = /^#[0-9a-f]{6}$/i.test(config?.trackMapLineColor || '') ? config.trackMapLineColor : '#2ecc71';
  const H = track ? track.height : 200;

  const cars = [];
  if (track) {
    (drivers || []).forEach(d => {
      const since = secondsSinceCross(d, clock);
      if (since === null || d.dsq) return;
      const lapTime = d.lapProgress.lapTime;
      if (since > lapTime * 1.6) return;
      const p = pointOnTrack(track, Math.min(0.995, since / lapTime));
      const leader = String(d.pos) === '1';
      const color = leader ? '#ffd700' : (d.cls ? getClassColor(config, d.cls, classes) : theme.secondary);
      cars.push({ d, p, color, leader });
    });
  }
  // Los de adelante se dibujan arriba (y el líder, último de todos)
  cars.sort((a, b) => (parseInt(b.d.pos, 10) || 99) - (parseInt(a.d.pos, 10) || 99));

  return (
    <div style={wrapperStyle}>
      <div style={{ ...f.box, width: `${W}px` }}>
        <div style={{ display: f.minimal ? 'none' : 'flex', padding: f.compact ? '6px 10px' : '8px 14px', backgroundColor: f.headerBg, borderBottom: f.headerBorder, color: theme.title, fontWeight: 900, fontSize: f.compact ? '10px' : '12px', letterSpacing: '2px', justifyContent: 'space-between' }}>
          <span>EN PISTA<CategoryTag config={config} id={id} /></span>
          <span style={{ color: theme.number }}>{cars.length ? `${cars.length} AUTOS` : ''}</span>
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {track && showImage && (
            <image href={config.trackImage} x={track.image.x} y={track.image.y} width={track.image.w} height={track.image.h} preserveAspectRatio="none" opacity="0.95" />
          )}
          {track && (
            <g>
              {/* Sin imagen de fondo se dibuja la pista (asfalto con bordes claros); con imagen, la pista es la de la foto */}
              {!showImage && <path d={track.d} fill="none" stroke="#9a9a9a" strokeWidth={17 * k} strokeLinejoin="round" strokeLinecap="round" />}
              {!showImage && <path d={track.d} fill="none" stroke="#3b3b3b" strokeWidth={13 * k} strokeLinejoin="round" strokeLinecap="round" />}
              {/* Trazado: la misma línea verde que se ve al dibujarlo en la pestaña CIRCUITO */}
              <path d={track.d} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={6 * k} strokeLinejoin="round" strokeLinecap="round" />
              <path d={track.d} fill="none" stroke={lineColor} strokeWidth={3.2 * k} strokeLinejoin="round" strokeLinecap="round" />
              {/* Línea de largada / llegada, perpendicular a la pista */}
              <g transform={`translate(${track.start.x.toFixed(1)} ${track.start.y.toFixed(1)}) rotate(${(track.start.angle + 90).toFixed(1)})`}>
                <rect x="-9" y="-2" width="18" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.8" />
                <rect x="-9" y="-2" width="4.5" height="2" fill="#000" />
                <rect x="0" y="-2" width="4.5" height="2" fill="#000" />
                <rect x="-4.5" y="0" width="4.5" height="2" fill="#000" />
                <rect x="4.5" y="0" width="4.5" height="2" fill="#000" />
              </g>
            </g>
          )}
          {cars.map(({ d, p, color, leader }) => {
            const num = String(d.number);
            return (
              <g key={num} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
                <circle r={dots ? (leader ? 6 : 4.5) : (f.compact ? (leader ? 7.5 : 6.5) : (leader ? 9.5 : 8))} fill={color} stroke="#000" strokeWidth={dots ? 1.2 : 1.6} />
                {!dots && <text y={f.compact ? 2.6 : 3.2} textAnchor="middle" fontSize={f.compact ? (num.length > 2 ? 5.5 : 7) : (num.length > 2 ? 7 : 9)} fontWeight="900" fill={textOn(color)}>{num}</text>}
              </g>
            );
          })}
          {!track && aspect && <text x={W / 2} y={H / 2} textAnchor="middle" fill={theme.number} fontSize="13">Dibujá el trazado en la pestaña CIRCUITO</text>}
        </svg>
      </div>
    </div>
  );
}
