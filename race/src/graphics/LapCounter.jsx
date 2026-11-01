// src/graphics/LapCounter.jsx
import { getSkinStyle } from '../utils/skinStyles';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';

export default function LapCounter({ isVisible, config, sessionInfo, id = 'lapCounter' }) {
  const pos = config?.positions?.[id] || { x: 1700, y: 40, scale: 1 };
  
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeNumberText = config?.themeNumberText || '#ffffff';

  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';

  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] !== undefined ? config[`borderRadius_${id}`] : '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const lapCounterFormat = config?.lapCounterFormat || 'standard';
  const skin = getSkinStyle(lapCounterFormat, { themeMain, themeAccent });

  // Animación que viene desde arriba por estar en la parte superior
  let transformHidden = `scale(${pos.scale}) translateY(-30px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top right',
    zIndex: 40, pointerEvents: 'none',
    transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
    opacity: isVisible || animStyle === 'roll' ? 1 : 0,
    transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible)
  };

  // FORMATO CON ETIQUETA: barra "VUELTA" arriba + número grande abajo
  if (lapCounterFormat === 'labeled') {
    return (
      <div style={{
        ...wrapperStyle, display: 'flex', flexDirection: 'column', minWidth: '140px', textAlign: 'center',
        backgroundColor: hasCustomBg ? 'transparent' : themeBg,
        backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)', overflow: 'hidden'
      }}>
        <div style={{ backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, padding: '5px', borderBottom: hasCustomBg ? 'none' : `3px solid ${themeMain}` }}>
          <span style={{ color: themeTitleText, fontSize: '11px', fontWeight: '900', letterSpacing: '2px' }}>VUELTA</span>
        </div>
        <div style={{ padding: '8px 20px' }}>
          <span style={{ color: themeNumberText, fontSize: '34px', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            {sessionInfo?.laps || '0'}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO CÍRCULO: número dentro de una insignia circular
  if (lapCounterFormat === 'circle') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          width: '110px', height: '110px', borderRadius: '50%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
          boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)'
        }}>
          <span style={{ color: themeAccent, fontSize: '9px', fontWeight: '900', letterSpacing: '1px' }}>VUELTA</span>
          <span style={{ color: themeNumberText, fontSize: '34px', fontWeight: '900', lineHeight: 1 }}>
            {sessionInfo?.laps || '0'}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo el número flotando
  if (lapCounterFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: themeAccent, fontSize: '11px', fontWeight: '900', letterSpacing: '2px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>VUELTA</span>
          <span style={{ color: themeNumberText, fontSize: '40px', fontWeight: '900', lineHeight: 1, textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            {sessionInfo?.laps || '0'}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={{
      ...wrapperStyle,
      display: 'flex', flexDirection: 'column', minWidth: '160px',
      backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
      backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      borderRadius: bRad,
      border: skin ? skin.border : 'none',
      boxShadow: skin ? skin.boxShadow : (hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)'),
      backdropFilter: skin?.backdropFilter,
      overflow: 'hidden', borderTop: skin ? skin.border : (hasCustomBg ? 'none' : `5px solid ${themeMain}`),
    }}>
      <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ color: themeNumberText, fontSize: '38px', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          {sessionInfo?.laps || '0'}
        </span>
      </div>
    </div>
  );
}