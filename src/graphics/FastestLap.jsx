import { useMemo } from 'react';

export default function FastestLap({ drivers, config, isVisible, id = 'fastestLap' }) {
  const pos = config?.positions?.[id] || { x: 440, y: 150, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0,0,0,0.9)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  // MAGIA DE DISEÑO PERSONALIZADO
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;

  const fastestDriver = useMemo(() => {
    if (!drivers || drivers.length === 0) return null;
    let best = null;
    let minTime = Infinity;

    const parseTime = (str) => {
      if (!str || str === '-') return Infinity;
      const parts = str.split(':');
      if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
      return parseFloat(str);
    };

    drivers.forEach(d => {
      const t = parseTime(d.bestLap);
      if (t < minTime) { minTime = t; best = d; }
    });

    return best;
  }, [drivers]);

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      zIndex: 40, pointerEvents: 'none',
      transition: 'opacity 0.4s ease-in-out',
      opacity: isVisible ? 1 : 0
    }}>
       <div style={{
         display: 'flex', flexDirection: 'column', width: '450px',
         backgroundColor: hasCustomBg ? 'transparent' : themeBg, // Fondo transparente si hay imagen
         backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
         backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
         boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)', 
         borderRadius: '8px', overflow: 'hidden',
         transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
         transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
         padding: hasCustomBg ? '10px' : '0' // Padding extra si usa imagen
       }}>
         {/* ENCABEZADO */}
         <div style={{ 
           backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, 
           borderBottom: hasCustomBg ? 'none' : `3px solid ${themeMain}`, 
           display: 'flex', alignItems: 'center', padding: '8px 15px' 
         }}>
            <span style={{ color: themeTitleText, fontWeight: '900', fontSize: '16px', fontStyle: 'italic', letterSpacing: '1px' }}>
              RECORD DE VUELTA
            </span>
         </div>
         
         {/* DATOS DEL PILOTO */}
         <div style={{ backgroundColor: 'transparent', display: 'flex', alignItems: 'center', padding: '15px' }}>
            <div style={{ backgroundColor: themeSecondary, color: '#000', fontWeight: '900', fontSize: '20px', width: '45px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginRight: '15px' }}>
              {fastestDriver?.number || '-'}
            </div>
            
            <div style={{ flex: 1, color: themeNormalText, fontWeight: 'bold', fontSize: '24px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fastestDriver?.name || '---'}
            </div>
            
            <div style={{ color: themeAccent, fontWeight: '900', fontSize: '26px', marginLeft: '15px' }}>
              {fastestDriver?.bestLap || '-:--.---'}
            </div>
         </div>
       </div>
    </div>
  );
}