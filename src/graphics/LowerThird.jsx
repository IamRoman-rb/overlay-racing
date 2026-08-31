export default function LowerThird({ role, name, isVisible, config, id }) {
  const pos = config?.positions?.[id] || { x: 20, y: 100, scale: 1 };
  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  const customBg = config[`design_${id}`];

  // LECTURA DE BORDES Y ANIMACIÓN
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'

  // CÁLCULO DE LA ANIMACIÓN DE ENTRADA
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`; 

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left', 
      zIndex: 15, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none',
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
      backgroundImage: customBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      minWidth: customBg ? '400px' : 'auto', height: customBg ? '80px' : 'auto',
      borderRadius: bRad // <-- APLICAMOS EL BORDE AQUÍ TAMBIÉN
    }}>
      <div style={{
        backgroundColor: customBg ? 'transparent' : themeBg, 
        borderLeft: customBg ? 'none' : `4px solid ${themeMain}`, 
        display: 'flex', alignItems: 'center', height: '100%',
        boxShadow: customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)', 
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