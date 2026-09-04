// src/graphics/PitStopTimer.jsx
import { useState, useEffect, useRef } from 'react';

export default function PitStopTimer({ isVisible, config, pitState, id = 'pitStop' }) {
  const pos = config?.positions?.[id] || { x: 50, y: 750, scale: 1 };
  
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

  const [timeMs, setTimeMs] = useState(0);
  const reqRef = useRef();

  // MOTOR DEL RELOJ (A 60 FPS)
  useEffect(() => {
    const updateTimer = () => {
      if (pitState?.isRunning && pitState?.startTime) {
        setTimeMs(Date.now() - pitState.startTime);
        reqRef.current = requestAnimationFrame(updateTimer);
      } else if (!pitState?.isRunning && pitState?.stoppedTime) {
        setTimeMs(pitState.stoppedTime);
      } else if (!pitState?.isRunning && !pitState?.stoppedTime) {
        setTimeMs(0);
      }
    };

    if (isVisible) {
      reqRef.current = requestAnimationFrame(updateTimer);
    } else {
      cancelAnimationFrame(reqRef.current);
      setTimeout(() => setTimeMs(0), 500); // Resetea el tiempo en la sombra
    }

    return () => cancelAnimationFrame(reqRef.current);
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

  if (!pitState?.driver) return null;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
      zIndex: 48, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
      opacity: isVisible ? 1 : 0, transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
      display: 'flex', flexDirection: 'column', width: '380px', 
      backgroundColor: customBg ? 'transparent' : themeBg, 
      backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
      borderRadius: bRad, boxShadow: customBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)', overflow: 'hidden',
      borderLeft: customBg ? 'none' : `5px solid ${themeMain}`
    }}>
      {/* HEADER UNIFICADO AL TEMA */}
      <div style={{ backgroundColor: customBg ? 'transparent' : themeMain, padding: '6px', textAlign: 'center' }}>
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