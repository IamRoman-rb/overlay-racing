import { getSkinStyle } from '../utils/skinStyles';

export default function VotingResults({ isVisible, drivers, votes, config, id = 'votingResults' }) {
  const pos = config?.positions?.[id] || { x: 1550, y: 50, scale: 1 };
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'
  const resultsFormat = config?.votingResultsFormat || 'standard';
  const isCompact = resultsFormat === 'compact';
  const isPodium = resultsFormat === 'podium';
  const isMinimal = resultsFormat === 'minimal';
  const skin = getSkinStyle(resultsFormat, { themeMain, themeAccent });
  const transparent = hasCustomBg || isMinimal;

  // Animación de entrada (Slide desde la derecha)
  let transformHidden = `scale(${pos.scale}) translateX(40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const PODIUM_COLORS = { 0: '#ffd700', 1: '#c0c0c0', 2: '#cd7f32' };

  // Ordenamos a los pilotos según sus votos y sacamos el Top 5
  const topDrivers = [...drivers]
    .filter(d => votes[d.number] > 0)
    .sort((a, b) => (votes[b.number] || 0) - (votes[a.number] || 0))
    .slice(0, 5);

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
      zIndex: 40, pointerEvents: 'none',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
      width: '320px',

      backgroundColor: skin ? skin.background : (transparent ? 'transparent' : themeBg),
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',

      borderRadius: bRad, // <-- APLICADO BORDE DINÁMICO
      border: skin ? skin.border : 'none',
      boxShadow: skin ? skin.boxShadow : (transparent ? 'none' : '0 10px 30px rgba(0,0,0,0.8)'),
      backdropFilter: skin?.backdropFilter,
      overflow: 'hidden',
      borderLeft: skin ? skin.border : (transparent ? 'none' : `4px solid ${themeMain}`),
      padding: hasCustomBg ? '10px' : (isMinimal ? '5px' : '0')
    }}>
      {!isMinimal && (
        <div style={{
          backgroundColor: skin ? 'transparent' : (hasCustomBg ? 'transparent' : themeHeaderBg),
          padding: isCompact ? '8px' : '15px', textAlign: 'center',
          borderBottom: hasCustomBg ? 'none' : `2px solid ${themeMain}`
        }}>
          <span style={{ color: themeAccent, fontSize: isCompact ? '12px' : '15px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
            RESULTADOS DE VOTACIÓN
          </span>
        </div>
      )}
      <div style={{ padding: isCompact ? '10px' : '15px', display: 'flex', flexDirection: 'column', gap: isCompact ? '8px' : '15px' }}>
        {totalVotes === 0 ? (
          <span style={{ color: '#888', fontSize: '12px', textAlign: 'center' }}>Esperando votos...</span>
        ) : (
          topDrivers.map((driver, idx) => {
            const percentage = Math.round((votes[driver.number] / totalVotes) * 100);
            const podiumColor = isPodium ? PODIUM_COLORS[idx] : null;
            return (
              <div key={driver.number} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: isCompact ? '11px' : '13px', fontWeight: 'bold' }}>
                  <span className="text-truncate" style={{ maxWidth: '200px', color: podiumColor || '#fff' }}>#{driver.number} {driver.name}</span>
                  <span style={{ color: podiumColor || themeAccent }}>{percentage}%</span>
                </div>
                <div style={{ width: '100%', height: isCompact ? '5px' : '8px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: podiumColor || themeMain, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            );
          })
        )}
      </div>
      {!isCompact && !isMinimal && (
        <div style={{
          padding: '10px', textAlign: 'center',
          borderTop: hasCustomBg ? 'none' : `1px solid ${themeHeaderBg}`,
          fontSize: '10px', color: '#888'
        }}>
          Total votos: {totalVotes}
        </div>
      )}
    </div>
  );
}