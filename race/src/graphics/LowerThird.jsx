import { getSkinStyle } from '../utils/skinStyles';
import { insetBox } from '../utils/insetBox';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import { getElitePalette, ELITE_FONT } from '../utils/elite';
import { makeFx } from '../utils/contentAnim';
import MicIcon, { VoiceBars } from '../components/MicIcon';

// Zócalos de voces (relator, comentarista, noteros): llevan un micrófono en la caja (se puede sacar en PERSONALIZAR)
const VOICE_IDS = ['relator', 'comentarista', 'notero1', 'notero2'];

export default function LowerThird({ role, name, isVisible, config, id }) {
  const pos = config?.positions?.[id] || { x: 20, y: 100, scale: 1 };
  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;

  // LECTURA DE BORDES, ANIMACIÓN Y FORMATO
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'
  const animDur = getAnimDuration(config, id);
  const format = config[`lowerThirdFormat_${id}`] || 'standard';
  const skin = getSkinStyle(format, { themeMain, themeAccent });
  // ALINEACIÓN DEL TEXTO (izquierda / centro / derecha) dentro de la caja
  const textAlign = ['left', 'center', 'right'].includes(config[`textAlign_${id}`]) ? config[`textAlign_${id}`] : 'left';
  const alignItems = { left: 'flex-start', center: 'center', right: 'flex-end' }[textAlign];

  // Animación del contenido (micrófono, rol, nombre, líneas) después de que entra la caja
  const fx = makeFx(config, id, isVisible);
  const showMic = VOICE_IDS.includes(id) && config[`lowerThirdMic_${id}`] !== false;
  const mic = (size, color, i = 0) => (showMic ? <MicIcon size={size} color={color} live={fx.on} style={fx.icon(i)} /> : null);

  // CÁLCULO DE LA ANIMACIÓN DE ENTRADA
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left',
    zIndex: 15, transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
    opacity: isVisible || animStyle === 'roll' ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none',
    transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateX(0)` : transformHidden, ...getRollClip(animStyle, isVisible),
  };

  // FORMATO MICRÓFONO: diseño propio de las voces — micrófono grande en un círculo, con vúmetro, y el nombre en una placa
  if (format === 'mic') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.55))' }}>
          <div style={{
            position: 'relative', zIndex: 2, width: '86px', height: '86px', borderRadius: '50%', flexShrink: 0,
            background: `radial-gradient(circle at 35% 30%, ${themeMain}, ${themeHeaderBg})`,
            border: `4px solid ${themeAccent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...fx.icon(0)
          }}>
            <MicIcon size={36} color="#fff" />
            {fx.on && isVisible && <span style={{ position: 'absolute', ...insetBox('-4px'), borderRadius: '50%', '--ca-glow': `${themeAccent}aa`, animation: 'caGlow 1.6s ease-out 0.6s infinite' }} />}
          </div>
          <div style={{
            marginLeft: '-26px', padding: '10px 26px 10px 40px', minWidth: '240px', display: 'flex', flexDirection: 'column', alignItems, textAlign,
            backgroundColor: hasCustomBg ? 'transparent' : themeBg,
            backgroundImage: hasCustomBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
            borderRadius: `0 ${bRad} ${bRad} 0`, borderBottom: hasCustomBg ? 'none' : `4px solid ${themeMain}`, ...fx.wipe(1)
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: themeAccent, fontSize: '12px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', ...fx.text(2) }}>
              {role}{fx.on && <VoiceBars height={12} color={themeAccent} />}
            </span>
            <span style={{ display: 'inline-block', color: themeNormalText, fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1, whiteSpace: 'nowrap', ...fx.text(3) }}>
              {name || '...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ELITE (paquete azul de transmisión): ícono de micrófono (o ubicación para el circuito), nombre y rol
  if (format === 'elite') {
    const pal = getElitePalette(config);
    const isPlace = id === 'circuito';
    const icon = isPlace
      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M12 22s7-7.7 7-13a7 7 0 0 0-14 0c0 5.3 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></svg>
      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></svg>;
    return (
      <div style={wrapperStyle}>
        <div style={{ fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase', display: 'flex', flexDirection: 'column', alignItems, textAlign }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '22px', backgroundColor: pal.deep, borderRadius: `${bRad} ${bRad} 0 0`, ...fx.icon(0) }}>{icon}</span>
          <div style={{ background: pal.background, padding: '6px 16px 6px 14px', minWidth: '220px', boxSizing: 'border-box', borderRadius: `0 ${bRad} ${bRad} ${bRad}`, borderLeft: `3px solid ${pal.accent}`, boxShadow: '0 8px 22px rgba(0,0,0,0.45)' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.05, whiteSpace: 'nowrap', ...fx.text(1) }}>{name || '...'}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px', color: '#7fd3ff', ...fx.text(2) }}>{role}</div>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo texto con línea de acento debajo
  if (format === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems, textAlign, gap: '2px', padding: '4px 2px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: themeAccent, fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)', ...fx.text(1) }}>
            {mic(14, themeAccent)}{role}
          </span>
          <span style={{ display: 'inline-block', color: themeNormalText, fontSize: '30px', fontWeight: '900', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)', ...fx.text(2) }}>
            {name || '...'}
          </span>
          <div style={{ height: '4px', width: '90px', backgroundColor: themeMain, marginTop: '2px', borderRadius: '2px', ...fx.wipe(3) }} />
        </div>
      </div>
    );
  }

  // FORMATO CON MARCO: badge de rol + caja con borde para el nombre
  if (format === 'boxed') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{
            backgroundColor: themeAccent, color: '#000', fontSize: '11px', fontWeight: '900',
            padding: '5px 16px', borderRadius: `${bRad} ${bRad} 0 0`, textTransform: 'uppercase', letterSpacing: '1px',
            display: 'inline-flex', alignItems: 'center', gap: '6px', ...fx.slide(0)
          }}>
            {mic(13, '#000', 1)}{role}
          </div>
          <div style={{
            backgroundColor: hasCustomBg ? 'transparent' : themeBg,
            backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
            backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
            border: hasCustomBg ? 'none' : `2px solid ${themeMain}`,
            padding: '10px 20px', minWidth: '220px', textAlign,
            borderRadius: `0 ${bRad} ${bRad} ${bRad}`, boxShadow: hasCustomBg ? 'none' : '2px 4px 12px rgba(0,0,0,0.6)'
          }}>
            <span style={{ display: 'inline-block', color: themeNormalText, fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', ...fx.text(2) }}>
              {name || '...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO BROADCAST: bloque de rol vertical + bloque de nombre, estilo TV
  if (format === 'broadcast') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: bRad, overflow: 'hidden', boxShadow: '2px 4px 15px rgba(0,0,0,0.6)' }}>
          <div style={{
            backgroundColor: themeMain, color: '#fff', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px',
            alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900',
            textTransform: 'uppercase', letterSpacing: '2px'
          }}>
            {mic(16, '#fff')}
            <span style={{ writingMode: 'vertical-rl', ...fx.text(1) }}>{role}</span>
          </div>
          <div style={{
            backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg,
            backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
            backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
            padding: '10px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems, textAlign, minWidth: '220px', position: 'relative'
          }}>
            <span style={{ display: 'inline-block', color: themeNormalText, fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', ...fx.text(2) }}>
              {name || '...'}
            </span>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', backgroundColor: themeAccent, ...fx.wipe(3) }} />
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original) + skins
  return (
    <div style={{
      ...wrapperStyle,
      backgroundImage: customBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      minWidth: customBg ? '400px' : 'auto', height: customBg ? '80px' : 'auto',
      borderRadius: bRad
    }}>
      <div style={{
        backgroundColor: skin ? skin.background : (customBg ? 'transparent' : themeBg),
        border: skin ? skin.border : 'none',
        borderLeft: skin ? skin.border : (customBg ? 'none' : `4px solid ${themeMain}`),
        display: 'flex', alignItems: 'center', height: '100%',
        boxShadow: skin ? skin.boxShadow : (customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)'),
        backdropFilter: skin?.backdropFilter,
        overflow: 'hidden',
        borderRadius: bRad
      }}>

        {!customBg && config?.logo && (
          <div style={{
            backgroundColor: themeHeaderBg, padding: '0 15px', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${themeMain}`
          }}>
            <img src={config.logo} alt="Logo" style={{ height: '45px', maxWidth: '100px', objectFit: 'contain', ...fx.icon(0) }} />
          </div>
        )}

        {/* Micrófono en un círculo con el color principal (con diseño propio cargado va chico, junto al rol) */}
        {showMic && !customBg && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 0 0 16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: themeMain, boxShadow: `0 0 0 3px ${themeAccent}55`, ...fx.icon(1) }}>
              <MicIcon size={19} color="#fff" />
            </span>
          </div>
        )}

        <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', alignItems, textAlign, minWidth: '200px', justifyContent: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: themeAccent, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', ...fx.text(1) }}>
            {customBg && mic(12, themeAccent)}{role}{showMic && !customBg && fx.on && <VoiceBars height={10} color={themeAccent} />}
          </span>
          <span style={{ display: 'inline-block', color: themeNormalText, fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, ...fx.text(2) }}>
            {name || '...'}
          </span>
        </div>
      </div>
    </div>
  );
}
