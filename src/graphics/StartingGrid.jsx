import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');
const path = window.require('path');

export default function StartingGrid({ drivers, config, isVisible, id = 'grid' }) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 2;

  // EXTRAEMOS LA PALETA COMPLETA
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#ffffff';

  useEffect(() => {
    if (!isVisible || drivers.length === 0) {
      setPage(0);
      return;
    }
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
      transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      width: '1280px', height: '720px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 30,
      transition: 'opacity 0.4s ease-in-out',
      opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      <style>{`
        @keyframes zoomInForward { 0% { transform: scale(0.3) translateZ(-500px); opacity: 0; } 70% { transform: scale(1.05) translateZ(0); opacity: 1; } 100% { transform: scale(1) translateZ(0); opacity: 1; } }
        .grid-page { 
          width: 100%; display: flex; justify-content: center; gap: 60px; 
          margin-top: 150px; /* <-- AUMENTADO para dar espacio a la foto arriba del cartel */
          animation: zoomInForward 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; 
        }
      `}</style>

      {/* CABECERA */}
      <div style={{
        position: 'absolute', top: '50px', left: '10%',
        backgroundColor: themeHeaderBg, color: themeTitleText, padding: '15px 40px',
        fontSize: '32px', fontWeight: '900', textTransform: 'uppercase',
        borderBottom: `6px solid ${themeMain}`, boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: '20px'
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
            key={driver.pos} 
            driver={driver} 
            config={config} 
            themeBg={themeBg}
            themeHeaderBg={themeHeaderBg}
            themeSecondary={themeSecondary} 
            themeAccent={themeAccent} 
            themeNormalText={themeNormalText}
            themeNumberText={themeNumberText}
          />
        ))}
      </div>
    </div>
  );
}

// TARJETA DE PILOTO
function DriverCard({ driver, config, themeBg, themeHeaderBg, themeSecondary, themeAccent, themeNormalText, themeNumberText }) {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    if (!config?.photosPath) {
      setImgSrc(null);
      return;
    }

    try {
      const extensions = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG'];
      let foundPath = null;
      let mime = 'image/png';
      
      for (const ext of extensions) {
        const checkPath = path.join(config.photosPath, `${driver.number}${ext}`);
        if (fs.existsSync(checkPath)) {
          foundPath = checkPath;
          mime = ext.toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
          break;
        }
      }

      if (foundPath) {
        const base64 = fs.readFileSync(foundPath, { encoding: 'base64' });
        setImgSrc(`data:${mime};base64,${base64}`);
      } else {
        setImgSrc(null);
      }
    } catch (e) {
      console.error(`Error cargando foto del piloto #${driver.number}:`, e);
      setImgSrc(null);
    }
  }, [config?.photosPath, driver.number]);

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', backgroundColor: themeBg, 
      borderLeft: `8px solid ${themeSecondary}`, borderRadius: '8px', 
      width: '450px', height: '110px', boxShadow: '10px 15px 30px rgba(0,0,0,0.8)', 
      position: 'relative', overflow: 'visible' 
    }}>
      
      {/* FOTO DEL PILOTO (Ubicada ARRIBA del cartel) */}
      {imgSrc && (
        <div style={{ 
          position: 'absolute', 
          right: '20px', 
          bottom: '100%', /* <-- ESTO HACE QUE SE PARE SOBRE EL BORDE SUPERIOR */
          marginBottom: '-20px', /* <-- Lo hunde 20px adentro de la tarjeta para efecto 3D */
          height: '210px', /* <-- Foto más grande */
          zIndex: 1, 
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' 
        }}>
          <img 
            src={imgSrc} 
            alt={driver.name}
            style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(-5px 5px 15px rgba(0,0,0,0.6))' }}
          />
        </div>
      )}

      {/* CUADRO DE POSICIÓN */}
      <div style={{ 
        width: '90px', backgroundColor: themeHeaderBg, height: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '48px', fontWeight: '900', color: themeNumberText,
        borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px',
        zIndex: 2,
      }}>
        {driver.pos}
      </div>
      
      {/* TEXTOS */}
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