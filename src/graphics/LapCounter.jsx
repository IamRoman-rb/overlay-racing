// src/graphics/LapCounter.jsx
export default function LapCounter({ isVisible, config, sessionInfo, id = 'lapCounter' }) {
  const pos = config?.positions?.[id] || { x: 1700, y: 40, scale: 1 };
  
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeNumberText = config?.themeNumberText || '#ffffff';

  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] !== undefined ? config[`borderRadius_${id}`] : '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';

  // Animación que viene desde arriba por estar en la parte superior
  let transformHidden = `scale(${pos.scale}) translateY(-30px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top right',
      zIndex: 40, pointerEvents: 'none',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
      opacity: isVisible ? 1 : 0, 
      transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden,
      
      display: 'flex', flexDirection: 'column', minWidth: '160px', 
      backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      borderRadius: bRad,
      boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)', 
      overflow: 'hidden', borderTop: hasCustomBg ? 'none' : `5px solid ${themeMain}`,
    }}>
      <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ color: themeNumberText, fontSize: '38px', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          {sessionInfo?.laps || '0'}
        </span>
      </div>
    </div>
  );
}