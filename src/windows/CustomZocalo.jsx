export default function CustomZocalo({ isVisible, title, text, config, id = 'customZocalo' }) {
  const pos = config?.positions?.[id] || { x: 20, y: 550, scale: 1 };

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
      zIndex: 50, transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
      opacity: isVisible ? 1 : 0, 
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : `scale(${pos.scale}) translateX(-40px)`,
      pointerEvents: 'none', display: 'flex', boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
    }}>
      <div style={{
        backgroundColor: themeBg, borderLeft: `4px solid ${themeMain}`, 
        display: 'flex', alignItems: 'stretch', overflow: 'hidden', borderRadius: '4px'
      }}>
        
        {/* ZONA DE LOGOS */}
        {(config?.logo || config?.categoryLogo) && (
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