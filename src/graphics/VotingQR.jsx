export default function VotingQR({ isVisible, config, localIp, id = 'votingQR' }) {
  const pos = config?.positions?.[id] || { x: 20, y: 700, scale: 1 };
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'

  // Animación de entrada (Slide desde abajo)
  let transformHidden = `scale(${pos.scale}) translateY(30px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=http://${localIp}:8080&margin=10`;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
      zIndex: 40, pointerEvents: 'none',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
      opacity: isVisible ? 1 : 0, 
      transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden,
      
      display: 'flex', flexDirection: 'column', width: '250px', 
      backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      borderRadius: bRad, // <-- APLICADO BORDE DINÁMICO
      boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)', 
      overflow: 'hidden', borderLeft: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
      padding: hasCustomBg ? '10px' : '0'
    }}>
      <div style={{ backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, padding: '10px', textAlign: 'center', borderBottom: hasCustomBg ? 'none' : `2px solid ${themeMain}` }}>
        <span style={{ color: themeAccent, fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
          PILOTO DEL DÍA
        </span>
      </div>
      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ padding: '5px', backgroundColor: '#fff', borderRadius: '4px' }}>
          <img src={qrUrl} alt="QR Code" style={{ width: '140px', height: '140px', display: 'block' }} />
        </div>
        <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.4' }}>
          ESCANEÁ PARA VOTAR<br/>AL GANADOR
        </span>
      </div>
    </div>
  );
}