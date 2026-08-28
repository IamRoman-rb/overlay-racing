export default function VotingQR({ isVisible, config, localIp, id = 'votingQR' }) {
  const pos = config?.positions?.[id] || { x: 20, y: 700, scale: 1 };
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';

  // Usamos una API gratuita para generar el QR al vuelo usando tu IP local
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=http://${localIp}:8080&margin=10`;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      zIndex: 40, transition: 'opacity 0.4s ease-in-out', opacity: isVisible ? 1 : 0, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', width: '220px', backgroundColor: themeBg, borderRadius: '8px', 
      boxShadow: '0 10px 30px rgba(0,0,0,0.8)', overflow: 'hidden', borderLeft: `4px solid ${themeMain}`
    }}>
      <div style={{ backgroundColor: themeHeaderBg, padding: '10px', textAlign: 'center', borderBottom: `2px solid ${themeMain}` }}>
        <span style={{ color: themeAccent, fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
          PILOTO DEL DÍA
        </span>
      </div>
      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ padding: '5px', backgroundColor: '#fff', borderRadius: '4px' }}>
          <img src={qrUrl} alt="QR Code" style={{ width: '130px', height: '130px' }} />
        </div>
        <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.4' }}>
          ESCANEÁ PARA VOTAR AL GANADOR
        </span>
      </div>
    </div>
  );
}