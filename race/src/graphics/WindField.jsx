// VECTORES DE VIENTO animados según el clima cargado (config.weatherData: windDir = de dónde viene, windSpeed en km/h).
//   variant 'arrows': flechitas chicas (fondo de la presentación del circuito)
//   variant 'streaks': estelas largas con cola difuminada (efecto de pantalla completa, botón VECTORES)
import { getGraphicFrame } from '../utils/raceVisuals';
import { getCanvasSize } from '../utils/canvasSize';

// Números pseudoaleatorios fijos: las estelas no saltan de lugar en cada render
function seeded(n) {
  let s = 1234567;
  return Array.from({ length: n }, () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; });
}

// Ángulo en pantalla (0 = hacia la derecha) hacia donde sopla el viento. Sin datos, de izquierda a derecha.
function windScreenAngle(weatherData) {
  const from = Number(weatherData?.windDir);
  return Number.isFinite(from) ? from + 90 : 0;
}

export function WindLayer({ width, height, count = 30, variant = 'arrows', weatherData, color = '#ffffff', opacity = 1, running = true, idPrefix = 'wind' }) {
  const angle = windScreenAngle(weatherData);
  const speed = Math.max(0, Number(weatherData?.windSpeed) || 8);
  // Más viento, más rápido (segundos para cruzar el área)
  const cross = variant === 'streaks' ? Math.max(1.4, 5.5 - speed / 7) : Math.max(2.2, 7 - speed / 6);
  const diag = Math.ceil(Math.hypot(width, height));
  const r = seeded(count * 4);
  const items = Array.from({ length: count }, (_, i) => ({
    y: -diag / 2 + r[i * 4] * diag,
    len: variant === 'streaks' ? 50 + r[i * 4 + 1] * 110 : 9 + r[i * 4 + 1] * 7,
    delay: -r[i * 4 + 2] * cross,
    dur: cross * (0.75 + r[i * 4 + 3] * 0.5),
    alpha: variant === 'streaks' ? 0.35 + r[i * 4 + 3] * 0.5 : 0.18 + r[i * 4 + 1] * 0.25
  }));
  const anim = `${idPrefix}Move`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'hidden', opacity }}>
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
              {variant === 'streaks'
                ? <rect x={-it.len} y="-1.5" width={it.len} height="3" rx="1.5" fill={`url(#${idPrefix}Tail)`} opacity={it.alpha} />
                : <path d={`M ${-it.len} 0 H 0 M -3.5 -3 L 0 0 L -3.5 3`} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={it.alpha} />}
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

// Gráfica de pantalla completa (botón VECTORES del PANEL): estelas de viento cruzando el video.
// Formatos (PERSONALIZAR): standard | dense (más estelas) | light (pocas y suaves).
export default function WindVectors({ config, isVisible, id = 'windVectors' }) {
  const { width, height } = getCanvasSize(config);
  const { wrapperStyle } = getGraphicFrame(config, id, isVisible, { x: 0, y: 0, scale: 1 }, 5);
  const format = config?.windVectorsFormat || 'standard';
  const count = format === 'dense' ? 130 : (format === 'light' ? 40 : 80);
  return (
    <div style={{ ...wrapperStyle, left: 0, top: 0, transform: 'none', width: `${width}px`, height: `${height}px` }}>
      <WindLayer width={width} height={height} count={count} variant="streaks" weatherData={config?.weatherData} opacity={format === 'light' ? 0.6 : 0.85} running={!!isVisible} idPrefix="wv" />
    </div>
  );
}
