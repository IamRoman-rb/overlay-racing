import { useState, useEffect } from 'react';
import pilotoAnonimo from '../assets/piloto_anonimo.png';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (e) {}
}

export default function StartingGrid({ drivers, config, isVisible, id = 'grid' }) {
  const [page, setPage] = useState(0);

  // Colores y diseño
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#00e5ff'; // Cian por defecto para las fotos
  const themeTitleText = config?.themeTitleText || '#ffffff';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#ffffff';

  const customBg = config[`design_${id}`];
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';

  // TIPO DE GRILLA: 'standard' o 'photos'
  const gridFormat = config?.gridFormat || 'standard';
  const itemsPerPage = gridFormat === 'photos' ? 2 : 2; // Ambos usan 2 por página ahora, pero listos para separar lógicas

  let transformHidden = `scale(${config?.positions?.[id]?.scale || 1}) translateY(40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${config?.positions?.[id]?.scale || 1})`;
  if (animStyle === 'zoom') transformHidden = `scale(${(config?.positions?.[id]?.scale || 1) * 0.9})`;

  useEffect(() => {
    if (!isVisible || drivers.length === 0) { setPage(0); return; }
  }, [isVisible, drivers]);

  useEffect(() => {
    const totalPages = Math.ceil(drivers.length / itemsPerPage);
    if (totalPages === 0) return;

    const handleNext = () => setPage((prev) => (prev + 1) % totalPages);
    const handlePrev = () => setPage((prev) => (prev - 1 + totalPages) % totalPages);

    if (ipcRenderer) {
      // --- MODO ELECTRON: IPC directo, sin depender de la red ---
      const ipcNext = () => handleNext();
      const ipcPrev = () => handlePrev();
      ipcRenderer.on('grid-next', ipcNext);
      ipcRenderer.on('grid-prev', ipcPrev);
      return () => {
        ipcRenderer.removeListener('grid-next', ipcNext);
        ipcRenderer.removeListener('grid-prev', ipcPrev);
      };
    } else {
      // --- MODO NAVEGADOR: fallback por Socket.io (para preview fuera de Electron) ---
      let socket;
      import('socket.io-client').then(({ io }) => {
        const host = window.location.hostname || 'localhost';
        socket = io(`http://${host}:8080`);
        socket.on('grid-next', handleNext);
        socket.on('grid-prev', handlePrev);
      });
      return () => { if (socket) socket.disconnect(); };
    }
  }, [drivers, itemsPerPage]);

  const pos = config?.positions?.[id] || { x: 0, y: 0, scale: 1 };
  const currentDrivers = drivers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left',
      width: gridFormat === 'photos' ? '1920px' : '1280px',
      height: gridFormat === 'photos' ? '1080px' : '720px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'transparent',
      zIndex: 30,
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden,
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      <style>{`
        @keyframes zoomInForward { 0% { transform: scale(0.8) translateZ(-500px); opacity: 0; } 70% { transform: scale(1.02) translateZ(0); opacity: 1; } 100% { transform: scale(1) translateZ(0); opacity: 1; } }
        .grid-page { width: 100%; display: flex; justify-content: center; gap: 60px; animation: zoomInForward 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* RENDERIZADO CONDICIONAL: ESTÁNDAR VS FOTOS */}
      {gridFormat === 'standard' ? (
        <>
          <div style={{
            position: 'absolute', top: '50px', left: '10%',
            backgroundColor: themeHeaderBg, color: themeTitleText, padding: '15px 40px',
            fontSize: '32px', fontWeight: '900', textTransform: 'uppercase',
            borderBottom: `6px solid ${themeMain}`, boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', gap: '20px', borderRadius: bRad
          }}>
            {(config?.logo || config?.categoryLogo) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '10px' }}>
                {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '45px', maxWidth: '100px', objectFit: 'contain' }} />}
                {config?.logo && config?.categoryLogo && <div style={{ height: '35px', width: '3px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />}
                {config?.categoryLogo && <img src={config.categoryLogo} alt="Categoría" style={{ height: '45px', maxWidth: '100px', objectFit: 'contain' }} />}
              </div>
            )}
            <span>Ordenamiento de partida - {config?.campeonato || 'CARRERA'}</span>
          </div>

          <div key={`std-${page}`} className="grid-page" style={{ marginTop: '150px' }}>
            {currentDrivers.map((driver) => (
              <DriverCardStandard
                key={driver.pos} driver={driver} config={config} customBg={customBg} bRad={bRad}
                themeBg={themeBg} themeHeaderBg={themeHeaderBg} themeSecondary={themeSecondary}
                themeAccent={themeAccent} themeNormalText={themeNormalText} themeNumberText={themeNumberText}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* MODO FOTOS: HEADER BROADCAST (TIPO FÓRMULA 1) */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: themeHeaderBg, padding: '15px', textAlign: 'center', color: '#fff', fontSize: '28px', fontWeight: '900', letterSpacing: '2px' }}>
               {config?.campeonato || 'CAMPEONATO'}
            </div>
            <div style={{ display: 'flex', width: '100%', height: '40px' }}>
               <div style={{ backgroundColor: themeMain, color: '#fff', width: '30%', display: 'flex', alignItems: 'center', paddingLeft: '40px', fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>
                  GRILLA DE PARTIDA
               </div>
               <div style={{ backgroundColor: '#800000', flex: 1, borderBottom: `4px solid ${themeMain}` }}></div>
               <div style={{ backgroundColor: themeHeaderBg, color: '#fff', width: '30%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '40px', fontSize: '24px', fontWeight: '900', borderBottom: `4px solid ${themeMain}` }}>
                  FILA {page + 1}
               </div>
            </div>
          </div>

          {/* MODO FOTOS: PILOTOS */}
          <div key={`photo-${page}`} className="grid-page" style={{ height: '100%', width: '100%', alignItems: 'flex-end', paddingBottom: '150px', position: 'relative' }}>
            {currentDrivers[0] && <PhotoDriverCard driver={currentDrivers[0]} align="left" config={config} themeMain={themeMain} themeAccent={themeAccent} themeHeaderBg={themeHeaderBg} />}
            {currentDrivers[1] && <PhotoDriverCard driver={currentDrivers[1]} align="right" config={config} themeMain={themeMain} themeAccent={themeAccent} themeHeaderBg={themeHeaderBg} />}

            {/* INDICADOR DE FILA CENTRAL */}
            <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: themeMain, color: '#fff', padding: '10px 50px', fontSize: '30px', fontWeight: '900', fontStyle: 'italic', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
               FILA {page + 1}
            </div>
          </div>

          {/* MODO FOTOS: INFO CIRCUITO (Bottom Left) */}
          <div style={{ position: 'absolute', bottom: '60px', left: '60px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>📍</span>
              <span style={{ fontSize: '24px', fontWeight: '400', fontStyle: 'italic', textTransform: 'uppercase', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{config?.circuito || 'CIRCUITO'}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------
// TARJETA MODO ESTÁNDAR (La que ya tenías)
// ----------------------------------------------------------------------------------
function DriverCardStandard({ driver, config, customBg, bRad, themeBg, themeHeaderBg, themeSecondary, themeAccent, themeNormalText, themeNumberText }) {
  const [imgSrc, setImgSrc] = useState(pilotoAnonimo);
  const hasCustomBg = !!customBg;

  useEffect(() => {
    if (!config?.photosPath) { setImgSrc(pilotoAnonimo); return; }
    const host = window.location.hostname || 'localhost';
    const photoUrl = `http://${host}:8080/photo/${driver.number}`;
    const img = new Image();
    img.onload = () => setImgSrc(photoUrl);
    img.onerror = () => setImgSrc(pilotoAnonimo);
    img.src = photoUrl;
  }, [config?.photosPath, driver.number]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      backgroundColor: hasCustomBg ? 'transparent' : themeBg,
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      borderLeft: hasCustomBg ? 'none' : `8px solid ${themeSecondary}`,
      borderRadius: bRad, width: '450px', height: '110px',
      boxShadow: hasCustomBg ? 'none' : '10px 15px 30px rgba(0,0,0,0.8)',
      position: 'relative', overflow: 'visible'
    }}>
      <div style={{ position: 'absolute', right: '20px', bottom: '100%', marginBottom: '-20px', height: '210px', zIndex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <img src={imgSrc} alt={driver.name} style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(-5px 5px 15px rgba(0,0,0,0.6))' }} />
      </div>
      <div style={{ width: '90px', backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: '900', color: themeNumberText, borderTopLeftRadius: bRad, borderBottomLeftRadius: bRad, zIndex: 2 }}>
        {driver.pos}
      </div>
      <div style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 3, overflow: 'hidden' }}>
        <span style={{ fontSize: '18px', color: themeAccent, fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          #{driver.number} {driver.make ? `| ${driver.make}` : ''}
        </span>
        <span style={{ fontSize: '26px', fontWeight: '900', textTransform: 'uppercase', color: themeNormalText, whiteSpace: 'nowrap', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', textOverflow: 'ellipsis' }}>
          {driver.name}
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// NUEVA TARJETA MODO FOTOS (Cuerpo entero tipo Broadcast)
// ----------------------------------------------------------------------------------
function PhotoDriverCard({ driver, align, config, themeMain, themeAccent, themeHeaderBg }) {
  const [imgSrc, setImgSrc] = useState(pilotoAnonimo);
  const isLeft = align === 'left';

  useEffect(() => {
    if (!config?.photosPath) { setImgSrc(pilotoAnonimo); return; }
    const host = window.location.hostname || 'localhost';
    const photoUrl = `http://${host}:8080/photo/${driver.number}`;
    const img = new Image();
    img.onload = () => setImgSrc(photoUrl);
    img.onerror = () => setImgSrc(pilotoAnonimo);
    img.src = photoUrl;
  }, [config?.photosPath, driver.number]);

  return (
    <div style={{
        position: 'absolute',
        bottom: '220px', // Altura desde el piso
        left: isLeft ? '18%' : 'auto',
        right: !isLeft ? '18%' : 'auto',
        width: '550px',
        height: '650px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end'
    }}>
       {/* TEXTO P3 / P4 FLOTANTE */}
       <div style={{
           position: 'absolute', top: '150px',
           left: isLeft ? '-80px' : 'auto', right: !isLeft ? '-80px' : 'auto',
           fontSize: '80px', fontWeight: '900', color: '#e0e0e0',
           textShadow: '5px 5px 15px rgba(0,0,0,0.8)', zIndex: 1
       }}>
          P{driver.pos}
       </div>

       {/* FOTO DEL PILOTO GIGANTE (o genérica si no se encuentra) */}
       <img src={imgSrc} style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(0px 15px 25px rgba(0,0,0,0.9))', zIndex: 2 }} />

       {/* CAJA DE NOMBRE (TIPO REFERENCIA) */}
       <div style={{
           position: 'absolute', bottom: '-70px', width: '110%',
           backgroundColor: themeHeaderBg || '#050505',
           borderTop: `5px solid ${themeAccent || '#00e5ff'}`,
           padding: '18px 0', textAlign: 'center',
           boxShadow: '0 15px 30px rgba(0,0,0,0.9)', zIndex: 3
       }}>
           <span style={{ color: '#fff', fontSize: '38px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
               {driver.name}
           </span>
       </div>
    </div>
  )
}