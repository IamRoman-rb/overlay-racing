export default function DriverInfo({ driver, config, isVisible, id = 'driverInfo' }) {
  const pos = config?.positions?.[id] || { x: 80, y: 480, scale: 1 };
  
  // EXTRAEMOS LA PALETA COMPLETA
  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#bdc3c7';

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left',
      zIndex: 45, pointerEvents: 'none',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : `scale(${pos.scale}) translateX(-40px)`
    }}>
      {driver && (
        <div style={{
          display: 'flex', width: '480px', 
          backgroundColor: themeBg, /* <-- APLICADO FONDO */
          borderTop: `4px solid ${themeMain}`, /* <-- APLICADO COLOR PRINCIPAL */
          borderRadius: '8px', overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
        }}>
          {/* BLOQUE IZQUIERDO: POSICIÓN Y NÚMERO */}
          <div style={{
            backgroundColor: themeSecondary, /* <-- APLICADO COLOR SECUNDARIO */
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', padding: '15px 25px',
            borderRight: `3px solid ${themeMain}`
          }}>
            <span style={{ fontSize: '13px', fontWeight: '900', color: themeBg, letterSpacing: '1px' }}>POS {driver.pos}</span>
            <span style={{ fontSize: '38px', fontWeight: '900', color: themeBg, lineHeight: '1' }}>{driver.number}</span>
          </div>

          {/* BLOQUE DERECHO: NOMBRE Y MEJOR VUELTA */}
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