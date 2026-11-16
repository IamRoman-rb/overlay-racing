import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { pointOnTrack, trackSegment } from '../utils/trackPath';
import { rgba } from '../utils/elite';

// RECORRIDO DEL CIRCUITO para la PRESENTACIÓN (config.circuitIntroMode):
//   'tour'   -> una vuelta en primera persona: la cámara sigue a un auto, gira con la pista y se inclina (3D)
//   'curves' -> curva por curva: la cámara viaja por la pista hasta cada curva y se detiene mostrando su número, nombre y sentido
// Entre vueltas vuelve a la vista completa. Todo se calcula a partir del reloj (no guarda estado propio del recorrido).

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => { let d = ((b - a + 540) % 360) - 180; return a + d * k; };
const wrap = (f) => ((f % 1) + 1) % 1;

const OVERVIEW_HOLD = 2.2;   // s con el circuito completo antes de arrancar
const BLEND = 1.3;           // s para entrar / salir de la cámara que sigue al auto
const TRAVEL = 1.5;          // s para ir de una curva a la siguiente
const HOLD = 2.6;            // s detenido en cada curva
const PERSPECTIVE = 640;     // px de la perspectiva del escenario 3D
const TILT_ORIGIN = 0.7;     // alto relativo del eje de la inclinación (transform-origin 50% 70%)

// Dirección de la pista (en grados) en la fracción f, suavizada mirando un poco atrás y adelante
function headingAt(track, f) {
  const a = pointOnTrack(track, f - 0.006);
  const b = pointOnTrack(track, f + 0.014);
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

export default function CircuitTour({ track, sectors, curves, mode, running, width, height, pal, tourSec = 16, tilt = 56 }) {
  const [now, setNow] = useState(0);
  const startRef = useRef(null);
  const cardRef = useRef(null);
  const [card, setCard] = useState({ w: 260, h: 58 });

  // Reloj del recorrido: arranca de cero cada vez que la gráfica sale al aire
  useEffect(() => {
    if (!running) { startRef.current = null; return undefined; }
    let raf = 0;
    const tick = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      setNow((ts - startRef.current) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const stops = useMemo(() => (curves || []).filter(c => Number.isFinite(c.t)).sort((a, b) => a.t - b.t), [curves]);
  const useCurves = mode === 'curves' && stops.length > 0;
  const lap = Math.max(6, tourSec);

  // Línea de tiempo de un ciclo -> cámara { f (fracción de la pista), follow (0..1 cuánto sigue al auto), stop (curva detenida) }
  const timeline = useMemo(() => {
    if (!useCurves) {
      const total = OVERVIEW_HOLD + BLEND + lap + BLEND;
      return {
        total,
        at: (s) => {
          if (s < OVERVIEW_HOLD) return { f: 0, follow: 0 };
          s -= OVERVIEW_HOLD;
          if (s < BLEND) return { f: 0, follow: ease(s / BLEND) };
          s -= BLEND;
          if (s < lap) return { f: s / lap, follow: 1, moving: true };
          s -= lap;
          return { f: 0, follow: 1 - ease(clamp01(s / BLEND)) };
        }
      };
    }
    // Curva por curva: de la largada a la 1, de la 1 a la 2, ..., de la última a la largada
    const legs = [];
    let from = 0;
    stops.forEach((c, i) => { let to = c.t; if (to < from) to += 1; legs.push({ from, to, stop: i }); from = c.t; });
    legs.push({ from, to: 1, stop: -1 });
    const total = OVERVIEW_HOLD + BLEND + legs.length * TRAVEL + stops.length * HOLD + BLEND;
    return {
      total,
      at: (s) => {
        if (s < OVERVIEW_HOLD) return { f: 0, follow: 0 };
        s -= OVERVIEW_HOLD;
        if (s < BLEND) return { f: 0, follow: ease(s / BLEND) };
        s -= BLEND;
        for (const leg of legs) {
          if (s < TRAVEL) return { f: wrap(lerp(leg.from, leg.to, ease(s / TRAVEL))), follow: 1, moving: true };
          s -= TRAVEL;
          if (leg.stop >= 0) {
            if (s < HOLD) return { f: wrap(leg.to), follow: 1, stop: leg.stop, holdK: s / HOLD };
            s -= HOLD;
          }
        }
        return { f: 0, follow: 1 - ease(clamp01(s / BLEND)) };
      }
    };
  }, [useCurves, stops, lap]);

  const cam = timeline.at(running ? now % timeline.total : 0);
  const car = pointOnTrack(track, cam.f);
  const heading = headingAt(track, cam.f);
  const k = cam.follow;
  // Vista completa: centro del lienzo, sin giro ni zoom. Siguiendo: el auto abajo del centro, la pista hacia arriba.
  const zoomFollow = useCurves ? (cam.stop !== undefined ? 2.6 : 2.2) : 2.9;
  const zoom = lerp(1, zoomFollow, k);
  const rot = lerpAngle(0, -heading - 90, k);
  const cx = lerp(width / 2, car.x, k);
  const cy = lerp(height / 2, car.y, k);
  const ax = width / 2;
  const ay = lerp(height / 2, height * 0.64, k);
  const tiltDeg = lerp(0, useCurves ? tilt * 0.75 : tilt, k);
  const transform = `translate(${ax.toFixed(2)} ${ay.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${zoom.toFixed(3)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`;
  const sw = (base) => base * Math.sqrt(zoom);
  const pts = (list) => list.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Estela: lo último recorrido por el auto
  const trail = cam.follow > 0.05 && cam.moving ? trackSegment(track, Math.max(0, cam.f - 0.05), cam.f) : null;
  const curStop = cam.stop !== undefined ? stops[cam.stop] : null;
  const sectorIndex = Math.max(0, sectors.findIndex(s => cam.f >= s.a && cam.f < s.b));
  const sectorColor = sectors[sectorIndex] ? sectors[sectorIndex].color : '#fff';

  // Proyección a pantalla de un punto de la pista: transformación del SVG (giro + zoom) y después la inclinación 3D
  // (rotateX con perspectiva). Así los números de las curvas y la línea del cartel se dibujan planos, nítidos y
  // exactamente encima del punto, en una capa que no se inclina.
  const rotRad = rot * Math.PI / 180;
  const tiltRad = tiltDeg * Math.PI / 180;
  const project = (p) => {
    const dx = (p.x - cx) * zoom; const dy = (p.y - cy) * zoom;
    const x = ax + dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
    const y = ay + dx * Math.sin(rotRad) + dy * Math.cos(rotRad);
    const yr = y - height * TILT_ORIGIN;
    const Y = height * TILT_ORIGIN + yr * Math.cos(tiltRad);
    const Z = yr * Math.sin(tiltRad);
    if (Z >= PERSPECTIVE - 40) return null;                       // detrás de la cámara
    const k3 = PERSPECTIVE / (PERSPECTIVE - Z);
    return { x: width / 2 + (x - width / 2) * k3, y: height / 2 + (Y - height / 2) * k3, s: k3 };
  };
  const markers = useCurves ? stops.map((c, i) => {
    const q = project(pointOnTrack(track, c.t));
    if (!q || q.x < -30 || q.x > width + 30 || q.y < -30 || q.y > height + 30) return null;
    return { key: c.id || i, n: i + 1, active: curStop === c, ...q };
  }).filter(Boolean) : [];
  const activeMarker = markers.find(m => m.active) || null;

  const cardIn = curStop ? clamp01(Math.min(cam.holdK * 6, (1 - cam.holdK) * 6)) : 0;
  const lineK = curStop ? clamp01((cam.holdK - 0.04) * 7) : 0;          // la línea se dibuja apenas aparece el cartel
  const cardLeft = 18; const cardTop = 16;
  // Línea que "sostiene" el cartel: sale del borde inferior del cartel (o del lateral si la curva queda al costado)
  // y termina en el número de la curva
  let leader = null;
  if (curStop && activeMarker) {
    const bottom = cardTop + card.h;
    const right = cardLeft + card.w;
    const tx = activeMarker.x; const ty = activeMarker.y;
    let sx; let sy;
    if (ty > bottom + 12) { sx = Math.max(cardLeft + 18, Math.min(right - 18, tx)); sy = bottom; }
    else { sx = tx > right ? right : cardLeft; sy = cardTop + card.h / 2; }
    const r = 15 * Math.max(0.85, Math.min(1.2, activeMarker.s));
    const len = Math.hypot(tx - sx, ty - sy);
    const ex = len > r ? tx - ((tx - sx) / len) * r : tx;
    const ey = len > r ? ty - ((ty - sy) / len) * r : ty;
    leader = { sx, sy, ex, ey, len: Math.max(0, len - r) };
  }

  // Medida real del cartel (cambia con el nombre de la curva)
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const w = el.offsetWidth; const h = el.offsetHeight;
    if (Math.abs(w - card.w) > 1 || Math.abs(h - card.h) > 1) setCard({ w, h });
  }, [cam.stop, card.w, card.h]);

  return (
    // El escenario 3D (perspectiva + inclinación) va en su propia capa abajo de todo y los carteles en otra capa encima
    // (z-index + translateZ): así el trazado inclinado nunca se dibuja por arriba del cartel de la curva.
    <div style={{ position: 'relative', width: `${width}px`, height: `${height}px`, overflow: 'hidden', isolation: 'isolate' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: '640px', overflow: 'hidden', zIndex: 0 }}>
      <div style={{ width: '100%', height: '100%', transform: `rotateX(${tiltDeg.toFixed(2)}deg)`, transformOrigin: '50% 70%' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
          <defs><filter id="ctGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter></defs>
          <g transform={transform}>
            {/* Asfalto + sectores */}
            <polyline points={pts(track.samples)} fill="none" stroke={rgba(pal.deep, 0.95)} strokeWidth={sw(16)} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {sectors.map(s => (
              <g key={s.i}>
                <polyline points={pts(s.flat)} fill="none" stroke={s.color} strokeOpacity="0.35" strokeWidth={sw(18)} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" filter="url(#ctGlow)" />
                <polyline points={pts(s.flat)} fill="none" stroke={s.color} strokeWidth={sw(8)} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            ))}
            {/* Línea de centro punteada (sensación de velocidad) */}
            {k > 0.2 && <polyline points={pts(track.samples)} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={sw(1.4)} vectorEffect="non-scaling-stroke" strokeDasharray="6 10" />}
            {trail && <polyline points={pts(trail)} fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth={sw(4)} vectorEffect="non-scaling-stroke" strokeLinecap="round" />}
            {/* Largada */}
            {(() => { const p = pointOnTrack(track, 0); return <rect x={p.x - 5 / zoom} y={p.y - 5 / zoom} width={10 / zoom} height={10 / zoom} fill="#fff" stroke="#000" strokeWidth={1.5 / zoom} />; })()}
            {/* Auto */}
            {k > 0.05 && (
              <g>
                <circle cx={car.x} cy={car.y} r={12 / zoom} fill={sectorColor} opacity="0.45" filter="url(#ctGlow)" />
                <circle cx={car.x} cy={car.y} r={6 / zoom} fill="#ffffff" stroke={sectorColor} strokeWidth={2.5 / zoom} />
              </g>
            )}
          </g>
        </svg>
      </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, zIndex: 10, transform: 'translateZ(0)', pointerEvents: 'none' }}>
      {/* Números de las curvas (planos y nítidos) + línea del cartel a la curva marcada */}
      {markers.length > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <defs>
            <filter id="ctShadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#000" floodOpacity="0.75" /></filter>
          </defs>
          <style>{`@keyframes ctRing { 0% { r: 15px; opacity: 0.9; } 100% { r: 30px; opacity: 0; } }`}</style>
          {leader && (
            <g opacity={cardIn}>
              <line x1={leader.sx} y1={leader.sy} x2={leader.ex} y2={leader.ey} stroke="rgba(0,0,0,0.55)" strokeWidth="4.5" strokeLinecap="round"
                strokeDasharray={`${leader.len.toFixed(1)} ${(leader.len + 10).toFixed(1)}`} strokeDashoffset={(leader.len * (1 - lineK)).toFixed(1)} />
              <line x1={leader.sx} y1={leader.sy} x2={leader.ex} y2={leader.ey} stroke={pal.accent} strokeWidth="2.2" strokeLinecap="round"
                strokeDasharray={`${leader.len.toFixed(1)} ${(leader.len + 10).toFixed(1)}`} strokeDashoffset={(leader.len * (1 - lineK)).toFixed(1)} />
              <circle cx={leader.sx} cy={leader.sy} r="3.5" fill={pal.accent} stroke="#000" strokeWidth="1" />
            </g>
          )}
          {markers.filter(m => !m.active).concat(activeMarker ? [activeMarker] : []).map(m => {
            const sc = Math.max(0.8, Math.min(1.2, m.s));
            const r = (m.active ? 15 : 10.5) * sc;
            const fs = (m.active ? 15 : 11.5) * sc;
            return (
              <g key={m.key}>
                {m.active && <circle cx={m.x} cy={m.y} r={r} fill="none" stroke={pal.accent} strokeWidth="2.5" style={{ animation: 'ctRing 1.1s ease-out infinite' }} />}
                <circle cx={m.x} cy={m.y} r={r} fill={m.active ? pal.accent : '#ffffff'} stroke={m.active ? '#ffffff' : '#0b0f3a'} strokeWidth={m.active ? 2.5 : 2} filter="url(#ctShadow)" />
                <text x={m.x} y={m.y} dy="0.36em" textAnchor="middle" fontSize={fs.toFixed(1)} fontWeight="900" fill={m.active ? '#000' : '#0b0f3a'}
                  fontFamily="'Arial Black', Arial, sans-serif" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.n}</text>
              </g>
            );
          })}
        </svg>
      )}
      {/* Cartel de la curva en la que se detuvo */}
      {curStop && (
        <div ref={cardRef} style={{ position: 'absolute', left: `${cardLeft}px`, top: `${cardTop}px`, display: 'flex', alignItems: 'stretch', maxWidth: `${width - 36}px`, boxShadow: '0 8px 22px rgba(0,0,0,0.6)', opacity: cardIn, transform: `translateX(${(1 - clamp01(cam.holdK * 6)) * -20}px)` }}>
          <div style={{ backgroundColor: pal.accent, color: '#000', fontSize: `${Math.max(26, Math.min(40, width / 15))}px`, fontWeight: 800, padding: '0 14px', display: 'flex', alignItems: 'center', lineHeight: 1 }}>{cam.stop + 1}</div>
          <div style={{ backgroundColor: rgba(pal.deep, 0.92), padding: '6px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: pal.muted, letterSpacing: '1px' }}>CURVA {cam.stop + 1}{curStop.side ? ` · ${curStop.side === 'L' ? '◄ IZQUIERDA' : 'DERECHA ►'}` : ''}</span>
            <span style={{ fontSize: `${Math.max(15, Math.min(22, width / 27))}px`, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{curStop.name || `CURVA ${cam.stop + 1}`}</span>
          </div>
        </div>
      )}

      {/* Progreso de la vuelta con los colores de los sectores */}
      {k > 0.05 && (
        <div style={{ position: 'absolute', left: '18px', right: '18px', bottom: '10px', height: '6px', display: 'flex', opacity: k }}>
          {sectors.map(s => <div key={s.i} style={{ flex: s.b - s.a, backgroundColor: rgba(s.color, 0.45), marginRight: '2px' }} />)}
          <div style={{ position: 'absolute', top: '-4px', left: `${(cam.f * 100).toFixed(2)}%`, width: '4px', height: '14px', backgroundColor: '#fff', boxShadow: '0 0 6px #fff' }} />
        </div>
      )}
      </div>
    </div>
  );
}
