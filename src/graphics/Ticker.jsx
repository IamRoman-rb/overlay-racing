export default function Ticker({ drivers, isVisible, config, id = 'ticker', sessionInfo }) {
  const tickerItems = [...drivers, ...drivers];
  const animationDuration = drivers.length > 0 ? drivers.length * 4.5 : 0; 
  const pos = config?.positions?.[id] || { x: 0, y: 660, scale: 1 };

  // EXTRAEMOS LA PALETA COMPLETA
  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#bdc3c7';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#888888';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#3498db';

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      zIndex: 20, width: '1280px', 
      transition: 'opacity 0.4s ease-in-out',
      opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      <style>{`
        @keyframes scrollTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { display: flex; width: max-content; animation: scrollTicker ${animationDuration}s linear infinite; }
        .driver-item { width: 280px; display: flex; alignItems: center; border-right: 2px solid rgba(255, 255, 255, 0.1); padding: 0 15px; box-sizing: border-box; gap: 10px; }
      `}</style>

      <div style={{
        width: '100%', height: '60px', 
        backgroundColor: themeBg, /* <-- APLICADO FONDO GENERAL */
        borderTop: `4px solid ${themeMain}`, 
        display: 'flex', alignItems: 'center', 
        boxSizing: 'border-box', overflow: 'hidden'
      }}>
        
        {/* ZONA DE LOGOS */}
        {(config?.logo || config?.categoryLogo) && (
          <div style={{ 
            height: '100%', padding: '0 15px', 
            backgroundColor: themeHeaderBg, /* <-- APLICADO FONDO ENCABEZADO */
            borderRight: `3px solid ${themeMain}`, 
            display: 'flex', alignItems: 'center', 
            justifyContent: 'center', gap: '15px', zIndex: 10 
          }}>
            {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '45px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }} />}
            {config?.logo && config?.categoryLogo && <div style={{ height: '35px', width: '2px', backgroundColor: 'rgba(255,255,255,0.2)' }} />}
            {config?.categoryLogo && <img src={config.categoryLogo} alt="Categoría" style={{ height: '45px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }} />}
          </div>
        )}

        {/* TIRA DE PILOTOS */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', height: '100%' }}>
          {drivers.length > 0 && (
            <div className="ticker-track" style={{ height: '100%' }}>
              {tickerItems.map((driver, index) => (
                <div key={index} className="driver-item">
                  
                  <div style={{ color: themeAccent, fontWeight: '900', fontSize: '22px', minWidth: '25px', textAlign: 'center' }}>
                    {driver.pos}
                  </div>

                  <div style={{ backgroundColor: themeSecondary, color: '#000', fontWeight: '900', fontSize: '22px', width: '45px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: '2px solid rgba(0,0,0,0.5)' }}>
                    {driver.number}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
                    <span style={{ color: themeNormalText, fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>{driver.name}</span>
                    <span style={{ color: themeNumberText, fontSize: '14px', fontWeight: 'bold', lineHeight: '1' }}>{driver.lastLap}</span> 
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* INFO SESIÓN */}
        <div style={{
          height: '100%', padding: '0 20px', 
          backgroundColor: themeHeaderBg, /* <-- APLICADO FONDO ENCABEZADO */
          borderLeft: `3px solid ${themeMain}`, 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '130px', zIndex: 10 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', gap: '15px' }}>
            <span style={{ color: themeTitleText, fontWeight: 'bold' }}>VUELTAS</span>
            <span style={{ color: themeNumberText, fontWeight: 'bold' }}>{sessionInfo?.laps || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', gap: '15px' }}>
            <span style={{ color: themeTitleText, fontWeight: 'bold' }}>TIEMPO</span>
            <span style={{ color: themeNumberText, fontWeight: 'bold' }}>{sessionInfo?.totalTime || '-'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}