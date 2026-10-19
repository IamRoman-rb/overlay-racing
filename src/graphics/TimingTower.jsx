import { useState, useEffect, useRef } from 'react';
import { getSkinStyle } from '../utils/skinStyles';

const PODIUM_COLORS = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };

export default function TimingTower({ drivers, config, isVisible, id = 'tower', sessionInfo }) {
  const towerFormat = config?.towerFormat || 'standard';
  const isCompact = towerFormat === 'compact';
  const isPodium = towerFormat === 'podium';
  const isMinimal = towerFormat === 'minimal';

  const TOWER_ROW_HEIGHT = (isCompact || isMinimal) ? 34 : 45;
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
  const skin = getSkinStyle(towerFormat, { themeMain, themeAccent });

  // Difuminado del fondo (backdrop blur) elegible en PERSONALIZAR; por defecto un blur suave.
  const configuredBlur = config?.towerBlur;
  const blurUnset = configuredBlur === undefined || configuredBlur === '';
  // Sin elección del usuario: blur suave, salvo en el skin cristal que ya trae el suyo.
  const blurPx = blurUnset ? (towerFormat === 'glass' ? 0 : 6) : Math.max(0, Number(configuredBlur) || 0);
  const backdropFilter = blurPx > 0 ? `blur(${blurPx}px)` : skin?.backdropFilter;
  // El skin "pro" es un fondo oscuro opaco: lo hacemos algo translúcido para que el blur se note.
  const proBlurred = towerFormat === 'pro' && blurPx > 0;
  const towerSkinBackground = proBlurred ? 'rgba(11,14,19,0.80)' : skin?.background;
  const towerSkinImage = proBlurred ? 'none' : (skin?.backgroundImage || 'none');

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';

  // Animación de entrada
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

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
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
      width: '320px', height: '650px',

      backgroundColor: skin ? towerSkinBackground : ((hasCustomBg || isMinimal) ? 'transparent' : themeBg),
      border: skin ? skin.border : 'none',
      borderTop: skin ? skin.border : ((hasCustomBg || isMinimal) ? 'none' : `4px solid ${themeMain}`),
      backgroundImage: hasCustomBg ? `url(${customBg})` : towerSkinImage,
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      boxShadow: skin ? skin.boxShadow : ((hasCustomBg || isMinimal) ? 'none' : '0 10px 30px rgba(0,0,0,0.5)'),
      backdropFilter,

      borderRadius: bRad,
      display: 'flex', flexDirection: 'column', zIndex: 10,
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
      opacity: isVisible ? 1 : 0, 
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      
      {!isMinimal && (
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
      )}

      {!isMinimal && (
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
      )}

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {drivers.map((driver, index) => {
          const podiumColor = isPodium ? PODIUM_COLORS[Number(driver.pos)] : null;
          const zebraBg = isMinimal ? (index % 2 === 0 ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)') : null;
          return (
          <div key={driver.number || driver.name} style={{
            position: 'absolute', top: `${index * TOWER_ROW_HEIGHT}px`, left: 0, width: '100%', height: `${TOWER_ROW_HEIGHT}px`,
            display: 'flex', alignItems: 'center', padding: '0 15px', boxSizing: 'border-box',
            backgroundColor: zebraBg || 'transparent',
            borderLeft: podiumColor ? `4px solid ${podiumColor}` : 'none',
            borderRadius: isMinimal ? bRad : 0,
            borderBottom: (hasCustomBg || isMinimal) ? 'none' : '1px solid rgba(255,255,255,0.05)',
            transition: 'top 0.6s ease-in-out', fontSize: isCompact || isMinimal ? '13px' : '16px'
          }}>
            <span style={{ width: '25px', color: podiumColor || themeAccent, fontWeight: 'bold' }}>{driver.pos}</span>
            {!isCompact && <span style={{ width: '15px', display: 'flex', justifyContent: 'center' }}>{renderTrend(trends[driver.name])}</span>}
            <div style={{ backgroundColor: podiumColor || themeSecondary, color: '#000', fontWeight: '900', fontSize: isCompact || isMinimal ? '11px' : '12px', width: isCompact || isMinimal ? '22px' : '26px', height: isCompact || isMinimal ? '16px' : '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', marginRight: '8px', marginLeft: '6px' }}>{driver.number}</div>
            <span style={{ flex: 1, color: themeNormalText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{driver.name}</span>
            {!isCompact && <span style={{ width: '65px', textAlign: 'right', color: themeNumberText, fontSize: '14px', fontWeight: 'bold' }}>{driver.lastLap}</span>}
          </div>
          );
        })}
      </div>
    </div>
  );
}