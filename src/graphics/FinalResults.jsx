import { useState, useEffect } from 'react';

export default function FinalResults({ drivers, config, isVisible, id = 'finalResults' }) {
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
  
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  
  // CORRECCIÓN 1: Incluimos pos.scale para que la animación no dé un salto de tamaño
  let transformHidden = `scale(${pos.scale}) translateY(-60px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  useEffect(() => {
    if (!isVisible || drivers.length <= itemsPerPage) {
      setPage(0);
      return;
    }
    const totalPages = Math.ceil(drivers.length / itemsPerPage);
    const interval = setInterval(() => {
      setPage(prev => (prev + 1) % totalPages);
    }, 8000); 
    return () => clearInterval(interval);
  }, [isVisible, drivers.length]);

  const currentDrivers = drivers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(drivers.length / itemsPerPage);

  return (
     <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transformOrigin: 'top left', zIndex: 35, 
        
        // CORRECCIÓN 2: Le decimos que anime "all" y le aplicamos el transformHidden
        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
        opacity: isVisible ? 1 : 0, 
        transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden,
        
        pointerEvents: isVisible ? 'auto' : 'none'
     }}>
         <style>{`
           @keyframes fadePage { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
         `}</style>

         <div style={{
             backgroundColor: hasCustomBg ? 'transparent' : themeBg, 
             backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
             backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
             padding: '40px', display: 'flex', flexDirection: 'column', 
             alignItems: 'center', boxShadow: hasCustomBg ? 'none' : '0 15px 50px rgba(0,0,0,0.8)',
             border: hasCustomBg ? 'none' : `2px solid ${themeMain}`,
             borderRadius: bRad 
         }}>
             
             {/* ENCABEZADO CON LOGO Y TÍTULO */}
             <div style={{ 
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '25px', 
               marginBottom: '30px', borderBottom: hasCustomBg ? 'none' : `4px solid ${themeMain}`, paddingBottom: '15px', width: '100%'
             }}>
                 {config?.logo && (
                   <img src={config.logo} alt="Logo Productora" style={{ height: '55px', maxWidth: '180px', objectFit: 'contain' }} />
                 )}
                 <h1 style={{ color: themeTitleText, fontSize: '40px', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
                     RESULTADOS FINALES - {config.campeonato || 'CARRERA'}
                 </h1>
             </div>
             
             {/* CONTENEDOR DE LA TABLA */}
             <div style={{ 
               width: '1050px', backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, 
               borderRadius: bRad, 
               padding: '10px 20px 20px 20px', border: hasCustomBg ? 'none' : '1px solid rgba(255,255,255,0.1)', position: 'relative' 
             }}>
                
                {/* ENCABEZADO DE LA TABLA */}
                <div style={{ 
                  display: 'flex', padding: '10px 10px', borderBottom: hasCustomBg ? 'none' : `2px solid ${themeMain}`, 
                  color: themeTitleText, fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px', marginBottom: '5px'
                }}>
                   <span style={{ width: '60px' }}>POS</span>
                   <span style={{ width: '80px' }}>NUM</span>
                   <span style={{ flex: 1 }}>PILOTO</span>
                   <span style={{ width: '120px', textAlign: 'center' }}>VUELTAS</span>
                   <span style={{ width: '180px', textAlign: 'right' }}>T. TOTAL</span>
                   <span style={{ width: '160px', textAlign: 'right' }}>MEJOR V.</span>
                </div>

                {/* FILAS DE PILOTOS */}
                <div key={page} style={{ animation: 'fadePage 0.5s ease-out' }}>
                  {currentDrivers.map((d, i) => (
                     <div key={i} style={{ 
                       display: 'flex', alignItems: 'center', padding: '12px 10px', 
                       borderBottom: (i === currentDrivers.length - 1 || hasCustomBg) ? 'none' : '1px solid rgba(255,255,255,0.05)', fontSize: '20px' 
                     }}>
                        <span style={{ width: '60px', color: themeAccent, fontWeight: '900', fontSize: '24px' }}>{d.pos}</span>
                        <span style={{ width: '80px' }}>
                          <span style={{ backgroundColor: themeSecondary, color: '#000', padding: '4px 10px', borderRadius: '4px', fontWeight: '900', fontSize: '18px' }}>{d.number}</span>
                        </span>
                        <span style={{ flex: 1, fontWeight: '900', color: themeNormalText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name.toUpperCase()}</span>
                        <span style={{ width: '120px', textAlign: 'center', color: themeNumberText, fontWeight: 'bold' }}>{d.laps}</span>
                        <span style={{ width: '180px', textAlign: 'right', color: themeNumberText, fontWeight: 'bold' }}>{d.totalTime}</span>
                        <span style={{ width: '160px', textAlign: 'right', color: themeAccent, fontWeight: '900' }}>{d.bestLap}</span>
                     </div>
                  ))}
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