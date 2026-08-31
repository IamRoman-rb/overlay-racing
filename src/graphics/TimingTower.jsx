import { useState, useEffect, useRef } from 'react';

export default function TimingTower({ drivers, config, isVisible, id = 'tower', sessionInfo }) {
  const TOWER_ROW_HEIGHT = 45; 
  const pos = config?.positions?.[id] || { x: 20, y: 20, scale: 1 };

  const prevDriversRef = useRef({});
  const [trends, setTrends] = useState({});

  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#3498db';

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';

  // Animación de entrada
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  useEffect(() => { 
    setTrends(prevTrends => {
      const newTrends = { ...prevTrends };
      drivers.forEach(driver => {
        const prevDriver = prevDriversRef.current[driver.name];
        if (prevDriver) {
          const prevPos = parseInt(prevDriver.pos, 10);
          const currPos = parseInt(driver.pos, 10);
          if (currPos < prevPos) newTrends[driver.name] = 'up';        
          else if (currPos > prevPos) newTrends[driver.name] = 'down';      
          else if (driver.laps !== prevDriver.laps) newTrends[driver.name] = 'same';
        } else {
          newTrends[driver.name] = 'same';
        }
      });
      return newTrends;
    });
    const currentDriversMap = {};
    drivers.forEach(d => currentDriversMap[d.name] = d);
    prevDriversRef.current = currentDriversMap;
  }, [drivers]);

  const renderTrend = (trend) => {
    if (trend === 'up') return <span style={{ color: '#2ecc71', fontSize: '12px' }}>▲</span>;
    if (trend === 'down') return <span style={{ color: themeMain, fontSize: '12px' }}>▼</span>; 
    return <span style={{ color: '#7f8c8d', fontSize: '12px' }}>-</span>;
  };

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      width: '320px', height: '650px', 
      
      backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
      borderTop: hasCustomBg ? 'none' : `4px solid ${themeMain}`, 
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.5)',

      borderRadius: bRad,
      display: 'flex', flexDirection: 'column', zIndex: 10,
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
      opacity: isVisible ? 1 : 0, 
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      
      <div style={{ 
        padding: '12px 15px', 
        backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, 
        borderBottom: hasCustomBg ? 'none' : `2px solid ${themeMain}`,
        display: 'flex', 
        flexDirection: 'column', // <-- Cambiado a columna para apilar los elementos
        alignItems: 'center', 
        justifyContent: 'center', gap: '10px', 
        borderRadius: `${bRad} ${bRad} 0 0` 
      }}>
        
        {/* LOGOS ARRIBA */}
        {!hasCustomBg && (config?.logo || config?.categoryLogo) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '35px', maxWidth: '80px', objectFit: 'contain' }} />}
            {config?.logo && config?.categoryLogo && <div style={{ height: '25px', width: '2px', backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />}
            {config?.categoryLogo && <img src={config.categoryLogo} alt="Categoría" style={{ height: '35px', maxWidth: '80px', objectFit: 'contain' }} />}
          </div>
        )}
        
        {/* TEXTOS ABAJO */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          
          {sessionInfo?.name && (
            <span style={{ fontWeight: '900', fontSize: '15px', textAlign: 'center', width: '100%', color: themeTitleText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
              {sessionInfo.name}
            </span>
          )}
        </div>

      </div>
      
      <div style={{ backgroundColor: hasCustomBg ? 'transparent' : 'rgba(0,0,0,0.4)', padding: '8px 15px', display: 'flex', justifyContent: 'space-evenly', borderBottom: hasCustomBg ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
         <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>VUELTAS</span>
          <span style={{ color: themeNumberText, fontSize: '16px', fontWeight: 'bold' }}>{sessionInfo?.laps || '-'}</span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>TIEMPO</span>
          <span style={{ color: themeNumberText, fontSize: '16px', fontWeight: 'bold' }}>{sessionInfo?.totalTime || '-'}</span>
        </span>
      </div>
      
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {drivers.map((driver, index) => (
          <div key={driver.number || driver.name} style={{ position: 'absolute', top: `${index * TOWER_ROW_HEIGHT}px`, left: 0, width: '100%', height: `${TOWER_ROW_HEIGHT}px`, display: 'flex', alignItems: 'center', padding: '0 15px', boxSizing: 'border-box', borderBottom: hasCustomBg ? 'none' : '1px solid rgba(255,255,255,0.05)', transition: 'top 0.6s ease-in-out', fontSize: '16px' }}>
            <span style={{ width: '25px', color: themeAccent, fontWeight: 'bold' }}>{driver.pos}</span> 
            <span style={{ width: '15px', display: 'flex', justifyContent: 'center' }}>{renderTrend(trends[driver.name])}</span>
            <div style={{ backgroundColor: themeSecondary, color: '#000', fontWeight: '900', fontSize: '12px', width: '26px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', marginRight: '8px', marginLeft: '6px' }}>{driver.number}</div>
            <span style={{ flex: 1, color: themeNormalText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{driver.name}</span>
            <span style={{ width: '65px', textAlign: 'right', color: themeNumberText, fontSize: '14px', fontWeight: 'bold' }}>{driver.lastLap}</span>
          </div>
        ))}
      </div>
    </div>
  );
}