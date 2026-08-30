export default function VotingQR({ isVisible, config, localIp, id = 'votingQR' }) {
  const pos = config?.positions?.[id] || { x: 20, y: 700, scale: 1 };
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';

  // MAGIA DE DISEÑO PERSONALIZADO
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=http://${localIp}:8080&margin=10`;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      zIndex: 40, transition: 'opacity 0.4s ease-in-out', opacity: isVisible ? 1 : 0, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', width: '250px', 
      backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      borderRadius: '8px', boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)', 
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