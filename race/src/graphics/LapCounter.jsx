// src/graphics/LapCounter.jsx
import FlagSwatch from '../components/FlagSwatch';
import { currentFlag, sessionProgress } from '../utils/flagState';
import { getSkinStyle } from '../utils/skinStyles';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import CategoryTag from '../components/CategoryTag';
import { makeFx } from '../utils/contentAnim';
import { ChangeTick, ChangeSweep } from '../components/ChangeAnim';

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
  // Al cambiar de vuelta el número viejo cae y entra el nuevo con un golpe, y un brillo cruza la caja
  const fx = makeFx(config, id, isVisible);
  const laps = sessionInfo?.laps || '0';
  // Vuelta / total (si la fuente informa las que faltan): "6/10"
  const prog = sessionProgress(sessionInfo);
  const lapNum = <><ChangeTick value={laps} enabled={fx.on} />{prog.total !== null && <span style={{ fontSize: '0.45em', opacity: 0.75 }}>/{prog.total}</span>}</>;
  const sweep = <ChangeSweep value={laps} enabled={fx.on} />;
  // Bandera vigente (PANEL o cronometraje) en una franja abajo, y el tiempo de la sesión debajo del número
  const flag = currentFlag(sessionInfo, config);
  const flagBar = flag ? <FlagSwatch flag={flag} width="100%" height={7} radius={0} /> : null;
  const totalTime = prog.timeToGo ? `RESTA ${prog.timeToGo}` : (sessionInfo?.totalTime && sessionInfo.totalTime !== '-' ? sessionInfo.totalTime : '');
  const timeLine = (color, size = '12px') => (totalTime ? <span style={{ display: 'block', color, fontSize: size, fontWeight: 'bold', fontFamily: 'monospace', marginTop: '2px' }}>{totalTime}</span> : null);

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
          <span style={{ display: 'inline-block', color: themeTitleText, fontSize: '11px', fontWeight: '900', letterSpacing: '2px', ...fx.text(0) }}>VUELTA<CategoryTag config={config} id={id} block size="0.85em" style={{ letterSpacing: '1px' }} /></span>
        </div>
        <div style={{ padding: '8px 20px' }}>
          <span style={{ display: 'inline-block', color: themeNumberText, fontSize: '34px', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', ...fx.num(1) }}>
            {lapNum}
          </span>
          {timeLine(themeTitleText)}
        </div>
        {flagBar}
        {sweep}
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
          border: hasCustomBg ? 'none' : `4px solid ${flag && !flag.checker && !flag.stripes ? flag.color : themeMain}`,
          boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)',
          position: 'relative', overflow: 'hidden'
        }}>
          <span style={{ display: 'inline-block', color: themeAccent, fontSize: '9px', fontWeight: '900', letterSpacing: '1px', ...fx.text(0) }}>VUELTA</span>
          <span style={{ display: 'inline-block', color: themeNumberText, fontSize: '34px', fontWeight: '900', lineHeight: 1, ...fx.num(1) }}>
            {lapNum}
          </span>
          {sweep}
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo el número flotando
  if (lapCounterFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', color: themeAccent, fontSize: '11px', fontWeight: '900', letterSpacing: '2px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)', ...fx.text(0) }}>VUELTA<CategoryTag config={config} id={id} block size="0.85em" style={{ letterSpacing: '1px' }} /></span>
          <span style={{ display: 'inline-block', color: themeNumberText, fontSize: '40px', fontWeight: '900', lineHeight: 1, textShadow: '2px 2px 6px rgba(0,0,0,0.9)', ...fx.num(1) }}>
            {lapNum}
          </span>
          {flag && <FlagSwatch flag={flag} width="auto" height={18} label={flag.short} fontSize={10} style={{ marginTop: '4px' }} />}
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
      <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ display: 'inline-block', color: themeNumberText, fontSize: '38px', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', ...fx.num(0) }}>
          {lapNum}
        </span>
        {timeLine(themeTitleText)}
      </div>
      {flagBar}
      {sweep}
    </div>
  );
}