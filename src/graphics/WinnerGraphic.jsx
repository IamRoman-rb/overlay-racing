import { useState, useEffect } from 'react';
import pilotoAnonimo from '../assets/piloto_anonimo.png';
import { getSkinStyle } from '../utils/skinStyles';

export default function WinnerGraphic({ driver, isVisible, config, id = 'winner', sessionInfo }) {
  const pos = config?.positions?.[id] || { x: 440, y: 550, scale: 1 };

  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'
  const winnerFormat = config?.winnerFormat || 'standard';
  // Mismo nombre de evento que muestra la torre; si no hay sesión en vivo, cae al campeonato
  const eventName = sessionInfo?.name || config?.campeonato || 'CARRERA';
  const skin = getSkinStyle(winnerFormat, { themeMain, themeAccent });

  // Animación de entrada (Slide desde abajo, como la gráfica principal)
  let transformHidden = `scale(${pos.scale}) translateY(40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
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

  if (!driver) return null;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
    zIndex: 40, pointerEvents: 'none',
    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden
  };

  // FORMATO FOTO: retrato grande del ganador con nombre y número debajo
  if (winnerFormat === 'photo') {
    return (
      <div style={{ ...wrapperStyle, width: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: '100%', height: '360px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden',
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <img src={imgSrc} style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.8))' }} />
        </div>
        <div style={{
          marginTop: '-4px', width: '100%', textAlign: 'center', padding: '10px 15px',
          backgroundColor: hasCustomBg ? 'rgba(0,0,0,0.75)' : themeHeaderBg,
          borderBottom: hasCustomBg ? 'none' : `4px solid ${themeAccent}`,
          borderRadius: `0 0 ${bRad} ${bRad}`
        }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: themeAccent, letterSpacing: '2px' }}>
            GANADOR — {eventName}
          </span><br />
          <span style={{ fontSize: '26px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase' }}>
            #{driver.number} {driver.name}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO PODIO: tarjeta vertical centrada, estilo "campeón"
  if (winnerFormat === 'podium') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', width: '340px', textAlign: 'center', padding: '25px 20px',
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: hasCustomBg ? 'none' : `4px solid ${themeAccent}`,
          borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: themeAccent, letterSpacing: '2px' }}>
            GANADOR
          </span>
          <span style={{ fontSize: '30px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', marginTop: '4px' }}>
            {driver.name}
          </span>
          <div style={{ width: '60px', height: '3px', backgroundColor: themeAccent, margin: '10px 0' }} />
          <span style={{ fontSize: '22px', fontWeight: '900', color: themeAccent }}>
            #{driver.number}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo texto celebratorio flotando
  if (winnerFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: themeAccent, letterSpacing: '2px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            GANADOR — {eventName}
          </span>
          <span style={{ fontSize: '38px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            #{driver.number} {driver.name}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR: el separador entre nombre y número ocupa todo el alto de la gráfica
  return (
    <div style={{
      ...wrapperStyle,
      backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
      backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      borderRadius: bRad,
      border: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
      display: 'flex', alignItems: 'stretch', overflow: 'hidden',
      boxShadow: skin ? skin.boxShadow : (hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.5)'),
      backdropFilter: skin?.backdropFilter,
    }}>
       <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 30px 20px 40px', minWidth: 0 }}>
          <span style={{ fontSize: '24px', fontWeight: '800', color: themeAccent, opacity: 0.9, maxWidth: '780px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
            GANADOR - {eventName}
          </span>
          <span style={{ fontSize: '36px', fontWeight: '900', color: themeAccent, textTransform: 'uppercase' }}>
            {driver.name}
          </span>
       </div>

       <div style={{
         display: 'flex', alignItems: 'center', alignSelf: 'stretch',
         fontSize: '48px', fontWeight: '900', color: themeAccent,
         borderLeft: hasCustomBg ? '3px solid rgba(255,255,255,0.2)' : `3px solid ${themeAccent}`,
         padding: '0 40px 0 30px', opacity: 0.9
       }}>
         #{driver.number}
       </div>
    </div>
  );
}
