import { getSkinStyle } from '../utils/skinStyles';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import { useMemo } from 'react';
import { getCanvasSize } from '../utils/canvasSize';
import { buildTrack, pointOnTrack, nearestOnTrack, DEFAULT_ASPECT } from '../utils/trackPath';
import { useImageAspect } from '../utils/raceVisuals';

export default function TrackAlert({ alert, config, id = 'trackAlert' }) {
  const pos = config?.positions?.[id] || { x: 1500, y: 500, scale: 1 };
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const bRad = config?.[`borderRadius_${id}`] || '8px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const alertFormat = config?.trackAlertFormat || 'standard';

  let transformHidden = `scale(${pos.scale}) translateX(40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const isVisible = !!alert?.isVisible;
  const isIncident = alert?.type === 'incident';
  const curve = (config?.trackCurves || []).find(c => c.id === alert?.curveId);

  // Mapa de la alerta: la pista dibujada con los puntos del trazado (pestaña CIRCUITO) y la curva marcada sobre ella.
  // Sin trazado se usa la imagen del circuito como antes.
  const trackPath = config?.trackPath;
  const trackImage = config?.trackImage || null;
  const imageAspect = useImageAspect(trackImage);
  const aspect = trackImage ? imageAspect : DEFAULT_ASPECT;
  const track = useMemo(() => (aspect ? buildTrack(trackPath, { width: 340, fit: true, minHeight: 110, maxHeight: 170, pad: 16, aspect }) : null), [trackPath, aspect]);
  const curveT = curve && Number.isFinite(curve.t) ? curve.t : null;
  const curveX = curve ? curve.x : null;
  const curveY = curve ? curve.y : null;
  const marker = useMemo(() => {
    if (!track || curveX === null) return null;
    let tt = curveT;
    if (tt === null) {
      const near = nearestOnTrack(trackPath, aspect, { x: curveX, y: curveY });
      tt = near ? near.t : null;
    }
    return tt === null ? null : pointOnTrack(track, tt);
  }, [track, trackPath, aspect, curveT, curveX, curveY]);

  const accentColor = isIncident ? '#e74c3c' : '#f1c40f';
  const alertTitle = isIncident ? 'INCIDENTE EN PISTA' : 'BANDERA AMARILLA';
  const curveLabel = alert?.curveName || curve?.name || 'CURVA';
  const skin = getSkinStyle(alertFormat, { themeMain: '#000000', themeAccent: accentColor });

  const sharedStyles = `
    @keyframes trackAlertPulse { 0%, 100% { box-shadow: 0 0 0 0 ${accentColor}66; } 50% { box-shadow: 0 0 0 12px ${accentColor}00; } }
    @keyframes trackAlertBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  `;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left', zIndex: 60, pointerEvents: 'none',
    transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
    opacity: isVisible || animStyle === 'roll' ? 1 : 0,
    transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateX(0)` : transformHidden, ...getRollClip(animStyle, isVisible)
  };

  // FORMATO COMPACTO: una sola fila, sin mapa de circuito
  if (alertFormat === 'compact') {
    return (
      <div style={wrapperStyle}>
        <style>{sharedStyles}</style>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '340px', padding: '10px 15px',
          backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: bRad, borderLeft: `5px solid ${accentColor}`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.7)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, animation: 'trackAlertBlink 1s infinite' }}>
            <span style={{ color: accentColor, fontWeight: '900', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>{alertTitle}</span>
            <span style={{ color: '#fff', fontSize: '17px', fontWeight: '900', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{curveLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO BANNER: barra completa de ancho de pantalla
  if (alertFormat === 'banner') {
    return (
      <div style={{ ...wrapperStyle, width: `${getCanvasSize(config).width}px` }}>
        <style>{sharedStyles}</style>
        <div style={{
          backgroundColor: accentColor, padding: '12px 0', textAlign: 'center', width: '100%',
          boxShadow: '0 6px 20px rgba(0,0,0,0.6)'
        }}>
          <span style={{ color: '#000', fontWeight: '900', fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase', animation: 'trackAlertBlink 1s infinite' }}>
            {alertTitle} — {curveLabel}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo texto flotando
  if (alertFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <style>{sharedStyles}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', animation: 'trackAlertBlink 1s infinite' }}>
            <span style={{ color: accentColor, fontWeight: '900', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>{alertTitle}</span>
            <span style={{ color: '#fff', fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>{curveLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original, con mapa de circuito)
  return (
    <div style={wrapperStyle}>
      <style>{sharedStyles}</style>

      <div style={{
        width: '340px', backgroundColor: skin ? skin.background : 'rgba(0,0,0,0.9)', borderRadius: bRad,
        backgroundImage: skin?.backgroundImage,
        border: skin ? skin.border : `3px solid ${accentColor}`, overflow: 'hidden',
        boxShadow: skin ? skin.boxShadow : '0 10px 30px rgba(0,0,0,0.7)',
        backdropFilter: skin?.backdropFilter
      }}>
        <div style={{
          backgroundColor: skin ? 'transparent' : accentColor,
          borderBottom: skin ? `2px solid ${accentColor}` : 'none',
          padding: '8px 15px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ color: skin ? accentColor : '#000', fontWeight: '900', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', animation: 'trackAlertBlink 1s infinite' }}>
            {alertTitle}
          </span>
        </div>

        <div style={{ padding: '12px 15px' }}>
          <span style={{ color: '#fff', fontSize: '20px', fontWeight: '900', textTransform: 'uppercase' }}>
            {curveLabel}
          </span>
        </div>

        {track && marker && (
          <svg width="340" height={track.height} viewBox={`0 0 340 ${track.height}`} style={{ display: 'block', backgroundColor: themeHeaderBg }}>
            <path d={track.d} fill="none" stroke="#9a9a9a" strokeWidth="13" strokeLinejoin="round" strokeLinecap="round" />
            <path d={track.d} fill="none" stroke="#3b3b3b" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={marker.x} cy={marker.y} r="16" fill={accentColor} opacity="0.35">
              <animate attributeName="r" values="10;20;10" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={marker.x} cy={marker.y} r="9" fill={accentColor} stroke="#000" strokeWidth="2" />
          </svg>
        )}
        {!(track && marker) && config?.trackImage && curve && (
          <div style={{
            position: 'relative', width: '100%', height: '140px',
            backgroundImage: `url(${config.trackImage})`, backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
            backgroundColor: themeHeaderBg
          }}>
            <div style={{
              position: 'absolute', left: `${curve.x}%`, top: `${curve.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: accentColor, border: '2px solid #000',
              animation: 'trackAlertPulse 1.2s infinite'
            }} />
          </div>
        )}
      </div>
    </div>
  );
}