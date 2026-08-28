import { useState, useEffect, useRef } from 'react';

export default function TimingTower({ drivers, config, isVisible, id = 'tower', sessionInfo }) {
  const TOWER_ROW_HEIGHT = 45; 
  const pos = config?.positions?.[id] || { x: 20, y: 20, scale: 1 };

  const prevDriversRef = useRef({});
  const [trends, setTrends] = useState({});

  // EXTRAEMOS LA PALETA COMPLETA
  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#3498db';

  useEffect(() => { /* Lógica de tendencias omitida por brevedad, no se toca */ 
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
      backgroundColor: themeBg, /* <-- APLICADO FONDO GENERAL */
      borderTop: `4px solid ${themeMain}`, 
      borderRadius: '8px', display: 'flex', flexDirection: 'column', zIndex: 10,
      transition: 'opacity 0.5s ease-in-out', opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      
      {/* CABECERA CON LOGOS */}
      <div style={{ 
        padding: '10px 15px', 
        backgroundColor: themeHeaderBg, /* <-- APLICADO FONDO ENCABEZADO */
        borderBottom: `2px solid ${themeMain}`,
        display: 'flex', alignItems: 'center', 
        justifyContent: (config?.logo || config?.categoryLogo) ? 'flex-start' : 'center', gap: '10px', borderRadius: '8px 8px 0 0' 
      }}>
        {/* LOGOS... */}
        {(config?.logo || config?.categoryLogo) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '30px', maxWidth: '60px', objectFit: 'contain' }} />}
            {config?.logo && config?.categoryLogo && <div style={{ height: '25px', width: '2px', backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />}
            {config?.categoryLogo && <img src={config.categoryLogo} alt="Categoría" style={{ height: '30px', maxWidth: '60px', objectFit: 'contain' }} />}
          </div>
        )}
        <span style={{ fontWeight: 'bold', fontSize: '18px', textAlign: 'center', flex: 1, color: themeTitleText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {config.campeonato || 'CLASIFICACIÓN'}
        </span>
      </div>
      
      {/* INFO SESIÓN */}
      <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '8px 15px', display: 'flex', justifyContent: 'space-evenly', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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
          <div key={driver.number || driver.name} style={{ position: 'absolute', top: `${index * TOWER_ROW_HEIGHT}px`, left: 0, width: '100%', height: `${TOWER_ROW_HEIGHT}px`, display: 'flex', alignItems: 'center', padding: '0 15px', boxSizing: 'border-box', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'top 0.6s ease-in-out', fontSize: '16px' }}>
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