import { getSkinStyle } from '../utils/skinStyles';

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
  const format = config[`lowerThirdFormat_${id}`] || 'standard';
  const skin = getSkinStyle(format, { themeMain, themeAccent });

  // CÁLCULO DE LA ANIMACIÓN DE ENTRADA
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left',
    zIndex: 15, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none',
    transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
  };

  // FORMATO MINIMALISTA: sin caja, solo texto con línea de acento debajo
  if (format === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 2px' }}>
          <span style={{ color: themeAccent, fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            {role}
          </span>
          <span style={{ color: themeNormalText, fontSize: '30px', fontWeight: '900', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            {name || '...'}
          </span>
          <div style={{ height: '4px', width: '90px', backgroundColor: themeMain, marginTop: '2px', borderRadius: '2px' }} />
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
            padding: '5px 16px', borderRadius: `${bRad} ${bRad} 0 0`, textTransform: 'uppercase', letterSpacing: '1px'
          }}>
            {role}
          </div>
          <div style={{
            backgroundColor: hasCustomBg ? 'transparent' : themeBg,
            backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
            backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
            border: hasCustomBg ? 'none' : `2px solid ${themeMain}`,
            padding: '10px 20px', minWidth: '220px',
            borderRadius: `0 ${bRad} ${bRad} ${bRad}`, boxShadow: hasCustomBg ? 'none' : '2px 4px 12px rgba(0,0,0,0.6)'
          }}>
            <span style={{ color: themeNormalText, fontSize: '24px', fontWeight: '900', textTransform: 'uppercase' }}>
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
            backgroundColor: themeMain, color: '#fff', padding: '10px 14px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900',
            textTransform: 'uppercase', writingMode: 'vertical-rl', letterSpacing: '2px'
          }}>
            {role}
          </div>
          <div style={{
            backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg,
            backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
            backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
            padding: '10px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '220px', position: 'relative'
          }}>
            <span style={{ color: themeNormalText, fontSize: '24px', fontWeight: '900', textTransform: 'uppercase' }}>
              {name || '...'}
            </span>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', backgroundColor: themeAccent }} />
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={{
      ...wrapperStyle,
      backgroundImage: customBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      minWidth: customBg ? '400px' : 'auto', height: customBg ? '80px' : 'auto',
      borderRadius: bRad // <-- APLICAMOS EL BORDE AQUÍ TAMBIÉN
    }}>
      <div style={{
        backgroundColor: skin ? skin.background : (customBg ? 'transparent' : themeBg),
        border: skin ? skin.border : 'none',
        borderLeft: skin ? skin.border : (customBg ? 'none' : `4px solid ${themeMain}`),
        display: 'flex', alignItems: 'center', height: '100%',
        boxShadow: skin ? skin.boxShadow : (customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)'),
        backdropFilter: skin?.backdropFilter,
        overflow: 'hidden',
        borderRadius: bRad // <-- APLICAMOS EL BORDE
      }}>

        {!customBg && config?.logo && (
          <div style={{
            backgroundColor: themeHeaderBg, padding: '0 15px', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${themeMain}`
          }}>
            <img src={config.logo} alt="Logo" style={{ height: '45px', maxWidth: '100px', objectFit: 'contain' }} />
          </div>
        )}

        <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', minWidth: '200px', justifyContent: 'center' }}>
          <span style={{ color: themeAccent, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {role}
          </span>
          <span style={{ color: themeNormalText, fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
            {name || '...'}
          </span>
        </div>
      </div>
    </div>
  );
}