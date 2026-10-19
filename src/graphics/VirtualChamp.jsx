import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { getSkinStyle } from '../utils/skinStyles';

const PODIUM_COLORS = { 0: '#ffd700', 1: '#c0c0c0', 2: '#cd7f32' };

export default function VirtualChamp({ config, isVisible, id = 'virtualChamp' }) {
  const [standings, setStandings] = useState([]);
  const pos = config?.positions?.[id] || { x: 1400, y: 150, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  const customBg = config[`design_${id}`];
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const champFormat = config?.virtualChampFormat || 'standard';
  const isCompact = champFormat === 'compact';
  const isPodium = champFormat === 'podium';
  const isMinimal = champFormat === 'minimal';
  const skin = getSkinStyle(champFormat, { themeMain, themeAccent });
  const transparent = !!customBg || isMinimal;

  let transformHidden = `scale(${pos.scale}) translateX(40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  useEffect(() => {
    const host = window.location.hostname || 'localhost';
    const socket = io(`http://${host}:8080`);
    socket.on('update-championship', data => setStandings(data));
    return () => socket.disconnect();
  }, []);

  if (!standings || standings.length === 0) return null;

  // Mostrar solo el Top 10 para no saturar la pantalla (Top 15 en formato compacto)
  const topStandings = standings.slice(0, isCompact ? 15 : 10);

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
      zIndex: 40, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0, transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
      display: 'flex', flexDirection: 'column', width: isCompact ? '340px' : '400px',
      backgroundColor: skin ? skin.background : (transparent ? 'transparent' : themeBg),
      backgroundImage: customBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'), backgroundSize: '100% 100%',
      border: skin ? skin.border : 'none',
      borderRadius: bRad, boxShadow: skin ? skin.boxShadow : (transparent ? 'none' : '0 10px 30px rgba(0,0,0,0.8)'),
      backdropFilter: skin?.backdropFilter, overflow: 'hidden'
    }}>
      {!isMinimal && (
        <div style={{ backgroundColor: skin ? 'transparent' : (customBg ? 'transparent' : themeHeaderBg), padding: isCompact ? '8px' : '12px', textAlign: 'center', borderBottom: skin ? `1px solid ${themeAccent}44` : (customBg ? 'none' : `4px solid ${themeMain}`) }}>
          <span style={{ color: themeMain, fontSize: isCompact ? '14px' : '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
            CAMPEONATO EN VIVO
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', padding: customBg ? '15px' : '0' }}>
        {topStandings.map((d, i) => {
          const podiumColor = isPodium ? PODIUM_COLORS[i] : null;
          return (
          <div key={d.number} style={{
            display: 'flex', alignItems: 'center', padding: isCompact ? '5px 12px' : '8px 15px',
            borderBottom: (i < topStandings.length - 1 && !transparent) ? '1px solid rgba(255,255,255,0.1)' : 'none',
            borderLeft: podiumColor ? `4px solid ${podiumColor}` : 'none',
            backgroundColor: podiumColor ? `${podiumColor}22` : (i === 0 && !isPodium ? 'rgba(243, 156, 18, 0.15)' : 'transparent')
          }}>
            <span style={{ width: isCompact ? '20px' : '25px', color: podiumColor || (i === 0 ? '#f39c12' : '#bbb'), fontWeight: '900', fontSize: isCompact ? '14px' : '18px' }}>{d.livePos}</span>
            <span style={{ backgroundColor: podiumColor || themeSecondary, color: '#fff', padding: isCompact ? '1px 5px' : '2px 6px', borderRadius: '4px', fontWeight: '900', fontSize: isCompact ? '11px' : '14px', marginRight: isCompact ? '7px' : '10px' }}>{d.number}</span>
            <span style={{ flex: 1, color: themeNormalText, fontWeight: 'bold', fontSize: isCompact ? '14px' : '18px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#fff', fontWeight: '900', fontSize: isCompact ? '15px' : '20px' }}>{d.livePoints}</span>
              {!isCompact && (
                <span style={{ color: '#2ecc71', fontSize: '12px', fontWeight: 'bold', marginTop: '-4px' }}>
                  {d.added > 0 ? `+${d.added} pts` : ' '}
                </span>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}