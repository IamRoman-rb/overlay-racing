export default function StartingLights({ isVisible, step = 0, config }) {
  if (!isVisible) return null;

  const pos = (config?.positions && config.positions.startingLights) || { x: 700, y: 400, scale: 1 };
  const lightsCount = 5;
  const isGo = step >= 6;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      animation: 'slideInLights 0.4s ease-out'
    }}>
      <style>{`
        @keyframes slideInLights { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes goFlash { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      <div style={{
        display: 'flex', gap: '14px', backgroundColor: '#111',
        padding: '20px 30px', borderRadius: '12px', border: '4px solid #000',
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

      {isGo && (
        <div style={{
          textAlign: 'center', marginTop: '15px', fontSize: '38px', fontWeight: 900,
          color: '#2ecc71', textShadow: '0 0 20px rgba(46, 204, 113, 0.9)',
          letterSpacing: '4px', animation: 'goFlash 0.6s ease-in-out 2'
        }}>
          ¡LARGADA!
        </div>
      )}
    </div>
  );
}