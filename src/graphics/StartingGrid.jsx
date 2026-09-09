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

  // TIPO DE GRILLA: 'standard', 'photos' o 'cinematic'
  const gridFormat = config?.gridFormat || 'standard';
  // 'cinematic' avanza piloto por piloto (1 a la vez); el resto sigue de a 2 por página.
  const itemsPerPage = gridFormat === 'cinematic' ? 1 : 2;

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
      width: (gridFormat === 'photos' || gridFormat === 'cinematic') ? '1920px' : '1280px',
      height: (gridFormat === 'photos' || gridFormat === 'cinematic') ? '1080px' : '720px',
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
        @keyframes cinematicFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* RENDERIZADO CONDICIONAL: ESTÁNDAR VS FOTOS VS CINEMATIC */}
      {gridFormat === 'standard' && (
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
      )}

      {gridFormat === 'photos' && (
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

      {gridFormat === 'cinematic' && (
        <CinematicGridView
          allDrivers={drivers}
          currentDriver={currentDrivers[0]}
          page={page}
          config={config}
          bRad={bRad}
          themeMain={themeMain}
          themeHeaderBg={themeHeaderBg}
          themeAccent={themeAccent}
          themeTitleText={themeTitleText}
          themeNormalText={themeNormalText}
          themeNumberText={themeNumberText}
        />
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
// TARJETA MODO FOTOS (Cuerpo entero tipo Broadcast)
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

// ----------------------------------------------------------------------------------
// NUEVO MODO CINEMATIC: grilla completa a la izquierda (resaltada), foto centrada, info a la derecha
// ----------------------------------------------------------------------------------
function CinematicGridView({ allDrivers, currentDriver, page, config, bRad, themeMain, themeHeaderBg, themeAccent, themeTitleText, themeNormalText, themeNumberText }) {
  const [imgSrc, setImgSrc] = useState(pilotoAnonimo);

  useEffect(() => {
    if (!currentDriver) return;
    if (!config?.photosPath) { setImgSrc(pilotoAnonimo); return; }
    const host = window.location.hostname || 'localhost';
    const photoUrl = `http://${host}:8080/photo/${currentDriver.number}`;
    const img = new Image();
    img.onload = () => setImgSrc(photoUrl);
    img.onerror = () => setImgSrc(pilotoAnonimo);
    img.src = photoUrl;
  }, [config?.photosPath, currentDriver?.number]);

  if (!currentDriver) return null;

  // Grilla de partida clásica: impares a la izquierda, pares a la derecha (dos columnas dentro del panel)
  const colA = [];
  const colB = [];
  (allDrivers || []).forEach((d, idx) => {
    if (idx % 2 === 0) colA.push(d); else colB.push(d);
  });

  // --- ESCALADO AUTOMÁTICO DE FILAS ---
  // Con pocos pilotos las filas se ven a tamaño normal; con muchos (ej. 50 autos)
  // se van achicando para que la grilla ENTRE COMPLETA sin cortarse arriba ni abajo.
  const PANEL_HEIGHT = 1080;
  const HEADER_RESERVED = 110; // espacio fijo arriba para el título/logo, nunca se pisa
  const BOTTOM_MARGIN = 30;
  const AVAILABLE_HEIGHT = PANEL_HEIGHT - HEADER_RESERVED - BOTTOM_MARGIN;
  const IDEAL_ROW_HEIGHT = 46; // tamaño "cómodo" original, tope máximo

  const rowsPerColumn = Math.max(1, Math.max(colA.length, colB.length));
  const rowSlot = Math.min(IDEAL_ROW_HEIGHT, Math.floor(AVAILABLE_HEIGHT / rowsPerColumn));
  const rowGap = Math.max(2, Math.round(rowSlot * 0.15));
  const rowBoxHeight = Math.max(14, rowSlot - rowGap);
  const posFontSize = Math.max(9, Math.round(rowBoxHeight * 0.5));
  const nameFontSize = Math.max(8, Math.round(rowBoxHeight * 0.42));
  const rowPaddingH = Math.max(4, Math.round(rowBoxHeight * 0.32));
  const rowRadius = rowBoxHeight < 24 ? '3px' : bRad;

  const renderRow = (driver) => {
    const isActive = driver?.pos === currentDriver?.pos;
    return (
      <div
        key={driver.pos}
        style={{
          display: 'flex', alignItems: 'center', gap: `${Math.max(4, Math.round(rowBoxHeight * 0.2))}px`,
          height: `${rowBoxHeight}px`, boxSizing: 'border-box',
          backgroundColor: isActive ? themeAccent : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isActive ? themeAccent : 'rgba(255,255,255,0.12)'}`,
          borderRadius: rowRadius, padding: `0 ${rowPaddingH}px`, marginBottom: `${rowGap}px`,
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
          boxShadow: isActive ? `0 0 18px ${themeAccent}88` : 'none'
        }}
      >
        <span style={{
          fontSize: `${posFontSize}px`, fontWeight: '900', color: isActive ? '#000000' : themeNumberText,
          width: `${Math.max(16, Math.round(posFontSize * 1.4))}px`, textAlign: 'center', flexShrink: 0
        }}>
          {driver.pos}
        </span>
        <span style={{
          fontSize: `${nameFontSize}px`, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
          color: isActive ? '#000000' : themeNormalText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {(driver.name || '').slice(0, 3)}
        </span>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden' }}>

      {/* PANEL IZQUIERDO: GRILLA COMPLETA */}
      <div style={{
        width: '600px', height: '100%', flexShrink: 0,
        backgroundColor: themeHeaderBg || '#0a0a0a',
        borderRight: `4px solid ${themeMain}`,
        display: 'flex', flexDirection: 'column',
        padding: `${HEADER_RESERVED}px 40px ${BOTTOM_MARGIN}px 110px`,
        position: 'relative', boxSizing: 'border-box', overflow: 'hidden'
      }}>
        {/* TÍTULO ROTADO "GRILLA" */}
        <div style={{
          position: 'absolute', left: '20px', top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'left center',
          fontSize: '52px', fontWeight: '900', color: 'rgba(255,255,255,0.15)',
          letterSpacing: '4px', whiteSpace: 'nowrap'
        }}>
          GRILLA
        </div>

        {/* ENCABEZADO / CAMPEONATO (altura reservada aparte, nunca se pisa con las filas) */}
        <div style={{ position: 'absolute', top: '30px', left: '110px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '32px', maxWidth: '90px', objectFit: 'contain' }} />}
          <span style={{ fontSize: '16px', fontWeight: '900', color: themeTitleText, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {config?.campeonato || 'CARRERA'}
          </span>
        </div>

        {/* DOS COLUMNAS: altura tope fija = AVAILABLE_HEIGHT, así nunca se sale del panel */}
        <div style={{ display: 'flex', gap: '20px', height: `${AVAILABLE_HEIGHT}px`, overflow: 'hidden' }}>
          <div style={{ flex: 1 }}>{colA.map(renderRow)}</div>
          <div style={{ flex: 1 }}>{colB.map(renderRow)}</div>
        </div>
      </div>

      {/* CENTRO: FOTO DEL PILOTO ACTIVO */}
      <div key={`cinematic-photo-${page}`} style={{
        flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        position: 'relative', animation: 'cinematicFade 0.5s ease forwards'
      }}>
        <img
          src={imgSrc}
          style={{ height: '95%', objectFit: 'contain', filter: 'drop-shadow(0px 15px 30px rgba(0,0,0,0.85))' }}
        />
      </div>

      {/* DERECHA: INFO DEL PILOTO ACTIVO */}
      <div key={`cinematic-info-${page}`} style={{
        width: '520px', height: '100%', flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '40px 60px', boxSizing: 'border-box',
        animation: 'cinematicFade 0.5s ease forwards'
      }}>
        <span style={{ fontSize: '90px', fontWeight: '900', color: themeTitleText, lineHeight: 1 }}>
          {currentDriver?.pos}°
        </span>
        <div style={{ width: '100%', height: '4px', backgroundColor: themeAccent, margin: '15px 0' }} />
        <span style={{ fontSize: '28px', fontWeight: '400', color: themeNormalText, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {(currentDriver?.name || '').split(' ').slice(0, -1).join(' ')}
        </span>
        <span style={{ fontSize: '46px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
          {(currentDriver?.name || '').split(' ').slice(-1).join(' ')}
        </span>
        {currentDriver?.make && (
          <span style={{ fontSize: '20px', fontWeight: '700', color: themeNumberText, textTransform: 'uppercase' }}>
            #{currentDriver.number} — {currentDriver.make}
          </span>
        )}
        {(currentDriver?.bestLap || currentDriver?.points) && (
          <span style={{ fontSize: '70px', fontWeight: '900', color: themeAccent, marginTop: '20px' }}>
            {currentDriver?.points || currentDriver?.bestLap}
          </span>
        )}
      </div>
    </div>
  );
}
