import { useState, useEffect } from 'react';
import { getSkinStyle } from '../utils/skinStyles';

const PODIUM_COLORS = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };

export default function Ticker({ drivers, isVisible, config, id = 'ticker', sessionInfo }) {
  const tickerFormat = config?.tickerFormat || 'standard';
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

  const isCompact = tickerFormat === 'compact';
  const isPodium = tickerFormat === 'podium';
  const isSpotlight = tickerFormat === 'spotlight';
  const isBoard = tickerFormat === 'board';
  const skin = getSkinStyle(tickerFormat, { themeMain, themeAccent });
  const barHeight = isSpotlight ? '110px' : (isCompact ? '46px' : (hasCustomBg ? '80px' : '60px'));

  // Rotación automática para el formato "Spotlight" (un piloto a la vez, en grande)
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  useEffect(() => {
    if (!isSpotlight || drivers.length === 0) return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % drivers.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isSpotlight, drivers.length]);
  const spotlightDriver = drivers.length > 0 ? drivers[spotlightIndex % drivers.length] : null;

  // Rotación automática para el formato "Board" (tabla de 12 posiciones, pasa de página si hay más pilotos)
  const BOARD_PER_PAGE = 12;
  const [boardPage, setBoardPage] = useState(0);
  useEffect(() => {
    if (!isBoard || drivers.length <= BOARD_PER_PAGE) { setBoardPage(0); return; }
    const totalPages = Math.ceil(drivers.length / BOARD_PER_PAGE);
    const interval = setInterval(() => setBoardPage(prev => (prev + 1) % totalPages), 8000);
    return () => clearInterval(interval);
  }, [isBoard, drivers.length]);

  // Animación de entrada (La tira inferior suele deslizar desde abajo hacia arriba)
  let transformHidden = `scale(${pos.scale}) translateY(60px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  // FORMATO BOARD: tabla de 3 columnas x 4 filas (12 posiciones fijas a la vez), estilo TC —
  // el puntero muestra el tiempo total en una placa roja, el resto la diferencia en una placa verde.
  if (isBoard) {
    const COLS = 3, ROWS = 4;
    const perPage = COLS * ROWS;
    const totalPages = Math.max(1, Math.ceil(drivers.length / perPage));
    const pageDrivers = drivers.slice(boardPage * perPage, boardPage * perPage + perPage);
    const columns = Array.from({ length: COLS }, (_, c) => pageDrivers.slice(c * ROWS, c * ROWS + ROWS));

    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transformOrigin: 'top left', zIndex: 20, width: '1920px',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden,
        pointerEvents: isVisible ? 'auto' : 'none'
      }}>
        <style>{`@keyframes fadeBoardPage { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
        <div style={{
          position: 'relative', display: 'flex', width: '100%', height: '210px',
          backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: skin ? skin.border : 'none',
          borderTop: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
          boxShadow: skin ? skin.boxShadow : 'none', backdropFilter: skin?.backdropFilter,
          borderRadius: bRad, overflow: 'hidden', boxSizing: 'border-box'
        }}>
          {/* PLACA DE CATEGORÍA + VUELTAS */}
          <div style={{ width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              flex: 1, backgroundColor: hasCustomBg ? 'rgba(0,0,0,0.4)' : themeMain,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px'
            }}>
              <span style={{ color: '#fff', fontWeight: '900', fontSize: '20px', textAlign: 'center', textTransform: 'uppercase', lineHeight: '1.15' }}>
                {config?.campeonato || 'CATEGORÍA'}
              </span>
            </div>
            <div style={{
              flex: 1, backgroundColor: hasCustomBg ? 'rgba(0,0,0,0.6)' : themeHeaderBg,
              borderLeft: `6px solid ${themeAccent}`, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ color: themeNormalText, fontWeight: '900', fontSize: '30px', lineHeight: '1' }}>
                {sessionInfo?.laps || '-'}
              </span>
              <span style={{ color: themeTitleText, fontWeight: 'bold', fontSize: '11px', letterSpacing: '1px', marginTop: '2px' }}>
                {sessionInfo?.name || 'VUELTA'}
              </span>
            </div>
          </div>

          {/* GRILLA 3x4 DE POSICIONES */}
          <div key={boardPage} style={{ flex: 1, display: 'flex', animation: 'fadeBoardPage 0.4s ease-out' }}>
            {columns.map((col, colIdx) => (
              <div key={colIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: colIdx < COLS - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                {col.map((driver, rowIdx) => {
                  const isLeader = String(driver.pos) === '1';
                  return (
                    <div key={rowIdx} style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px',
                      borderBottom: rowIdx < ROWS - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none'
                    }}>
                      <span style={{ color: themeNormalText, fontWeight: '900', fontSize: '18px', width: '22px', flexShrink: 0 }}>
                        {driver.pos}
                      </span>
                      <span style={{
                        flexShrink: 0, width: '34px', height: '34px', borderRadius: '50%',
                        backgroundColor: themeSecondary, color: '#000', fontWeight: '900', fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {driver.number}
                      </span>
                      <span style={{
                        flex: 1, color: themeNormalText, fontWeight: '900', fontSize: '15px', textTransform: 'uppercase',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {driver.name}
                      </span>
                      <span style={{
                        flexShrink: 0, minWidth: '68px', textAlign: 'center', padding: '4px 8px', borderRadius: '4px',
                        backgroundColor: isLeader ? themeMain : '#1e8449', color: '#fff', fontWeight: '900', fontSize: '13px', fontFamily: 'monospace'
                      }}>
                        {isLeader ? driver.totalTime : (driver.diff || driver.gap || '-')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ position: 'absolute', bottom: '4px', right: '14px', fontSize: '10px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>
              {boardPage + 1}/{totalPages}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left',
      zIndex: 20, width: '1920px',
      height: barHeight,
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
          width: ${isCompact ? '220px' : '300px'}; display: flex; alignItems: center;
          border-right: ${hasCustomBg ? 'none' : '2px solid rgba(255, 255, 255, 0.1)'};
          padding: 0 15px; box-sizing: border-box; gap: 10px; height: 100%;
        }
        @keyframes spotlightFade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        width: '100%', height: '100%',
        backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
        border: skin ? skin.border : 'none',
        borderTop: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
        boxShadow: skin ? skin.boxShadow : 'none',
        backdropFilter: skin?.backdropFilter,
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
          {isSpotlight && spotlightDriver && (
            <div key={`spotlight-${spotlightIndex}`} style={{
              display: 'flex', alignItems: 'center', gap: '25px', padding: '0 30px', height: '100%',
              width: '100%', boxSizing: 'border-box', animation: 'spotlightFade 0.4s ease forwards'
            }}>
              <div style={{
                color: hasCustomBg ? '#fff' : '#000', backgroundColor: hasCustomBg ? 'rgba(255,255,255,0.15)' : themeAccent,
                fontWeight: '900', fontSize: '42px', minWidth: '70px', height: '70px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {spotlightDriver.pos}
              </div>
              <div style={{
                backgroundColor: hasCustomBg ? 'rgba(255,255,255,0.15)' : themeSecondary, color: hasCustomBg ? '#fff' : '#000',
                fontWeight: '900', fontSize: '30px', width: '70px', height: '50px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: '6px', flexShrink: 0,
                border: hasCustomBg ? '1px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.5)'
              }}>
                {spotlightDriver.number}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
                <span style={{ color: themeNormalText, fontSize: '32px', fontWeight: '900', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
                  {spotlightDriver.name}
                </span>
                <span style={{ color: hasCustomBg ? '#aaaaaa' : themeNumberText, fontSize: '18px', fontWeight: 'bold', lineHeight: '1' }}>
                  {spotlightDriver.lastLap}
                </span>
              </div>
            </div>
          )}

          {!isSpotlight && drivers.length > 0 && (
            <div className="ticker-track" style={{ height: '100%' }}>
              {tickerItems.map((driver, index) => {
                const podiumColor = isPodium ? PODIUM_COLORS[Number(driver.pos)] : null;
                return (
                  <div key={index} className="driver-item">

                    <div style={{ color: podiumColor || (hasCustomBg ? '#fff' : themeAccent), fontWeight: '900', fontSize: isCompact ? '18px' : '22px', minWidth: '25px', textAlign: 'center' }}>
                      {driver.pos}
                    </div>

                    <div style={{
                      backgroundColor: podiumColor || (hasCustomBg ? 'rgba(255,255,255,0.15)' : themeSecondary),
                      color: podiumColor ? '#000' : (hasCustomBg ? '#fff' : '#000'),
                      fontWeight: '900', fontSize: isCompact ? '18px' : '22px', width: isCompact ? '38px' : '45px', height: isCompact ? '28px' : '35px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', borderRadius: '4px',
                      border: hasCustomBg ? '1px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.5)'
                    }}>
                      {driver.number}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
                      <span style={{ color: themeNormalText, fontSize: isCompact ? '15px' : '18px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
                        {driver.name}
                      </span>
                      {!isCompact && (
                        <span style={{ color: hasCustomBg ? '#aaaaaa' : themeNumberText, fontSize: '14px', fontWeight: 'bold', lineHeight: '1' }}>
                          {driver.lastLap}
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
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