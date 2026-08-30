export default function VotingResults({ isVisible, drivers, votes, config, id = 'votingResults' }) {
  const pos = config?.positions?.[id] || { x: 1550, y: 50, scale: 1 };
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';

  // MAGIA DE DISEÑO PERSONALIZADO
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;

  // Ordenamos a los pilotos según sus votos y sacamos el Top 5
  const topDrivers = [...drivers]
    .filter(d => votes[d.number] > 0)
    .sort((a, b) => (votes[b.number] || 0) - (votes[a.number] || 0))
    .slice(0, 5);

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      zIndex: 40, transition: 'opacity 0.4s ease-in-out', opacity: isVisible ? 1 : 0, pointerEvents: 'none',
      width: '320px', 
      
      backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      
      borderRadius: '8px', 
      boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)', 
      overflow: 'hidden', 
      borderLeft: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
      padding: hasCustomBg ? '10px' : '0' // Padding extra por si el PNG tiene bordes decorativos
    }}>
      <div style={{ 
        backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, 
        padding: '15px', textAlign: 'center', 
        borderBottom: hasCustomBg ? 'none' : `2px solid ${themeMain}` 
      }}>
        <span style={{ color: themeAccent, fontSize: '15px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
          RESULTADOS DE VOTACIÓN
        </span>
      </div>
      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {totalVotes === 0 ? (
          <span style={{ color: '#888', fontSize: '12px', textAlign: 'center' }}>Esperando votos...</span>
        ) : (
          topDrivers.map((driver, idx) => {
            const percentage = Math.round((votes[driver.number] / totalVotes) * 100);
            return (
              <div key={driver.number} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
                  <span className="text-truncate" style={{ maxWidth: '200px' }}>#{driver.number} {driver.name}</span>
                  <span style={{ color: themeAccent }}>{percentage}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: themeMain, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            );
          })
        )}
      </div>
      <div style={{ 
        padding: '10px', textAlign: 'center', 
        borderTop: hasCustomBg ? 'none' : `1px solid ${themeHeaderBg}`, 
        fontSize: '10px', color: '#888' 
      }}>
        Total votos: {totalVotes}
      </div>
    </div>
  );
}