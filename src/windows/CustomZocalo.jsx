import { getSkinStyle } from '../utils/skinStyles';
import { getAnimDuration } from '../utils/animationTiming';

export default function CustomZocalo({ isVisible, title, text, config, id = 'customZocalo' }) {
  const pos = config?.positions?.[id] || { x: 20, y: 550, scale: 1 };

  // EXTRAEMOS LA PALETA COMPLETA
  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  const customBg = config?.[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config?.[`borderRadius_${id}`] || '4px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const zocaloFormat = config?.customZocaloFormat || 'standard';
  const skin = getSkinStyle(zocaloFormat, { themeMain, themeAccent });

  let transformHidden = `scale(${pos.scale}) translateX(-40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left',
    zIndex: 50, transition: `opacity ${animDur}s ease-in-out, transform ${animDur}s ease-in-out`,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
    pointerEvents: 'none'
  };

  // FORMATO BANNER: barra completa de ancho de pantalla, texto centrado
  if (zocaloFormat === 'banner') {
    return (
      <div style={{ ...wrapperStyle, width: '1920px' }}>
        <div style={{
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderTop: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
          padding: '14px 0', textAlign: 'center', width: '100%',
          boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)', borderRadius: bRad
        }}>
          {title && (
            <span style={{ color: themeAccent, fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', marginRight: '12px' }}>
              {title}
            </span>
          )}
          <span style={{ color: themeNormalText, fontSize: '26px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {text || '...'}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO CON MARCO: badge de título arriba + caja con borde para el texto
  if (zocaloFormat === 'boxed') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {title && (
            <div style={{
              backgroundColor: themeAccent, color: '#000', fontSize: '12px', fontWeight: '900',
              padding: '5px 16px', borderRadius: `${bRad} ${bRad} 0 0`, textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              {title}
            </div>
          )}
          <div style={{
            backgroundColor: hasCustomBg ? 'transparent' : themeBg,
            backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
            backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
            border: hasCustomBg ? 'none' : `2px solid ${themeMain}`,
            padding: '12px 22px', minWidth: '300px',
            borderRadius: title ? `0 ${bRad} ${bRad} ${bRad}` : bRad,
            boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)'
          }}>
            <span style={{ color: themeNormalText, fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.1' }}>
              {text || '...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo texto flotando sobre el video
  if (zocaloFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {title && (
            <span style={{ color: themeAccent, fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
              {title}
            </span>
          )}
          <span style={{ color: themeNormalText, fontSize: '30px', fontWeight: '900', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            {text || '...'}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={{ ...wrapperStyle, display: 'flex', boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)' }}>
      <div style={{
        backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
        backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        border: skin ? skin.border : 'none',
        borderLeft: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
        boxShadow: skin?.boxShadow,
        backdropFilter: skin?.backdropFilter,
        display: 'flex', alignItems: 'stretch', overflow: 'hidden', borderRadius: bRad
      }}>

        {/* ZONA DE LOGOS */}
        {!hasCustomBg && (config?.logo || config?.categoryLogo) && (
          <div style={{
            backgroundColor: themeHeaderBg, padding: '10px 15px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px',
            borderRight: `2px solid ${themeMain}`
          }}>
            {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '50px', maxWidth: '100px', objectFit: 'contain' }} />}
            {config?.logo && config?.categoryLogo && <div style={{ height: '40px', width: '2px', backgroundColor: 'rgba(255,255,255,0.2)' }} />}
            {config?.categoryLogo && <img src={config.categoryLogo} alt="Categoría" style={{ height: '50px', maxWidth: '100px', objectFit: 'contain' }} />}
          </div>
        )}

        {/* ZONA DE TEXTOS */}
        <div style={{ padding: '12px 25px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '300px' }}>
          {title && (
            <span style={{ color: themeAccent, fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
              {title}
            </span>
          )}
          <span style={{ color: themeNormalText, fontSize: '26px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.1' }}>
            {text || '...'}
          </span>
        </div>

      </div>
    </div>
  );
}
