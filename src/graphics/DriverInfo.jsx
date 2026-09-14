import { useState, useEffect } from 'react';
import pilotoAnonimo from '../assets/piloto_anonimo.png';
import { getSkinStyle } from '../utils/skinStyles';

export default function DriverInfo({ driver, config, isVisible, id = 'driverInfo' }) {
  const pos = config?.positions?.[id] || { x: 80, y: 480, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#bdc3c7';

  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;

  // LECTURA DE BORDES Y ANIMACIÓN
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const driverInfoFormat = config?.driverInfoFormat || 'standard';
  const skin = getSkinStyle(driverInfoFormat, { themeMain, themeAccent });

  // CÁLCULO DE LA ANIMACIÓN DE ENTRADA
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; // Slide
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; // Solo opacidad
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`; // Pequeño al inicio
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const [imgSrc, setImgSrc] = useState(pilotoAnonimo);

  useEffect(() => {
    if (!driver || !config?.photosPath) { setImgSrc(pilotoAnonimo); return; }
    const host = window.location.hostname || 'localhost';
    const photoUrl = `http://${host}:8080/photo/${driver.number}`;
    const img = new Image();
    img.onload = () => setImgSrc(photoUrl);
    img.onerror = () => setImgSrc(pilotoAnonimo);
    img.src = photoUrl;
  }, [config?.photosPath, driver?.number]);

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left', zIndex: 45, pointerEvents: 'none',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden
  };

  if (!driver) return <div style={wrapperStyle} />;

  // FORMATO FOTO: retrato del piloto a un lado + datos al otro
  if (driverInfoFormat === 'photo') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          display: 'flex', alignItems: 'stretch', width: '460px', height: '150px',
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)', overflow: 'hidden'
        }}>
          <div style={{ width: '120px', flexShrink: 0, backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={imgSrc} style={{ height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 18px', minWidth: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: themeAccent, letterSpacing: '1px' }}>
              P{driver.pos} — Nº{driver.number}
            </span>
            <span style={{ fontSize: '22px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
              {driver.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>MEJOR VUELTA</span>
              <span style={{ fontSize: '16px', color: themeNumberText, fontWeight: '900' }}>{driver.bestLap}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO COMPACTO: una sola fila angosta
  if (driverInfoFormat === 'compact') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '380px', padding: '8px 15px',
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderLeft: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)'
        }}>
          <div style={{ backgroundColor: hasCustomBg ? 'rgba(255,255,255,0.15)' : themeAccent, color: '#000', fontWeight: '900', fontSize: '16px', minWidth: '32px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', flexShrink: 0 }}>
            {driver.pos}
          </div>
          <span style={{ color: themeNumberText, fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>
            #{driver.number}
          </span>
          <span style={{ flex: 1, color: themeNormalText, fontWeight: '900', fontSize: '17px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {driver.name}
          </span>
          <span style={{ color: themeTitleText, fontWeight: '900', fontSize: '15px', whiteSpace: 'nowrap' }}>
            {driver.bestLap}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo texto flotando sobre el video
  if (driverInfoFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: themeAccent, letterSpacing: '1px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            P{driver.pos} — Nº{driver.number}
          </span>
          <span style={{ fontSize: '28px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            {driver.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>MEJOR VUELTA</span>
            <span style={{ fontSize: '18px', color: themeNumberText, fontWeight: '900', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>{driver.bestLap}</span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={wrapperStyle}>
      <div style={{
        display: 'flex', width: '480px',
        backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
        border: skin ? skin.border : 'none',
        borderTop: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
        backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        boxShadow: skin ? skin.boxShadow : (hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)'),
        backdropFilter: skin?.backdropFilter,
        borderRadius: bRad,
        overflow: 'hidden'
      }}>
        {/* POS: bloque propio, chico, separado del número */}
        <div style={{
          backgroundColor: skin ? 'transparent' : (hasCustomBg ? 'transparent' : themeMain),
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '15px 12px', minWidth: '55px',
          borderRight: skin ? `2px solid ${themeAccent}` : (hasCustomBg ? 'none' : `2px solid rgba(0,0,0,0.3)`)
        }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: skin ? themeAccent : '#fff', letterSpacing: '1px', opacity: 0.85 }}>POS</span>
          <span style={{ fontSize: '30px', fontWeight: '900', color: skin ? themeNormalText : '#fff', lineHeight: '1' }}>{driver.pos}</span>
        </div>

        {/* NÚMERO: bloque propio, con el color de acento del tema */}
        <div style={{
          backgroundColor: skin ? 'transparent' : (hasCustomBg ? 'transparent' : themeAccent),
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '15px 20px',
          borderRight: skin ? `2px solid ${themeAccent}` : (hasCustomBg ? 'none' : `3px solid ${themeMain}`)
        }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: skin ? themeAccent : '#000', letterSpacing: '1px', opacity: 0.75 }}>Nº</span>
          <span style={{ fontSize: '38px', fontWeight: '900', color: skin ? themeNormalText : '#000', lineHeight: '1' }}>{driver.number}</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '15px 25px' }}>
          <span style={{ fontSize: '24px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
            {driver.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>MEJOR VUELTA</span>
            <span style={{ fontSize: '18px', color: themeNumberText, fontWeight: '900' }}>{driver.bestLap}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
