import { useState, useEffect, useRef } from 'react';
import { getSkinStyle } from '../utils/skinStyles';
import pilotoAnonimo from '../assets/piloto_anonimo.png';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';

const PODIUM_COLORS = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };

// Convierte "1:22.167" o "22.167" a segundos, para encontrar la vuelta más rápida de la tanda visible
function parseLapSeconds(str) {
  if (!str || str === '-') return null;
  const parts = str.split(':');
  const val = parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseFloat(parts[1]) : parseFloat(str);
  return isNaN(val) || val <= 0 ? null : val;
}

// navSignal: { dir: 1 | -1, n } -> el operador pasó de página a mano (botones ANT / SIG del panel). n cuenta los pedidos.
export default function FinalResults({ drivers, config, isVisible, id = 'finalResults', navSignal = null }) {
  const pos = config?.positions?.[id] || { x: 240, y: 40, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0,0,0,0.95)';
  const themeHeaderBg = config?.themeHeaderBg || '#1a1a1a';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#bdc3c7';

  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id, 0.5);

  const resultsFormat = config?.finalResultsFormat || 'standard';
  const isCompact = resultsFormat === 'compact';
  const isPodium = resultsFormat === 'podium';
  const isMinimal = resultsFormat === 'minimal';
  const skin = getSkinStyle(resultsFormat, { themeMain, themeAccent });
  const transparent = hasCustomBg || isMinimal;

  const isBroadcast = resultsFormat === 'broadcast';
  const [page, setPage] = useState(0);
  const itemsPerPage = isCompact ? 14 : 10;

  // FORMATO BROADCAST: foto del ganador servida por el mini-servidor local (misma fuente que WinnerGraphic)
  const winnerDriver = drivers.find(d => String(d.pos) === '1') || drivers[0];
  const [winnerPhoto, setWinnerPhoto] = useState(pilotoAnonimo);
  useEffect(() => {
    if (!isBroadcast || !winnerDriver || !config?.photosPath) { setWinnerPhoto(pilotoAnonimo); return; }
    const host = window.location.hostname || 'localhost';
    const photoUrl = `http://${host}:8080/photo/${winnerDriver.number}`;
    const img = new Image();
    img.onload = () => setWinnerPhoto(photoUrl);
    img.onerror = () => setWinnerPhoto(pilotoAnonimo);
    img.src = photoUrl;
  }, [isBroadcast, config?.photosPath, winnerDriver?.number]);

  // CORRECCIÓN 1: Incluimos pos.scale para que la animación no dé un salto de tamaño
  let transformHidden = `scale(${pos.scale}) translateY(-60px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  // Al usar ANT / SIG el pase de páginas pasa a manual: la rotación automática se detiene hasta que se oculte la gráfica
  const [manualPaging, setManualPaging] = useState(false);

  useEffect(() => {
    if (!isVisible || drivers.length <= itemsPerPage) {
      setPage(0);
      setManualPaging(false);
      return;
    }
    if (manualPaging) return;
    const totalPages = Math.ceil(drivers.length / itemsPerPage);
    const interval = setInterval(() => {
      setPage(prev => (prev + 1) % totalPages);
    }, 8000);
    return () => clearInterval(interval);
  }, [isVisible, drivers.length, itemsPerPage, manualPaging]);

  const totalPages = Math.ceil(drivers.length / itemsPerPage);

  // Pedido manual de página (llega una vez por cada clic: se distingue por el contador n)
  const lastNavRef = useRef(navSignal?.n || 0);
  useEffect(() => {
    if (!navSignal || navSignal.n === lastNavRef.current) return;
    lastNavRef.current = navSignal.n;
    if (!isVisible || totalPages <= 1) return;
    setManualPaging(true);
    setPage(prev => (prev + navSignal.dir + totalPages) % totalPages);
  }, [navSignal, isVisible, totalPages]);

  const currentDrivers = drivers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  // FORMATO BROADCAST: estilo transmisión TV (F1/MotoGP) — tabla a la izquierda, foto del ganador a la derecha
  if (isBroadcast) {
    let fastestDriver = null;
    let fastestSeconds = Infinity;
    drivers.forEach(d => {
      const s = parseLapSeconds(d.bestLap);
      if (s !== null && s < fastestSeconds) { fastestSeconds = s; fastestDriver = d; }
    });

    const broadcastDrivers = drivers.slice(page * 10, (page + 1) * 10);
    const broadcastPages = Math.ceil(drivers.length / 10);

    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transformOrigin: 'top left', zIndex: 35,
        transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
        opacity: isVisible || animStyle === 'roll' ? 1 : 0,
        transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible),
        pointerEvents: isVisible ? 'auto' : 'none'
      }}>
        <style>{`@keyframes fadePageBroadcast { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
        <div style={{
          width: '1500px', display: 'flex', flexDirection: 'column',
          backgroundColor: themeHeaderBg, borderRadius: bRad, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}>
          {/* BARRA SUPERIOR: LOGO + TÍTULO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 26px', backgroundColor: themeMain }}>
            {config?.logo && <img src={config.logo} alt="Logo" style={{ height: '34px', maxWidth: '160px', objectFit: 'contain' }} />}
            <span style={{ color: '#fff', fontWeight: 900, fontSize: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {config.campeonato || 'RESULTADOS FINALES'}
            </span>
          </div>

          <div style={{ display: 'flex' }}>
            {/* COLUMNA IZQUIERDA: TABLA DE RESULTADOS */}
            <div style={{ flex: '0 0 940px', padding: '24px 26px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '30px', fontWeight: 900, color: themeNormalText, letterSpacing: '1px', maxWidth: '700px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{config.eventName || 'CARRERA'}</span>
                {broadcastPages > 1 && (
                  <span style={{ fontSize: '12px', color: themeTitleText, fontWeight: 'bold' }}>PÁGINA {page + 1} DE {broadcastPages}</span>
                )}
              </div>

              <div style={{
                display: 'flex', padding: '6px 12px', borderBottom: `2px solid ${themeMain}`,
                color: themeTitleText, fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px', marginBottom: '2px'
              }}>
                <span style={{ width: '50px' }}>POS</span>
                <span style={{ flex: 1 }}>PILOTO</span>
                <span style={{ width: '260px' }}>EQUIPO</span>
                <span style={{ width: '160px', textAlign: 'right' }}>TIEMPO</span>
              </div>

              <div key={page} style={{ animation: 'fadePageBroadcast 0.4s ease-out' }}>
                {broadcastDrivers.map((d, i) => {
                  const isLeader = String(d.pos) === '1';
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', padding: '8px 12px',
                      backgroundColor: isLeader ? 'rgba(255,255,255,0.92)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <span style={{ width: '50px', fontWeight: 900, fontSize: '17px', color: isLeader ? '#111' : themeNormalText }}>{d.pos}</span>
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 900, padding: '2px 6px', borderRadius: '3px',
                          backgroundColor: isLeader ? themeMain : themeSecondary, color: '#fff', flexShrink: 0
                        }}>{d.number}</span>
                        <span style={{
                          fontWeight: 900, fontSize: '16px', textTransform: 'uppercase',
                          color: isLeader ? '#111' : themeNormalText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{d.name}</span>
                      </span>
                      <span style={{
                        width: '260px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase',
                        color: isLeader ? '#333' : themeNumberText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{d.make || '—'}</span>
                      <span style={{
                        width: '160px', textAlign: 'right', fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace',
                        color: isLeader ? '#111' : themeNumberText
                      }}>{isLeader ? d.totalTime : (d.diff || d.gap || d.totalTime)}</span>
                    </div>
                  );
                })}
              </div>

              {fastestDriver && (
                <div style={{ marginTop: 'auto', paddingTop: '18px', fontSize: '15px', fontWeight: 'bold' }}>
                  <span style={{ color: '#9b59ff' }}>VUELTA RÁPIDA:</span>{' '}
                  <span style={{ color: themeNormalText, textTransform: 'uppercase' }}>{fastestDriver.name}</span>{' '}
                  <span style={{ color: themeNumberText, fontFamily: 'monospace' }}>{fastestDriver.bestLap}</span>
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA: FOTO DEL GANADOR */}
            <div style={{ flex: '1 1 auto', position: 'relative', backgroundColor: themeBg, overflow: 'hidden', minHeight: '520px' }}>
              <div style={{
                position: 'absolute', top: '10px', right: '20px', fontSize: '22px', fontWeight: 900,
                color: themeNormalText, letterSpacing: '2px'
              }}>GANADOR</div>

              <div style={{
                position: 'absolute', right: '-10px', bottom: '-40px', fontSize: '340px', fontWeight: 900,
                color: themeAccent, opacity: 0.15, lineHeight: 1, userSelect: 'none'
              }}>1</div>

              {winnerDriver && (
                <img
                  src={winnerPhoto}
                  alt={winnerDriver.name}
                  style={{
                    position: 'absolute', bottom: 0, right: '30px', height: '92%', objectFit: 'contain',
                    filter: 'drop-shadow(0px 15px 25px rgba(0,0,0,0.7))'
                  }}
                />
              )}

              {winnerDriver && (
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 26px',
                  background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0) 100%)'
                }}>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: themeAccent, textTransform: 'uppercase', lineHeight: 1.1 }}>
                    {winnerDriver.name}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: themeNormalText, textTransform: 'uppercase', opacity: 0.85 }}>
                    {winnerDriver.make || (config.eventName || config.campeonato || 'CARRERA')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
     <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transformOrigin: 'top left', zIndex: 35, 
        
        // CORRECCIÓN 2: Le decimos que anime "all" y le aplicamos el transformHidden
        transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`, 
        opacity: isVisible || animStyle === 'roll' ? 1 : 0, 
        transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible),
        
        pointerEvents: isVisible ? 'auto' : 'none'
     }}>
         <style>{`
           @keyframes fadePage { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
         `}</style>

         <div style={{
             backgroundColor: skin ? skin.background : (transparent ? 'transparent' : themeBg),
             backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
             backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
             padding: isMinimal ? '10px' : '40px', display: 'flex', flexDirection: 'column',
             alignItems: 'center', boxShadow: skin ? skin.boxShadow : (transparent ? 'none' : '0 15px 50px rgba(0,0,0,0.8)'),
             border: skin ? skin.border : (transparent ? 'none' : `2px solid ${themeMain}`),
             backdropFilter: skin?.backdropFilter,
             borderRadius: bRad
         }}>

             {/* ENCABEZADO CON LOGO Y TÍTULO */}
             <div style={{
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '25px',
               marginBottom: isCompact ? '15px' : '30px', borderBottom: transparent ? 'none' : `4px solid ${themeMain}`, paddingBottom: '15px', width: '100%'
             }}>
                 {config?.logo && (
                   <img src={config.logo} alt="Logo Productora" style={{ height: isCompact ? '38px' : '55px', maxWidth: '180px', objectFit: 'contain' }} />
                 )}
                 <h1 style={{ color: themeTitleText, fontSize: isCompact ? '28px' : '40px', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
                     RESULTADOS FINALES - {config.eventName || config.campeonato || 'CARRERA'}
                 </h1>
             </div>

             {/* CONTENEDOR DE LA TABLA */}
             <div style={{
               width: '1050px', backgroundColor: (skin || transparent) ? 'transparent' : themeHeaderBg,
               borderRadius: bRad,
               padding: '10px 20px 20px 20px', border: (skin || transparent) ? 'none' : '1px solid rgba(255,255,255,0.1)', position: 'relative'
             }}>

                {/* ENCABEZADO DE LA TABLA */}
                <div style={{
                  display: 'flex', padding: '10px 10px', borderBottom: transparent ? 'none' : `2px solid ${themeMain}`,
                  color: themeTitleText, fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px', marginBottom: '5px'
                }}>
                   <span style={{ width: '60px' }}>POS</span>
                   <span style={{ width: '80px' }}>NUM</span>
                   <span style={{ flex: 1 }}>PILOTO</span>
                   {!isCompact && <span style={{ width: '120px', textAlign: 'center' }}>VUELTAS</span>}
                   <span style={{ width: '180px', textAlign: 'right' }}>T. TOTAL</span>
                   {!isCompact && <span style={{ width: '160px', textAlign: 'right' }}>MEJOR V.</span>}
                </div>

                {/* FILAS DE PILOTOS */}
                <div key={page} style={{ animation: 'fadePage 0.5s ease-out' }}>
                  {currentDrivers.map((d, i) => {
                    const podiumColor = isPodium ? PODIUM_COLORS[Number(d.pos)] : null;
                    return (
                     <div key={i} style={{
                       display: 'flex', alignItems: 'center', padding: isCompact ? '7px 10px' : '12px 10px',
                       borderBottom: (i === currentDrivers.length - 1 || transparent) ? 'none' : '1px solid rgba(255,255,255,0.05)',
                       borderLeft: podiumColor ? `4px solid ${podiumColor}` : 'none',
                       fontSize: isCompact ? '16px' : '20px'
                     }}>
                        <span style={{ width: '60px', color: podiumColor || themeAccent, fontWeight: '900', fontSize: isCompact ? '18px' : '24px' }}>{d.pos}</span>
                        <span style={{ width: '80px' }}>
                          <span style={{ backgroundColor: podiumColor || themeSecondary, color: '#000', padding: '4px 10px', borderRadius: '4px', fontWeight: '900', fontSize: isCompact ? '14px' : '18px' }}>{d.number}</span>
                        </span>
                        <span style={{ flex: 1, fontWeight: '900', color: themeNormalText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name.toUpperCase()}</span>
                        {!isCompact && <span style={{ width: '120px', textAlign: 'center', color: themeNumberText, fontWeight: 'bold' }}>{d.laps}</span>}
                        <span style={{ width: '180px', textAlign: 'right', color: themeNumberText, fontWeight: 'bold' }}>{d.totalTime}</span>
                        {!isCompact && <span style={{ width: '160px', textAlign: 'right', color: themeAccent, fontWeight: '900' }}>{d.bestLap}</span>}
                     </div>
                    );
                  })}
                </div>

                {/* INDICADOR DE PÁGINA */}
                {totalPages > 1 && (
                  <div style={{ 
                    position: 'absolute', bottom: '-15px', right: '15px', 
                    fontSize: '11px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' 
                  }}>
                    PÁGINA {page + 1} DE {totalPages}
                  </div>
                )}
             </div>
         </div>
     </div>
  );
}