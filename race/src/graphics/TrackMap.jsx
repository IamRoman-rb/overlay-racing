import { useMemo } from 'react';
import { getGraphicFrame, useLiveClock, secondsSinceCross, getClassColor } from '../utils/raceVisuals';
import { buildTrack, pointOnTrack } from '../utils/trackPath';
import CategoryTag from '../components/CategoryTag';

const W = 420;

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
export default function TrackMap({ drivers, config, isVisible, sessionInfo, id = 'trackMap' }) {
  const { wrapperStyle, bRad, customBg, theme } = getGraphicFrame(config, id, isVisible, { x: 1460, y: 610, scale: 1 });
  const track = useMemo(() => buildTrack(config?.trackPath, { width: W, fit: true }), [config?.trackPath]);
  const clock = useLiveClock(!!isVisible && !!track, drivers, 120);
  const showImage = config?.trackMapShowImage !== false && !!config?.trackImage;
  const classes = sessionInfo?.classes || [];
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
      <div style={{
        width: `${W}px`, boxSizing: 'border-box', borderRadius: bRad, overflow: 'hidden',
        backgroundColor: customBg ? 'transparent' : theme.bg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        borderTop: customBg ? 'none' : `4px solid ${theme.main}`, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        <div style={{ padding: '8px 14px', backgroundColor: customBg ? 'transparent' : theme.headerBg, color: theme.title, fontWeight: 900, fontSize: '12px', letterSpacing: '2px', display: 'flex', justifyContent: 'space-between' }}>
          <span>EN PISTA<CategoryTag config={config} id={id} /></span>
          <span style={{ color: theme.number }}>{cars.length ? `${cars.length} AUTOS` : ''}</span>
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {track && showImage && (
            <image href={config.trackImage} x={track.image.x} y={track.image.y} width={track.image.w} height={track.image.h} preserveAspectRatio="xMidYMid meet" opacity="0.35" />
          )}
          {track && (
            <g>
              <path d={track.d} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="13" strokeLinejoin="round" strokeLinecap="round" />
              <path d={track.d} fill="none" stroke="#e9e9e9" strokeWidth="6.5" strokeLinejoin="round" strokeLinecap="round" />
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
                <circle r={leader ? 9.5 : 8} fill={color} stroke="#000" strokeWidth="1.6" />
                <text y="3.2" textAnchor="middle" fontSize={num.length > 2 ? 7 : 9} fontWeight="900" fill={textOn(color)}>{num}</text>
              </g>
            );
          })}
          {!track && <text x={W / 2} y={H / 2} textAnchor="middle" fill={theme.number} fontSize="13">Dibujá el trazado en la pestaña CIRCUITO</text>}
        </svg>
      </div>
    </div>
  );
}
