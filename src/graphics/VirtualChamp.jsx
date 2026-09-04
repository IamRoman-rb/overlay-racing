import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export default function VirtualChamp({ config, isVisible, id = 'virtualChamp' }) {
  const [standings, setStandings] = useState([]);
  const pos = config?.positions?.[id] || { x: 1400, y: 150, scale: 1 };
  
  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  const customBg = config[`design_${id}`];
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';

  let transformHidden = `scale(${pos.scale}) translateX(40px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  useEffect(() => {
    const host = window.location.hostname || 'localhost';
    const socket = io(`http://${host}:8080`);
    socket.on('update-championship', data => setStandings(data));
    return () => socket.disconnect();
  }, []);

  if (!standings || standings.length === 0) return null;

  // Mostrar solo el Top 10 para no saturar la pantalla (puedes cambiarlo)
  const topStandings = standings.slice(0, 10); 

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
      zIndex: 40, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
      opacity: isVisible ? 1 : 0, transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
      display: 'flex', flexDirection: 'column', width: '400px', 
      backgroundColor: customBg ? 'transparent' : themeBg, 
      backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
      borderRadius: bRad, boxShadow: customBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)', overflow: 'hidden'
    }}>
      <div style={{ backgroundColor: customBg ? 'transparent' : themeHeaderBg, padding: '12px', textAlign: 'center', borderBottom: customBg ? 'none' : `4px solid ${themeMain}` }}>
        <span style={{ color: themeMain, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
          CAMPEONATO EN VIVO
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', padding: customBg ? '15px' : '0' }}>
        {topStandings.map((d, i) => (
          <div key={d.number} style={{
            display: 'flex', alignItems: 'center', padding: '8px 15px',
            borderBottom: (i < topStandings.length - 1 && !customBg) ? '1px solid rgba(255,255,255,0.1)' : 'none',
            backgroundColor: i === 0 ? 'rgba(243, 156, 18, 0.15)' : 'transparent' // Resalta al líder de oro
          }}>
            <span style={{ width: '25px', color: i === 0 ? '#f39c12' : '#bbb', fontWeight: '900', fontSize: '18px' }}>{d.livePos}</span>
            <span style={{ backgroundColor: themeSecondary, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '900', fontSize: '14px', marginRight: '10px' }}>{d.number}</span>
            <span style={{ flex: 1, color: themeNormalText, fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#fff', fontWeight: '900', fontSize: '20px' }}>{d.livePoints}</span>
              <span style={{ color: '#2ecc71', fontSize: '12px', fontWeight: 'bold', marginTop: '-4px' }}>
                {d.added > 0 ? `+${d.added} pts` : ' '}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}