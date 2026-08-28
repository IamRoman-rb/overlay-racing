export default function LowerThird({ role, name, isVisible, config, id }) {
  const pos = config?.positions?.[id] || { x: 20, y: 100, scale: 1 };

  // EXTRAEMOS LA PALETA COMPLETA
  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transform: `scale(${pos.scale})`, transformOrigin: 'top left', 
      zIndex: 15, transition: 'opacity 0.4s ease-in-out',
      opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none' 
    }}>
      <div style={{
        backgroundColor: themeBg, /* <-- FONDO GENERAL */
        borderLeft: `4px solid ${themeMain}`, 
        display: 'flex', alignItems: 'center',
        boxShadow: '2px 2px 10px rgba(0,0,0,0.5)', overflow: 'hidden'
      }}>
        
        {config?.logo && (
          <div style={{
            backgroundColor: themeHeaderBg, /* <-- FONDO LOGO */
            padding: '0 15px', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            borderRight: `1px solid ${themeMain}`
          }}>
            <img src={config.logo} alt="Logo" style={{ height: '45px', maxWidth: '100px', objectFit: 'contain' }} />
          </div>
        )}

        <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
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