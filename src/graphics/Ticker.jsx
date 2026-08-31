export default function Ticker({ drivers, isVisible, config, id = 'ticker', sessionInfo }) {
  const tickerItems = [...drivers, ...drivers];
  const animationDuration = drivers.length > 0 ? drivers.length * 4.5 : 0; 
  const pos = config?.positions?.[id] || { x: 0, y: 1000, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#bdc3c7';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#888888';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#3498db';

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'

  // Animación de entrada (La tira inferior suele deslizar desde abajo hacia arriba)
  let transformHidden = `scale(${pos.scale}) translateY(60px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left',
      zIndex: 20, width: '1920px', 
      height: hasCustomBg ? '80px' : '60px', 
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0, 
      transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden,
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      <style>{`
        @keyframes scrollTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { display: flex; width: max-content; animation: scrollTicker ${animationDuration}s linear infinite; }
        .driver-item { 
          width: 300px; display: flex; alignItems: center; 
          border-right: ${hasCustomBg ? 'none' : '2px solid rgba(255, 255, 255, 0.1)'}; 
          padding: 0 15px; box-sizing: border-box; gap: 10px; height: 100%; 
        }
      `}</style>

      <div style={{
        width: '100%', height: '100%', 
        backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
        borderTop: hasCustomBg ? 'none' : `4px solid ${themeMain}`, 
        borderRadius: bRad, // <-- APLICADO BORDE REDONDEADO AL CONTENEDOR INTERNO
        display: 'flex', alignItems: 'center', boxSizing: 'border-box', overflow: 'hidden'
      }}>
        
        {hasCustomBg && (
          <div style={{ width: '400px', height: '100%', flexShrink: 0 }}></div>
        )}

        {!hasCustomBg && (config?.logo || config?.categoryLogo) && (
          <div style={{ 
            height: '100%', padding: '0 15px', backgroundColor: themeHeaderBg, 
            borderRight: `3px solid ${themeMain}`, display: 'flex', alignItems: 'center', 
            justifyContent: 'center', gap: '15px', zIndex: 10 
          }}>
            {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '45px', maxWidth: '120px', objectFit: 'contain' }} />}
            {config?.logo && config?.categoryLogo && <div style={{ height: '35px', width: '2px', backgroundColor: 'rgba(255,255,255,0.2)' }} />}
            {config?.categoryLogo && <img src={config.categoryLogo} alt="Categoría" style={{ height: '45px', maxWidth: '120px', objectFit: 'contain' }} />}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', height: '100%' }}>
          {drivers.length > 0 && (
            <div className="ticker-track" style={{ height: '100%' }}>
              {tickerItems.map((driver, index) => (
                <div key={index} className="driver-item">
                  
                  <div style={{ color: hasCustomBg ? '#fff' : themeAccent, fontWeight: '900', fontSize: '22px', minWidth: '25px', textAlign: 'center' }}>
                    {driver.pos}
                  </div>

                  <div style={{ 
                    backgroundColor: hasCustomBg ? 'rgba(255,255,255,0.15)' : themeSecondary, 
                    color: hasCustomBg ? '#fff' : '#000', 
                    fontWeight: '900', fontSize: '22px', width: '45px', height: '35px', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', borderRadius: '4px', 
                    border: hasCustomBg ? '1px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.5)' 
                  }}>
                    {driver.number}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
                    <span style={{ color: themeNormalText, fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
                      {driver.name}
                    </span>
                    <span style={{ color: hasCustomBg ? '#aaaaaa' : themeNumberText, fontSize: '14px', fontWeight: 'bold', lineHeight: '1' }}>
                      {driver.lastLap}
                    </span> 
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          height: '100%', padding: '0 20px', 
          backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, 
          borderLeft: hasCustomBg ? 'none' : `3px solid ${themeMain}`, 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '130px', zIndex: 10 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', gap: '15px' }}>
            <span style={{ color: themeTitleText, fontWeight: 'bold' }}>VUELTAS</span>
            <span style={{ color: themeNormalText, fontWeight: 'bold' }}>{sessionInfo?.laps || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', gap: '15px' }}>
            <span style={{ color: themeTitleText, fontWeight: 'bold' }}>TIEMPO</span>
            <span style={{ color: themeNormalText, fontWeight: 'bold' }}>{sessionInfo?.totalTime || '-'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}