import { flagSrc, driverCountry, flagsEnabled, photoFlagStyle, photoFlagOpacity } from '../utils/countries';

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
// y se va desvaneciendo hacia `fadeTo` (left | right | top | bottom | radial | photo), con un leve ondeo de luz para que no
// quede plana. Va detrás del contenido (position absolute, sin eventos). dim: oscurecido para que el texto encima se lea.
// mask: recorte propio (estilos de la bandera detrás de las fotos); wave: la tela ondea; slant: va inclinada.
export function FlagFade({ code, fadeTo = 'left', opacity = 0.55, animated = true, dim = 0.3, mask: customMask, wave = false, slant = false, style }) {
  const src = flagSrc(code);
  if (!src) return null;
  // 'photo': centro sólido (lo tapa la foto) y borde que se desvanece; así sobre el chroma no queda lavada
  const mask = customMask || (fadeTo === 'photo'
    ? 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, #000 55%, rgba(0,0,0,0.6) 75%, transparent 100%)'
    : fadeTo === 'radial'
      ? 'radial-gradient(ellipse at 50% 45%, #000 0%, rgba(0,0,0,0.55) 38%, transparent 66%)'
      : `linear-gradient(to ${fadeTo}, #000 0%, rgba(0,0,0,0.65) 35%, transparent 90%)`);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity, WebkitMaskImage: mask, maskImage: mask, ...style }}>
      <style>{'@keyframes flagFadeSheen { 0% { transform: translateX(-60%); } 100% { transform: translateX(160%); } } @keyframes flagFadeWave { 0% { transform: perspective(600px) rotateY(-7deg) skewY(-2deg) scale(1.08); } 100% { transform: perspective(600px) rotateY(7deg) skewY(2deg) scale(1.08); } } @keyframes flagFadeRipple { 0% { background-position: 0 0; } 100% { background-position: 240px 0; } }'}</style>
      <img src={src} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.1)',
        transform: slant ? 'skewX(-12deg) scale(1.25)' : undefined,
        animation: wave ? 'flagFadeWave 2.8s ease-in-out infinite alternate' : undefined
      }} />
      {/* Sombreado de tela + brillo que cruza despacio */}
      <div style={{ position: 'absolute', inset: 0, background: wave
        ? 'repeating-linear-gradient(100deg, rgba(0,0,0,0.22) 0px, rgba(255,255,255,0.12) 60px, rgba(0,0,0,0.22) 120px, rgba(255,255,255,0.08) 180px, rgba(0,0,0,0.22) 240px)'
        : 'repeating-linear-gradient(100deg, rgba(0,0,0,0.10) 0px, rgba(255,255,255,0.06) 60px, rgba(0,0,0,0.10) 120px)',
        animation: wave ? 'flagFadeRipple 2.4s linear infinite' : undefined }} />
      {dim > 0 && <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${dim})` }} />}
      {animated && <div style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.18), transparent)', animation: 'flagFadeSheen 6s ease-in-out infinite' }} />}
    </div>
  );
}

// Bandera del piloto desvaneciéndose DETRÁS de una foto grande (ganador, grilla, zócalo...). Va como hermana anterior de
// la <img> dentro de un contenedor con position relative; la foto tiene que ir con position relative/absolute para quedar
// encima. Se apaga en PERSONALIZAR (config.flagsBehindPhotos === false).
// El estilo (óvalo, halo, flameando, columna, banda, desde abajo, diagonal, completa) y la intensidad se eligen en
// PERSONALIZAR (config.photoFlagStyle / config.photoFlagOpacity).
export function PhotoFlag({ driver, number, config, opacity = 0.85, animated = true, style }) {
  if (config?.flagsBehindPhotos === false) return null;
  const code = driverCountry(driver, config, number);
  if (!code) return null;
  const st = photoFlagStyle(config);
  return <FlagFade code={code} mask={st.mask} wave={st.wave} slant={st.slant} opacity={photoFlagOpacity(config, opacity)} dim={0.1} animated={animated} style={style} />;
}
