import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');
const path = window.require('path');

export default function StartingGrid({ drivers, config, isVisible, id = 'grid' }) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 2; // VOLVEMOS A 2 PILOTOS POR PÁGINA

  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#ffffff';

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';

  // Animación de entrada (Aparece desde abajo)
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
    ipcRenderer.on('grid-next', handleNext);
    ipcRenderer.on('grid-prev', handlePrev);
    return () => {
      ipcRenderer.removeListener('grid-next', handleNext);
      ipcRenderer.removeListener('grid-prev', handlePrev);
    };
  }, [drivers]);

  const pos = config?.positions?.[id] || { x: 0, y: 0, scale: 1 };
  const currentDrivers = drivers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left',
      width: '1280px', height: '720px', // Volvemos al lienzo compacto original
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0, 
      transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden,
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      <style>{`
        @keyframes zoomInForward { 0% { transform: scale(0.3) translateZ(-500px); opacity: 0; } 70% { transform: scale(1.05) translateZ(0); opacity: 1; } 100% { transform: scale(1) translateZ(0); opacity: 1; } }
        /* VOLVEMOS AL FLEX-DIRECTION ROW Y JUSTIFY-CONTENT CENTER */
        .grid-page { width: 100%; display: flex; flex-direction: row; justify-content: center; gap: 60px; margin-top: 150px; animation: zoomInForward 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* CABECERA */}
      <div style={{
        position: 'absolute', top: '50px', left: '10%',
        backgroundColor: themeHeaderBg, color: themeTitleText, padding: '15px 40px',
        fontSize: '32px', fontWeight: '900', textTransform: 'uppercase',
        borderBottom: `6px solid ${themeMain}`, boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: '20px', 
        borderRadius: bRad 
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

      <div key={page} className="grid-page">
        {currentDrivers.map((driver) => (
          <DriverCard 
            key={driver.pos} driver={driver} config={config} customBg={customBg} bRad={bRad}
            themeBg={themeBg} themeHeaderBg={themeHeaderBg} themeSecondary={themeSecondary} 
            themeAccent={themeAccent} themeNormalText={themeNormalText} themeNumberText={themeNumberText}
          />
        ))}
      </div>
    </div>
  );
}

// TARJETA DE PILOTO
function DriverCard({ driver, config, customBg, bRad, themeBg, themeHeaderBg, themeSecondary, themeAccent, themeNormalText, themeNumberText }) {
  const [imgSrc, setImgSrc] = useState(null);
  const hasCustomBg = !!customBg;

  useEffect(() => {
    if (!config?.photosPath) { setImgSrc(null); return; }
    try {
      const extensions = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG'];
      let foundPath = null;
      let mime = 'image/png';
      for (const ext of extensions) {
        const checkPath = path.join(config.photosPath, `${driver.number}${ext}`);
        if (fs.existsSync(checkPath)) { foundPath = checkPath; mime = ext.toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'; break; }
      }
      if (foundPath) {
        const base64 = fs.readFileSync(foundPath, { encoding: 'base64' });
        setImgSrc(`data:${mime};base64,${base64}`);
      } else { setImgSrc(null); }
    } catch (e) { setImgSrc(null); }
  }, [config?.photosPath, driver.number]);

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', 
      backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      borderLeft: hasCustomBg ? 'none' : `8px solid ${themeSecondary}`, 
      borderRadius: bRad,
      width: '450px', height: '110px', // VOLVEMOS AL TAMAÑO ORIGINAL
      boxShadow: hasCustomBg ? 'none' : '10px 15px 30px rgba(0,0,0,0.8)', 
      position: 'relative', overflow: 'visible' 
    }}>
      
      {imgSrc && (
        <div style={{ position: 'absolute', right: '20px', bottom: '100%', marginBottom: '-20px', height: '210px', zIndex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <img src={imgSrc} alt={driver.name} style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(-5px 5px 15px rgba(0,0,0,0.6))' }} />
        </div>
      )}

      <div style={{ 
        width: '90px', backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, height: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '48px', fontWeight: '900', color: themeNumberText,
        borderTopLeftRadius: bRad, borderBottomLeftRadius: bRad, zIndex: 2 
      }}>
        {driver.pos}
      </div>
      
      {/* VOLVEMOS A LOS TEXTOS MÁS COMPACTOS */}
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