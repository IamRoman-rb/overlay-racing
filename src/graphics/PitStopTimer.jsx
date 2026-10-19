// src/graphics/PitStopTimer.jsx
import { useState, useEffect, useRef } from 'react';
import { getSkinStyle } from '../utils/skinStyles';

export default function PitStopTimer({ isVisible, config, pitState, id = 'pitStop' }) {
  const pos = config?.positions?.[id] || { x: 850, y: 900, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeTitleText = config?.themeTitleText || '#ffffff'; // Agregamos el color de título

  const customBg = config[`design_${id}`];
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const pitStopFormat = config?.pitStopFormat || 'standard';
  const skin = getSkinStyle(pitStopFormat, { themeMain, themeAccent });

  const [timeMs, setTimeMs] = useState(0);
  const intervalRef = useRef();

  // MOTOR DEL RELOJ: usamos setInterval (no requestAnimationFrame) porque el
  // Browser Source de vMix no "compone" frames de la página en pantalla, y eso
  // congela cualquier rAF aunque en la ventana Overlay (sí visible) funcione bien.
  useEffect(() => {
    const tick = () => {
      if (pitState?.isRunning && pitState?.startTime) {
        setTimeMs(Date.now() - pitState.startTime);
      } else if (!pitState?.isRunning && pitState?.stoppedTime) {
        setTimeMs(pitState.stoppedTime);
      } else if (!pitState?.isRunning && !pitState?.stoppedTime) {
        setTimeMs(0);
      }
    };

    if (isVisible) {
      tick();
      intervalRef.current = setInterval(tick, 50);
    } else {
      clearInterval(intervalRef.current);
      setTimeout(() => setTimeMs(0), 500); // Resetea el tiempo en la sombra
    }

    return () => clearInterval(intervalRef.current);
  }, [isVisible, pitState]);

  // FORMATO DE TIEMPO TV (M:SS.D o SS.D)
  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const dec = Math.floor((ms % 1000) / 100);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}.${dec}`;
    return `${totalSec}.${dec}`;
  };

  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  if (!pitState?.driver) return null;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
    zIndex: 48, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    opacity: isVisible ? 1 : 0, transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden
  };

  // FORMATO COMPACTO: una sola fila, sin barra de encabezado
  if (pitStopFormat === 'compact') {
    return (
      <div style={{
        ...wrapperStyle, display: 'flex', alignItems: 'center', gap: '10px', width: '320px', padding: '8px 12px',
        backgroundColor: customBg ? 'transparent' : themeBg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        borderRadius: bRad, boxShadow: customBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)',
        borderLeft: customBg ? 'none' : `5px solid ${themeMain}`
      }}>
        <span style={{ backgroundColor: themeSecondary, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '14px', flexShrink: 0 }}>
          {pitState.driver.number}
        </span>
        <span style={{ flex: 1, color: themeNormalText, fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pitState.driver.name}
        </span>
        <span style={{ color: pitState.isRunning ? themeAccent : '#fff', fontWeight: '900', fontSize: '22px', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(timeMs)}
        </span>
      </div>
    );
  }

  // FORMATO CRONÓMETRO: el tiempo como protagonista, piloto debajo
  if (pitStopFormat === 'stopwatch') {
    return (
      <div style={{
        ...wrapperStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '260px', textAlign: 'center', padding: '18px 15px',
        backgroundColor: customBg ? 'transparent' : themeBg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        borderRadius: bRad, boxShadow: customBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)',
        border: customBg ? 'none' : `3px solid ${pitState.isRunning ? themeAccent : themeMain}`, transition: 'border-color 0.3s'
      }}>
        <span style={{ color: themeTitleText, fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>PIT STOP</span>
        <span style={{ color: pitState.isRunning ? themeAccent : '#fff', fontWeight: '900', fontSize: '48px', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, margin: '4px 0' }}>
          {formatTime(timeMs)}
        </span>
        <span style={{ color: themeNormalText, fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase' }}>
          #{pitState.driver.number} {pitState.driver.name}
        </span>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo texto flotando
  if (pitStopFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: themeTitleText, fontWeight: '900', fontSize: '13px', letterSpacing: '2px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            PIT STOP — #{pitState.driver.number} {pitState.driver.name}
          </span>
          <span style={{ color: pitState.isRunning ? themeAccent : themeNormalText, fontWeight: '900', fontSize: '38px', fontVariantNumeric: 'tabular-nums', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            {formatTime(timeMs)}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={{
      ...wrapperStyle,
      display: 'flex', flexDirection: 'column', width: '380px',
      backgroundColor: skin ? skin.background : (customBg ? 'transparent' : themeBg),
      backgroundImage: customBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'), backgroundSize: '100% 100%',
      border: skin ? skin.border : 'none',
      borderRadius: bRad, boxShadow: skin ? skin.boxShadow : (customBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)'),
      backdropFilter: skin?.backdropFilter, overflow: 'hidden',
      borderLeft: skin ? skin.border : (customBg ? 'none' : `5px solid ${themeMain}`)
    }}>
      {/* HEADER UNIFICADO AL TEMA */}
      <div style={{ backgroundColor: skin ? 'transparent' : (customBg ? 'transparent' : themeMain), padding: '6px', textAlign: 'center' }}>
        <span style={{ color: themeTitleText, fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>
          PIT STOP
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: customBg ? '15px' : '10px 15px' }}>
        {/* PILOTO INFO */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', overflow: 'hidden' }}>
          <span style={{ backgroundColor: themeSecondary, color: '#fff', padding: '4px 10px', borderRadius: '4px', fontWeight: '900', fontSize: '20px', marginRight: '12px' }}>
            {pitState.driver.number}
          </span>
          <span style={{ color: themeNormalText, fontWeight: 'bold', fontSize: '22px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pitState.driver.name}
          </span>
        </div>

        {/* RELOJ DIGITAL */}
        <div style={{
            backgroundColor: themeHeaderBg, padding: '5px 15px', borderRadius: '6px',
            border: `2px solid ${pitState.isRunning ? themeAccent : '#555'}`,
            minWidth: '90px', textAlign: 'right', transition: 'border-color 0.3s'
        }}>
          <span style={{ color: pitState.isRunning ? themeAccent : '#fff', fontWeight: '900', fontSize: '28px', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(timeMs)}
          </span>
        </div>
      </div>
    </div>
  );
}