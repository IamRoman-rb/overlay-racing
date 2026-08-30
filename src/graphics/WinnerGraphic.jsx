export default function WinnerGraphic({ driver, isVisible, config, id = 'winner' }) {
  if (!driver) return null;

  const pos = config?.positions?.[id] || { x: 440, y: 550, scale: 1 };

  const themeBg = config?.themeBg || '#1a1a1a';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  
  // MAGIA DE DISEÑO PERSONALIZADO
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      
      backgroundColor: hasCustomBg ? 'transparent' : themeBg,
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      
      padding: '20px 40px', 
      borderRadius: '10px',
      border: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
      display: 'flex', alignItems: 'center', gap: '30px',
      boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.5)', 
      zIndex: 40, transition: 'opacity 0.5s ease-in-out',
      opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none'
    }}>    
       <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: themeAccent, opacity: 0.8 }}>
            GANADOR - {config.campeonato || 'CARRERA'}
          </span>
          <span style={{ fontSize: '36px', fontWeight: '900', color: themeAccent, textTransform: 'uppercase' }}>
            {driver.name}
          </span>
       </div>
       
       <div style={{ 
         fontSize: '48px', fontWeight: '900', color: themeAccent, 
         borderLeft: hasCustomBg ? '3px solid rgba(255,255,255,0.2)' : `3px solid ${themeAccent}`, 
         paddingLeft: '20px', opacity: 0.9 
       }}>
         #{driver.number}
       </div>
    </div>
  );
}