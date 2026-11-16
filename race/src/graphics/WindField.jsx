// VECTORES DE VIENTO animados según el clima cargado (config.weatherData: windDir = de dónde viene, windSpeed en km/h).
//   variant 'arrows': campo de viento profesional (fondo de la presentación del circuito): corrientes con estela que se
//                     afinan hacia atrás, grilla tenue de vectores con un pulso que viaja a favor del viento
//   variant 'flow'  : las mismas corrientes, más largas (efecto de pantalla completa, formato PROFESIONAL)
//   variant 'streaks': estelas rectas con cola difuminada (efecto de pantalla completa, formatos clásicos)
import { getGraphicFrame } from '../utils/raceVisuals';
import { getCanvasSize } from '../utils/canvasSize';
import { getWindDirLabel, windIntensityColor } from '../utils/weather';

// Números pseudoaleatorios fijos: las estelas no saltan de lugar en cada render
function seeded(n, seed = 1234567) {
  let s = seed;
  return Array.from({ length: n }, () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; });
}

// Ángulo en pantalla (0 = hacia la derecha) hacia donde sopla el viento. Sin datos, de izquierda a derecha.
function windScreenAngle(weatherData) {
  const from = Number(weatherData?.windDir);
  return Number.isFinite(from) ? from + 90 : 0;
}

// Corrientes con estela: cada una es una curva suave (pathLength = 100) recorrida por tres trazos superpuestos
// (cola ancha y tenue, cuerpo, cabeza brillante) con la misma animación: se ve como un trazo que se afina hacia atrás.
function FlowLines({ width, height, count, speed, running, idPrefix, long = false, color = '#ffffff', head }) {
  const diag = Math.ceil(Math.hypot(width, height));
  const half = diag / 2 + 60;
  const cross = long ? Math.max(1.8, 6 - speed / 8) : Math.max(2.6, 8 - speed / 6);   // s para cruzar
  const L = long ? 22 : 16;                     // largo de la estela (en % del recorrido)
  const layers = [
    { l: L, w: long ? 3.4 : 2.6, a: 0.16 },
    { l: L * 0.55, w: long ? 2.2 : 1.6, a: 0.42 },
    { l: L * 0.12, w: long ? 3 : 2.3, a: 0.95, head: true }
  ];
  const r = seeded(count * 5, 98765);
  const items = Array.from({ length: count }, (_, i) => {
    const amp = (r[i * 5] - 0.5) * (long ? 70 : 34);
    return {
      y: -diag / 2 + ((i + r[i * 5 + 1] * 0.8) / count) * diag,
      d: `M ${-half} 0 C ${(-half / 3).toFixed(1)} ${amp.toFixed(1)} ${(half / 3).toFixed(1)} ${(-amp).toFixed(1)} ${half} 0`,
      delay: -r[i * 5 + 2] * cross,
      dur: cross * (0.8 + r[i * 5 + 3] * 0.45),
      alpha: 0.55 + r[i * 5 + 4] * 0.45
    };
  });
  const kf = layers.map((ly, k) => `@keyframes ${idPrefix}F${k} { from { stroke-dashoffset: ${ly.l}; } to { stroke-dashoffset: ${(ly.l - 100 - L).toFixed(2)}; } }`).join(' ');
  return (
    <g>
      <style>{kf}</style>
      {items.map((it, i) => (
        <g key={i} transform={`translate(0 ${it.y.toFixed(1)})`} opacity={it.alpha}>
          {layers.map((ly, k) => (
            <path key={k} d={it.d} pathLength="100" fill="none" stroke={ly.head ? (head || color) : color} strokeOpacity={ly.a} strokeWidth={ly.w} strokeLinecap="round"
              style={{ strokeDasharray: `${ly.l.toFixed(2)} 400`, strokeDashoffset: ly.l, animation: `${idPrefix}F${k} ${it.dur.toFixed(2)}s linear ${it.delay.toFixed(2)}s infinite`, animationPlayState: running ? 'running' : 'paused' }} />
          ))}
        </g>
      ))}
    </g>
  );
}

// Grilla de vectores: chevrones tenues alineados con el viento; un pulso de brillo los recorre a favor del viento
function VectorGrid({ width, height, angle, speed, running, idPrefix, color = '#ffffff' }) {
  const step = 44;
  const rad = angle * Math.PI / 180;
  const ux = Math.cos(rad); const uy = Math.sin(rad);
  const period = Math.max(1.6, 4.2 - speed / 15);
  const cells = [];
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2 + ((Math.round(y / step) % 2) * step) / 2; x < width; x += step) {
      const along = x * ux + y * uy;                                  // distancia a favor del viento
      const ph = (((along / 260) % 1) + 1) % 1;                       // más adelante en el viento -> pulso más tarde
      cells.push({ x, y, delay: (ph - 1) * period });
    }
  }
  const s = 5 + Math.min(4, speed / 10);
  return (
    <g>
      <style>{`@keyframes ${idPrefix}Pulse { 0%, 100% { opacity: 0.06; } 45% { opacity: 0.38; } }`}</style>
      {cells.map((c, i) => (
        <g key={i} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
          <path d={`M ${-s} 0 H ${s * 0.6} M ${s * 0.6 - 3.2} -2.6 L ${s * 0.6} 0 L ${s * 0.6 - 3.2} 2.6`} stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
            style={{ opacity: 0.06, animation: `${idPrefix}Pulse ${period.toFixed(2)}s ease-in-out ${c.delay.toFixed(2)}s infinite`, animationPlayState: running ? 'running' : 'paused' }} />
        </g>
      ))}
    </g>
  );
}

export function WindLayer({ width, height, count = 30, variant = 'arrows', weatherData, color = '#ffffff', opacity = 1, running = true, idPrefix = 'wind', grid = true }) {
  const angle = windScreenAngle(weatherData);
  const speed = Math.max(0, Number(weatherData?.windSpeed) || 8);
  const diag = Math.ceil(Math.hypot(width, height));
  const svgBase = { position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'hidden', opacity };

  if (variant === 'arrows' || variant === 'flow') {
    const long = variant === 'flow';
    const head = windIntensityColor(speed);
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={svgBase}>
        {grid && <VectorGrid width={width} height={height} angle={angle} speed={speed} running={running} idPrefix={`${idPrefix}G`} color={color} />}
        <g transform={`translate(${width / 2} ${height / 2}) rotate(${angle.toFixed(1)})`}>
          <FlowLines width={width} height={height} count={long ? count : Math.round(count / 2.2)} speed={speed} running={running} idPrefix={idPrefix} long={long} color={color} head={head} />
        </g>
      </svg>
    );
  }

  // 'streaks': estelas rectas (formatos clásicos de pantalla completa)
  const cross = Math.max(1.4, 5.5 - speed / 7);
  const r = seeded(count * 4);
  const items = Array.from({ length: count }, (_, i) => ({
    y: -diag / 2 + r[i * 4] * diag,
    len: 50 + r[i * 4 + 1] * 110,
    delay: -r[i * 4 + 2] * cross,
    dur: cross * (0.75 + r[i * 4 + 3] * 0.5),
    alpha: 0.35 + r[i * 4 + 3] * 0.5
  }));
  const anim = `${idPrefix}Move`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={svgBase}>
      <style>{`@keyframes ${anim} { 0% { transform: translateX(${-diag / 2 - 120}px); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateX(${diag / 2 + 120}px); opacity: 0; } }`}</style>
      <defs>
        <linearGradient id={`${idPrefix}Tail`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.8" stopColor={color} stopOpacity="0.85" />
          <stop offset="1" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <g transform={`translate(${width / 2} ${height / 2}) rotate(${angle.toFixed(1)})`}>
        {items.map((it, i) => (
          <g key={i} transform={`translate(0 ${it.y.toFixed(1)})`}>
            <g style={{ animation: `${anim} ${it.dur.toFixed(2)}s linear ${it.delay.toFixed(2)}s infinite`, animationPlayState: running ? 'running' : 'paused' }}>
              <rect x={-it.len} y="-1.5" width={it.len} height="3" rx="1.5" fill={`url(#${idPrefix}Tail)`} opacity={it.alpha} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ROSA DE LOS VIENTOS: aguja hacia donde sopla el viento (con un leve vaivén), velocidad y de dónde viene.
export function WindCompass({ weatherData, size = 64, color = '#ffffff', muted = 'rgba(255,255,255,0.55)', bg = 'rgba(5,10,40,0.72)', running = true, idPrefix = 'wc', showLabel = true }) {
  const from = Number(weatherData?.windDir);
  const has = Number.isFinite(from);
  const speed = Number(weatherData?.windSpeed);
  const to = has ? from + 180 : 90;
  const accent = windIntensityColor(speed);
  const c = 50;
  const wobble = Math.min(6, 1.5 + (Number.isFinite(speed) ? speed / 8 : 0));
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
      <style>{`@keyframes ${idPrefix}Wob { 0%, 100% { transform: rotate(${-wobble}deg); } 50% { transform: rotate(${wobble}deg); } }`}</style>
      <circle cx={c} cy={c} r="47" fill={bg} stroke={muted} strokeWidth="1.5" />
      <circle cx={c} cy={c} r="36" fill="none" stroke={muted} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 4" />
      {Array.from({ length: 36 }, (_, i) => i * 10).map(d => (
        <line key={d} x1={c} y1={d % 90 === 0 ? 4 : 5.5} x2={c} y2={d % 90 === 0 ? 12 : (d % 30 === 0 ? 10 : 8)} stroke={d % 90 === 0 ? color : muted} strokeWidth={d % 90 === 0 ? 2.2 : 1}
          transform={`rotate(${d} ${c} ${c})`} />
      ))}
      {[['N', 0], ['E', 90], ['S', 180], ['O', 270]].map(([l, d]) => {
        const a = (d - 90) * Math.PI / 180;
        return <text key={l} x={c + Math.cos(a) * 25} y={c + Math.sin(a) * 25 + 4.5} textAnchor="middle" fontSize="12" fontWeight="800" fill={l === 'N' ? accent : muted} fontFamily="Arial, sans-serif">{l}</text>;
      })}
      <g transform={`rotate(${to.toFixed(1)} ${c} ${c})`}>
        <g style={{ transformOrigin: `${c}px ${c}px`, animation: `${idPrefix}Wob 2.6s ease-in-out infinite`, animationPlayState: running ? 'running' : 'paused' }}>
          <path d={`M ${c} 9 L ${c + 8} 30 L ${c + 2.6} 27 L ${c + 2.6} 72 L ${c - 2.6} 72 L ${c - 2.6} 27 L ${c - 8} 30 Z`} fill={accent} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
          <circle cx={c} cy="80" r="5" fill="none" stroke={accent} strokeWidth="2.4" />
        </g>
      </g>
      <circle cx={c} cy={c} r="3.5" fill={color} />
      {showLabel && has && (
        <text x={c} y="114" textAnchor="middle" fontSize="13" fontWeight="800" fill={color} fontFamily="Arial, sans-serif" letterSpacing="0.5">
          {Number.isFinite(speed) ? `${Math.round(speed)} KM/H` : ''} {getWindDirLabel(from)}
        </text>
      )}
    </svg>
  );
}

// Gráfica de pantalla completa (botón VECTORES del PANEL): viento cruzando el video.
// Formatos (PERSONALIZAR): standard | dense (más estelas) | light (pocas y suaves) | flow (profesional: corrientes con estela)
export default function WindVectors({ config, isVisible, id = 'windVectors' }) {
  const { width, height } = getCanvasSize(config);
  const { wrapperStyle } = getGraphicFrame(config, id, isVisible, { x: 0, y: 0, scale: 1 }, 5);
  const format = config?.windVectorsFormat || 'standard';
  const count = format === 'dense' ? 130 : (format === 'light' ? 40 : (format === 'flow' ? 70 : 80));
  return (
    <div style={{ ...wrapperStyle, left: 0, top: 0, transform: 'none', width: `${width}px`, height: `${height}px` }}>
      <WindLayer width={width} height={height} count={count} variant={format === 'flow' ? 'flow' : 'streaks'} grid={false} weatherData={config?.weatherData} opacity={format === 'light' ? 0.6 : 0.85} running={!!isVisible} idPrefix="wv" />
    </div>
  );
}
