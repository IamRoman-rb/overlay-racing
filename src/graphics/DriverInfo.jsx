export default function DriverInfo({ driver, config, isVisible, id = 'driverInfo' }) {
  const pos = config?.positions?.[id] || { x: 80, y: 480, scale: 1 };
  
  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#bdc3c7';

  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;

  // LECTURA DE BORDES Y ANIMACIÓN
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'

  // CÁLCULO DE LA ANIMACIÓN DE ENTRADA
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; // Slide
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; // Solo opacidad
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`; // Pequeño al inicio

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left', zIndex: 45, pointerEvents: 'none',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden
    }}>
      {driver && (
        <div style={{
          display: 'flex', width: '480px', 
          backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
          borderTop: hasCustomBg ? 'none' : `4px solid ${themeMain}`, 
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)',
          borderRadius: bRad, // <-- APLICAMOS EL BORDE REDONDEADO SELECCIONADO
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: hasCustomBg ? 'transparent' : themeSecondary, 
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', padding: '15px 25px',
            borderRight: hasCustomBg ? 'none' : `3px solid ${themeMain}`
          }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: hasCustomBg ? themeAccent : themeBg, letterSpacing: '1px' }}>POS {driver.pos}</span>
            <span style={{ fontSize: '38px', fontWeight: '900', color: hasCustomBg ? themeNormalText : themeBg, lineHeight: '1' }}>{driver.number}</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '15px 25px' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
              {driver.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>MEJOR VUELTA</span>
              <span style={{ fontSize: '18px', color: themeNumberText, fontWeight: '900' }}>{driver.bestLap}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}