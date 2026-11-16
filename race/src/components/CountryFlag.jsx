import { flagSrc, driverCountry, flagsEnabled } from '../utils/countries';

// Bandera chica (junto al nombre de un piloto o de un circuito): rectángulo 4:3 con borde fino y una luz suave arriba,
// como en las transmisiones. Sin código válido no ocupa lugar.
export function FlagChip({ code, height = 14, radius = 2, style }) {
  const src = flagSrc(code);
  if (!src) return null;
  const w = Math.round(height * 1.4);
  return (
    <span style={{
      position: 'relative', display: 'inline-block', flexShrink: 0, width: `${w}px`, height: `${height}px`, borderRadius: `${radius}px`, overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.18), 0 1px 3px rgba(0,0,0,0.5)', verticalAlign: 'middle', ...style
    }}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.18) 100%)' }} />
    </span>
  );
}

// Bandera de un piloto en una gráfica: sólo si la gráfica la tiene activada en PERSONALIZAR (config.showFlags_<id>)
export function DriverFlag({ driver, number, config, id, height = 14, style }) {
  if (!flagsEnabled(config, id)) return null;
  const code = driverCountry(driver, config, number);
  return code ? <FlagChip code={code} height={height} style={style} /> : null;
}

// BANDERA DESVANECIDA de fondo (presentación del circuito, detrás de las fotos de los pilotos): la bandera ocupa la caja
// y se va desvaneciendo hacia `fadeTo` (left | right | top | bottom | radial), con un leve ondeo de luz para que no
// quede plana. Va detrás del contenido (position absolute, sin eventos). dim: oscurecido para que el texto encima se lea.
export function FlagFade({ code, fadeTo = 'left', opacity = 0.55, animated = true, dim = 0.3, style }) {
  const src = flagSrc(code);
  if (!src) return null;
  const mask = fadeTo === 'radial'
    ? 'radial-gradient(ellipse at 50% 45%, #000 0%, rgba(0,0,0,0.55) 38%, transparent 66%)'
    : `linear-gradient(to ${fadeTo}, #000 0%, rgba(0,0,0,0.65) 35%, transparent 90%)`;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity, WebkitMaskImage: mask, maskImage: mask, ...style }}>
      <style>{'@keyframes flagFadeSheen { 0% { transform: translateX(-60%); } 100% { transform: translateX(160%); } }'}</style>
      <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.1)' }} />
      {/* Sombreado de tela + brillo que cruza despacio */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(100deg, rgba(0,0,0,0.10) 0px, rgba(255,255,255,0.06) 60px, rgba(0,0,0,0.10) 120px)' }} />
      {dim > 0 && <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${dim})` }} />}
      {animated && <div style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.18), transparent)', animation: 'flagFadeSheen 6s ease-in-out infinite' }} />}
    </div>
  );
}
