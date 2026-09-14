export default function StartingLights({ isVisible, step = 0, config }) {
  if (!isVisible) return null;

  const id = 'startingLights';
  const pos = config?.positions?.[id] || { x: 700, y: 400, scale: 1 };
  const customBg = config?.[`design_${id}`];
  const bRad = config?.[`borderRadius_${id}`] || '12px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const lightsFormat = config?.startingLightsFormat || 'classic';

  const lightsCount = 5;
  const isGo = step >= 6;

  let animName = 'slideInLights';
  if (animStyle === 'fade') animName = 'fadeInLights';
  if (animStyle === 'zoom') animName = 'zoomInLights';

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      animation: `${animName} 0.4s ease-out`
    }}>
      <style>{`
        @keyframes slideInLights { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLights { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomInLights { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes goFlash { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      {customBg ? (
        // Si el usuario cargó un PNG/SVG propio en la pestaña DISEÑOS, se muestra ese diseño estático
        <div style={{ width: '420px', height: '160px' }}>
          <img src={customBg} alt="Semáforo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      ) : lightsFormat === 'towers' ? (
        // FORMATO TORRES: cada posición es una columna de 2 luces apiladas, estilo gantry F1
        <div style={{
          display: 'flex', gap: '14px', backgroundColor: '#111',
          padding: '18px 26px', borderRadius: bRad, border: '4px solid #000',
          boxShadow: '0 8px 25px rgba(0,0,0,0.6)'
        }}>
          {Array.from({ length: lightsCount }).map((_, i) => {
            const litIndex = i + 1;
            const isLit = !isGo && step >= litIndex;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[0, 1].map(j => (
                  <div key={j} style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    backgroundColor: isLit ? '#ff2200' : '#3a0a0a',
                    boxShadow: isLit ? '0 0 20px 6px rgba(255,34,0,0.85)' : 'inset 0 0 8px rgba(0,0,0,0.8)',
                    border: '3px solid #000',
                    transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
                  }} />
                ))}
              </div>
            );
          })}
        </div>
      ) : lightsFormat === 'countdown' ? (
        // FORMATO CUENTA REGRESIVA: un número gigante en vez de luces
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '160px', height: '160px', borderRadius: '50%', backgroundColor: '#111',
          border: `5px solid ${isGo ? '#2ecc71' : '#ff2200'}`,
          boxShadow: isGo ? '0 0 30px 10px rgba(46,204,113,0.6)' : '0 0 30px 10px rgba(255,34,0,0.5)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
        }}>
          <span style={{
            fontSize: isGo ? '48px' : '72px', fontWeight: 900,
            color: isGo ? '#2ecc71' : '#ff2200',
            textShadow: isGo ? '0 0 20px rgba(46,204,113,0.9)' : '0 0 20px rgba(255,34,0,0.9)'
          }}>
            {isGo ? 'GO' : Math.max(0, lightsCount - step)}
          </span>
        </div>
      ) : lightsFormat === 'minimal' ? (
        // FORMATO MINIMALISTA: luces chicas flotando sin caja
        <div style={{ display: 'flex', gap: '10px' }}>
          {Array.from({ length: lightsCount }).map((_, i) => {
            const litIndex = i + 1;
            const isLit = !isGo && step >= litIndex;
            return (
              <div key={i} style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: isLit ? '#ff2200' : 'rgba(58,10,10,0.6)',
                boxShadow: isLit ? '0 0 18px 6px rgba(255,34,0,0.85)' : 'none',
                border: '2px solid rgba(0,0,0,0.6)',
                transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
              }} />
            );
          })}
        </div>
      ) : (
        // FORMATO CLÁSICO: una sola fila de 5 luces
        <div style={{
          display: 'flex', gap: '14px', backgroundColor: '#111',
          padding: '20px 30px', borderRadius: bRad, border: '4px solid #000',
          boxShadow: '0 8px 25px rgba(0,0,0,0.6)'
        }}>
          {Array.from({ length: lightsCount }).map((_, i) => {
            const litIndex = i + 1;
            const isLit = !isGo && step >= litIndex;
            return (
              <div key={i} style={{
                width: '50px', height: '50px', borderRadius: '50%',
                backgroundColor: isLit ? '#ff2200' : '#3a0a0a',
                boxShadow: isLit ? '0 0 25px 8px rgba(255,34,0,0.85)' : 'inset 0 0 8px rgba(0,0,0,0.8)',
                border: '3px solid #000',
                transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
              }} />
            );
          })}
        </div>
      )}

      {isGo && lightsFormat !== 'countdown' && (
        <div style={{
          textAlign: 'center', marginTop: '15px', fontSize: '38px', fontWeight: 900,
          color: '#2ecc71', textShadow: '0 0 20px rgba(46, 204, 113, 0.9)',
          letterSpacing: '4px', animation: 'goFlash 0.6s ease-in-out 2'
        }}>
        </div>
      )}
    </div>
  );
}