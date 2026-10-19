// src/graphics/Branding.jsx
// Marca de agua con el logo de la productora y el de la categoría (los que se cargan en
// PERSONALIZAR > Recursos multimedia). Se muestra/oculta con su botón del panel.
import { getSkinStyle } from '../utils/skinStyles';

export default function Branding({ isVisible, config, id = 'branding' }) {
  const pos = config?.positions?.[id] || { x: 1640, y: 900, scale: 1 };

  const themeBg = config?.themeBg || '#1a1a1a';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';

  const customBg = config?.[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config?.[`borderRadius_${id}`] !== undefined ? config[`borderRadius_${id}`] : '8px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const format = config?.brandingFormat || 'standard';
  const show = config?.brandingShow || 'both';
  const skin = getSkinStyle(format, { themeMain, themeAccent });

  const producerLogo = show !== 'category' ? config?.logo : null;
  const categoryLogo = show !== 'producer' ? config?.categoryLogo : null;
  const hasLogos = !!(producerLogo || categoryLogo);

  let transformHidden = `scale(${pos.scale}) translateX(30px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const visible = !!isVisible && hasLogos;
  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
    zIndex: 40, pointerEvents: 'none',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    opacity: visible ? 1 : 0,
    transform: visible ? `scale(${pos.scale})` : transformHidden
  };

  // Sin logos cargados no se dibuja nada (así no queda una caja vacía en el aire)
  if (!hasLogos) return null;

  const isMinimal = format === 'minimal';
  const isStacked = format === 'stacked';
  const logoHeight = isMinimal ? 70 : 60;
  const logoStyle = {
    height: `${logoHeight}px`, maxWidth: isStacked ? '220px' : '200px', objectFit: 'contain',
    filter: isMinimal ? 'drop-shadow(2px 2px 6px rgba(0,0,0,0.9))' : 'none'
  };
  const dividerStyle = isStacked
    ? { width: '70%', height: '2px', backgroundColor: 'rgba(255,255,255,0.25)' }
    : { height: `${logoHeight - 15}px`, width: '2px', backgroundColor: 'rgba(255,255,255,0.25)' };

  const boxStyle = isMinimal ? {} : {
    padding: isStacked ? '14px 22px' : '10px 22px',
    backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
    backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
    backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
    borderRadius: bRad,
    border: skin ? skin.border : 'none',
    borderBottom: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
    boxShadow: skin ? skin.boxShadow : (hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)'),
    backdropFilter: skin?.backdropFilter
  };

  return (
    <div style={wrapperStyle}>
      <div style={{
        display: 'flex', flexDirection: isStacked ? 'column' : 'row', alignItems: 'center', justifyContent: 'center',
        gap: isMinimal ? '22px' : '18px', ...boxStyle
      }}>
        {producerLogo && <img src={producerLogo} alt="Productora" style={logoStyle} />}
        {producerLogo && categoryLogo && !isMinimal && <div style={dividerStyle} />}
        {categoryLogo && <img src={categoryLogo} alt="Categoría" style={logoStyle} />}
      </div>
    </div>
  );
}
