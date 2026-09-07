export default function TrackAlert({ alert, config, id = 'trackAlert' }) {
  const pos = config?.positions?.[id] || { x: 1500, y: 500, scale: 1 };
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const bRad = config?.[`borderRadius_${id}`] || '8px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';

  let transformHidden = `scale(${pos.scale}) translateX(40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  const isVisible = !!alert?.isVisible;
  const isIncident = alert?.type === 'incident';
  const curve = (config?.trackCurves || []).find(c => c.id === alert?.curveId);

  const accentColor = isIncident ? '#e74c3c' : '#f1c40f';

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left', zIndex: 60, pointerEvents: 'none',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden
    }}>
      <style>{`
        @keyframes trackAlertPulse { 0%, 100% { box-shadow: 0 0 0 0 ${accentColor}66; } 50% { box-shadow: 0 0 0 12px ${accentColor}00; } }
        @keyframes trackAlertBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <div style={{
        width: '340px', backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: bRad,
        border: `3px solid ${accentColor}`, overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.7)'
      }}>
        <div style={{
          backgroundColor: accentColor, padding: '8px 15px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontSize: '18px', animation: 'trackAlertBlink 1s infinite' }}>
            {isIncident ? '🚨' : '⚠️'}
          </span>
          <span style={{ color: '#000', fontWeight: '900', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {isIncident ? 'INCIDENTE EN PISTA' : 'BANDERA AMARILLA'}
          </span>
        </div>

        <div style={{ padding: '12px 15px' }}>
          <span style={{ color: '#fff', fontSize: '20px', fontWeight: '900', textTransform: 'uppercase' }}>
            {alert?.curveName || curve?.name || 'CURVA'}
          </span>
        </div>

        {config?.trackImage && curve && (
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