import { useMemo } from 'react';
import { getGraphicFrame, useLiveClock, secondsSinceCross, getClassColor } from '../utils/raceVisuals';

const W = 420;
const H = 280; // misma proporción (3:2) que el lienzo de la pestaña CIRCUITO, así los puntos caen en el mismo lugar

// Recorrido acumulado del trazado (config.trackPath: puntos en % sobre la imagen, el primero es la línea de largada)
function buildPath(points) {
  const pts = (points || []).map(p => ({ x: (p.x / 100) * W, y: (p.y / 100) * H }));
  if (pts.length < 2) return null;
  const closed = pts.concat([pts[0]]);
  const segs = [];
  let total = 0;
  for (let i = 1; i < closed.length; i++) {
    const a = closed[i - 1]; const b = closed[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, start: total, len });
    total += len;
  }
  return { pts, segs, total, d: `M ${pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} Z` };
}

function pointAt(path, frac) {
  const target = ((frac % 1) + 1) % 1 * path.total;
  const seg = path.segs.find(s => target <= s.start + s.len) || path.segs[path.segs.length - 1];
  const k = seg.len ? (target - seg.start) / seg.len : 0;
  return { x: seg.a.x + (seg.b.x - seg.a.x) * k, y: seg.a.y + (seg.b.y - seg.a.y) * k };
}

// MAPA DEL CIRCUITO EN VIVO: cada auto se ubica sobre el trazado según el tiempo desde su última pasada por meta y su
// vuelta típica. Es una estimación (no hay GPS): los que llevan demasiado sin pasar (boxes / detenidos) no se dibujan.
export default function TrackMap({ drivers, config, isVisible, sessionInfo, id = 'trackMap' }) {
  const { wrapperStyle, bRad, customBg, theme } = getGraphicFrame(config, id, isVisible, { x: 1460, y: 610, scale: 1 });
  const path = useMemo(() => buildPath(config?.trackPath), [config?.trackPath]);
  const clock = useLiveClock(!!isVisible && !!path, drivers, 150);
  const showImage = config?.trackMapShowImage !== false && !!config?.trackImage;
  const classes = sessionInfo?.classes || [];

  const cars = [];
  if (path) {
    (drivers || []).forEach(d => {
      const since = secondsSinceCross(d, clock);
      if (since === null || d.dsq) return;
      const lapTime = d.lapProgress.lapTime;
      if (since > lapTime * 1.6) return;
      const p = pointAt(path, Math.min(0.995, since / lapTime));
      const leader = String(d.pos) === '1';
      const color = leader ? '#ffd700' : (d.cls ? getClassColor(config, d.cls, classes) : theme.secondary);
      cars.push({ d, p, color, leader });
    });
  }
  // El líder se dibuja último para que quede arriba
  cars.sort((a, b) => (a.leader ? 1 : 0) - (b.leader ? 1 : 0) || (parseInt(b.d.pos, 10) - parseInt(a.d.pos, 10)));

  return (
    <div style={wrapperStyle}>
      <div style={{
        width: `${W}px`, boxSizing: 'border-box', borderRadius: bRad, overflow: 'hidden',
        backgroundColor: customBg ? 'transparent' : theme.bg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        borderTop: customBg ? 'none' : `4px solid ${theme.main}`, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        <div style={{ padding: '7px 12px', backgroundColor: customBg ? 'transparent' : theme.headerBg, color: theme.title, fontWeight: 900, fontSize: '12px', letterSpacing: '2px', display: 'flex', justifyContent: 'space-between' }}>
          <span>EN PISTA</span>
          <span style={{ color: theme.number }}>{cars.length ? `${cars.length} AUTOS` : ''}</span>
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {showImage && <image href={config.trackImage} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid meet" opacity="0.55" />}
          {path && (
            <g>
              <path d={path.d} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="11" strokeLinejoin="round" />
              <path d={path.d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="6" strokeLinejoin="round" />
              <line x1={path.pts[0].x} y1={path.pts[0].y - 10} x2={path.pts[0].x} y2={path.pts[0].y + 10} stroke={theme.main} strokeWidth="4" />
            </g>
          )}
          {cars.map(({ d, p, color, leader }) => (
            <g key={d.number} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
              <circle r={leader ? 11 : 9.5} fill={color} stroke="#000" strokeWidth="2" />
              <text y="3.5" textAnchor="middle" fontSize={String(d.number).length > 2 ? 8 : 10} fontWeight="900" fill="#000">{d.number}</text>
            </g>
          ))}
          {!path && <text x={W / 2} y={H / 2} textAnchor="middle" fill={theme.number} fontSize="13">Dibujá el trazado en la pestaña CIRCUITO</text>}
        </svg>
      </div>
    </div>
  );
}
