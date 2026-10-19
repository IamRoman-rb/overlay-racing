import { useMemo } from 'react';
import { getSkinStyle } from '../utils/skinStyles';

export default function FastestLap({ drivers, config, isVisible, id = 'fastestLap' }) {
  const pos = config?.positions?.[id] || { x: 440, y: 150, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0,0,0,0.9)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  // MAGIA DE DISEÑO PERSONALIZADO
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const fastestLapFormat = config?.fastestLapFormat || 'standard';
  const skin = getSkinStyle(fastestLapFormat, { themeMain, themeAccent });

  // Animación de entrada
  let transformHidden = 'translateY(-20px)';
  if (animStyle === 'fade') transformHidden = 'scale(1)';
  if (animStyle === 'zoom') transformHidden = 'scale(0.9)';
  if (animStyle === 'bounce') transformHidden = 'scale(0.3)';
  if (animStyle === 'flip') transformHidden = 'scaleY(0.05)';
  if (animStyle === 'rotate') transformHidden = 'scale(0.85) rotate(-15deg)';

  const fastestDriver = useMemo(() => {
    if (!drivers || drivers.length === 0) return null;
    let best = null;
    let minTime = Infinity;

    const parseTime = (str) => {
      if (!str || str === '-') return Infinity;
      const parts = str.split(':');
      let val = parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseFloat(parts[1]) : parseFloat(str);
      
      // EL FIX: Si el tiempo es 00:00.000 o menor/igual a cero, lo ignoramos por completo
      if (isNaN(val) || val <= 0) return Infinity; 
      
      return val;
    };

    drivers.forEach(d => {
      const t = parseTime(d.bestLap);
      if (t < minTime) { minTime = t; best = d; }
    });

    return best;
  }, [drivers]);

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transform: `scale(${pos.scale})`, transformOrigin: 'top left',
    zIndex: 40, pointerEvents: 'none',
    transition: 'opacity 0.4s ease-in-out',
    opacity: isVisible ? 1 : 0
  };

  // FORMATO COMPACTO: una sola fila, sin barra de encabezado
  if (fastestLapFormat === 'compact') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '380px', padding: '10px 15px',
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderLeft: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
          boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)',
          borderRadius: bRad, overflow: 'hidden',
          transform: isVisible ? 'translateY(0) scale(1)' : transformHidden,
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <span style={{ color: themeTitleText, fontWeight: '900', fontSize: '11px', fontStyle: 'italic', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
            RÉCORD
          </span>
          <div style={{ backgroundColor: themeSecondary, color: '#000', fontWeight: '900', fontSize: '14px', width: '32px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', flexShrink: 0 }}>
            {fastestDriver?.number || '-'}
          </div>
          <div style={{ flex: 1, color: themeNormalText, fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fastestDriver?.name || '---'}
          </div>
          <div style={{ color: themeAccent, fontWeight: '900', fontSize: '18px', whiteSpace: 'nowrap' }}>
            {fastestDriver?.bestLap || '-:--.---'}
          </div>
        </div>
      </div>
    );
  }

  // FORMATO SPOTLIGHT: el tiempo como protagonista, estilo "vuelta rápida" de broadcast
  if (fastestLapFormat === 'spotlight') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', width: '380px', textAlign: 'center',
          backgroundColor: hasCustomBg ? 'transparent' : themeMain,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)',
          borderRadius: bRad, overflow: 'hidden', padding: '16px 15px',
          transform: isVisible ? 'translateY(0) scale(1)' : transformHidden,
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <span style={{ color: '#fff', fontWeight: '900', fontSize: '13px', fontStyle: 'italic', letterSpacing: '2px', opacity: 0.9 }}>
            RECORD DE VUELTA
          </span>
          <span style={{ color: '#fff', fontWeight: '900', fontSize: '46px', lineHeight: 1.1, margin: '4px 0' }}>
            {fastestDriver?.bestLap || '-:--.---'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase' }}>
            #{fastestDriver?.number || '-'} {fastestDriver?.name || '---'}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo texto flotando sobre el video
  if (fastestLapFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '2px',
          transform: isVisible ? 'translateY(0) scale(1)' : transformHidden,
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <span style={{ color: themeTitleText, fontWeight: '900', fontSize: '13px', fontStyle: 'italic', letterSpacing: '1px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            RECORD DE VUELTA
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ color: themeNormalText, fontWeight: '900', fontSize: '24px', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
              #{fastestDriver?.number || '-'} {fastestDriver?.name || '---'}
            </span>
            <span style={{ color: themeAccent, fontWeight: '900', fontSize: '26px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
              {fastestDriver?.bestLap || '-:--.---'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={wrapperStyle}>
       <div style={{
         display: 'flex', flexDirection: 'column', width: '450px',
         backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
         backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
         backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
         border: skin ? skin.border : 'none',
         boxShadow: skin ? skin.boxShadow : (hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)'),
         backdropFilter: skin?.backdropFilter,
         borderRadius: bRad,
         overflow: 'hidden',
         transform: isVisible ? 'translateY(0) scale(1)' : transformHidden,
         transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
         padding: hasCustomBg ? '10px' : '0'
       }}>
         {/* ENCABEZADO */}
         <div style={{
           backgroundColor: skin ? 'transparent' : (hasCustomBg ? 'transparent' : themeHeaderBg),
           borderBottom: skin ? `1px solid ${skin.border !== 'none' ? themeAccent : 'rgba(255,255,255,0.2)'}` : (hasCustomBg ? 'none' : `3px solid ${themeMain}`),
           display: 'flex', alignItems: 'center', padding: '8px 15px'
         }}>
            <span style={{ color: themeTitleText, fontWeight: '900', fontSize: '16px', fontStyle: 'italic', letterSpacing: '1px' }}>
              RECORD DE VUELTA
            </span>
         </div>

         {/* DATOS DEL PILOTO */}
         <div style={{ backgroundColor: 'transparent', display: 'flex', alignItems: 'center', padding: '15px' }}>
            <div style={{ backgroundColor: themeSecondary, color: '#000', fontWeight: '900', fontSize: '20px', width: '45px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginRight: '15px' }}>
              {fastestDriver?.number || '-'}
            </div>

            <div style={{ flex: 1, color: themeNormalText, fontWeight: 'bold', fontSize: '24px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fastestDriver?.name || '---'}
            </div>

            <div style={{ color: themeAccent, fontWeight: '900', fontSize: '26px', marginLeft: '15px' }}>
              {fastestDriver?.bestLap || '-:--.---'}
            </div>
         </div>
       </div>
    </div>
  );
}