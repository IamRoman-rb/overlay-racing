import { useEffect, useRef, useState } from 'react';

// Componente que mide si el texto entra en su contenedor.
// Si entra: texto quieto. Si no entra: desliza en loop (marquee) para mostrarlo completo.
function ScrollingName({ text, style, containerStyle }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const check = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        if (textWidth > containerWidth) {
          setShouldScroll(true);
          setScrollDistance(textWidth - containerWidth + 10);
        } else {
          setShouldScroll(false);
        }
      }
    };
    check();
    const t = setTimeout(check, 100); // por si la fuente carga después (Google Fonts)
    return () => clearTimeout(t);
  }, [text]);

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', minWidth: 0, ...containerStyle }}>
      <span
        ref={textRef}
        style={{
          ...style,
          display: 'inline-block',
          whiteSpace: 'nowrap',
          animation: shouldScroll ? `battleMarquee-${Math.round(scrollDistance)} 4s ease-in-out infinite` : 'none'
        }}
      >
        {text}
      </span>
      {shouldScroll && (
        <style>{`
          @keyframes battleMarquee-${Math.round(scrollDistance)} {
            0%, 15% { transform: translateX(0); }
            50%, 65% { transform: translateX(-${scrollDistance}px); }
            100% { transform: translateX(0); }
          }
        `}</style>
      )}
    </div>
  );
}

export default function Battle({ drivers, config, isVisible, battleFocusPos = 1, id = 'battle' }) {
  const pos = config?.positions?.[id] || { x: 50, y: 150, scale: 1 };
  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#00e5ff';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#3498db';

  const customBg = config[`design_${id}`];
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'

  const battleFormat = config?.battleFormat || 'vertical';
  const isHorizontal = battleFormat === 'horizontal';

  const containerWidth = isHorizontal ? '880px' : '460px';

  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  const targetPos = parseInt(battleFocusPos) || 1;
  const startIndex = Math.max(0, drivers.findIndex(d => parseInt(d.pos) === targetPos));
  const battleDrivers = drivers.slice(startIndex, startIndex + 3);

  if (battleDrivers.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left', zIndex: 45, 
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0, 
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
      pointerEvents: 'none', display: 'flex', flexDirection: 'column', 
      width: containerWidth, 
      backgroundImage: customBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      padding: customBg ? '20px' : '0' 
    }}>
      
      <div style={{
        backgroundColor: customBg ? 'transparent' : themeMain, 
        padding: isHorizontal ? '8px 15px' : '6px 15px', 
        borderTopLeftRadius: bRad, borderTopRightRadius: bRad, 
        display: 'flex', alignItems: 'center', 
        justifyContent: isHorizontal ? 'center' : 'flex-start',
        boxShadow: customBg ? 'none' : '0 5px 15px rgba(0,0,0,0.5)', zIndex: 2
      }}>
        <span style={{ color: customBg ? themeNormalText : '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: '16px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          BATALLA POR LA POSICIÓN {battleDrivers[0]?.pos}
        </span>
      </div>

      <div style={{
        backgroundColor: customBg ? 'transparent' : themeBg,
        borderBottom: customBg ? 'none' : `4px solid ${themeMain}`,
        borderBottomLeftRadius: bRad, borderBottomRightRadius: bRad, 
        boxShadow: customBg ? 'none' : '0 10px 20px rgba(0,0,0,0.5)', 
        display: 'flex', 
        flexDirection: isHorizontal ? 'row' : 'column',
        overflow: 'hidden'
      }}>
        {battleDrivers.map((d, i) => (
          <div key={d.pos} style={isHorizontal ? {
            display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0,
            borderRight: (i < battleDrivers.length - 1 && !customBg) ? '2px solid rgba(0,0,0,0.6)' : 'none',
            padding: '8px', gap: '4px'
          } : {
            display: 'flex', alignItems: 'center', padding: '10px 15px',
            borderBottom: (i < battleDrivers.length - 1 && !customBg) ? '1px solid rgba(255,255,255,0.1)' : 'none'
          }}>
            
            {isHorizontal ? (
              <>
                <div style={{ display: 'flex', height: '32px', minWidth: 0 }}>
                  <div style={{ width: '35px', flexShrink: 0, backgroundColor: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '18px' }}>
                    {d.pos}
                  </div>
                  <ScrollingName
                    text={d.name}
                    containerStyle={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 10px' }}
                    style={{ color: themeAccent, fontWeight: '900', fontSize: '18px', textTransform: 'uppercase' }}
                  />
                </div>
                <div style={{ display: 'flex', height: '32px' }}>
                  <div style={{ width: '35px', flexShrink: 0, backgroundColor: themeSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '16px' }}>
                    {d.number}
                  </div>
                  <div style={{ flex: 1, backgroundColor: 'rgba(46, 204, 113, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ecc71', fontWeight: '900', fontSize: '19px', letterSpacing: '1px' }}>
                    {d.bestLap && d.bestLap !== '' ? d.bestLap : '-:--.---'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <span style={{ width: '30px', flexShrink: 0, color: themeAccent, fontWeight: '900', fontSize: '20px' }}>{d.pos}</span>
                <span style={{ flexShrink: 0, backgroundColor: themeSecondary, color: themeBg, padding: '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '16px', marginRight: '12px' }}>{d.number}</span>
                <ScrollingName
                  text={d.name}
                  containerStyle={{ flex: 1, minWidth: 0, paddingRight: '10px' }}
                  style={{ color: themeNormalText, fontWeight: 'bold', fontSize: '20px', textTransform: 'uppercase' }}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: themeNumberText, fontWeight: '900', fontSize: '18px', lineHeight: '1.2' }}>
                    {i === 0 ? 'INTERVALO' : (d.diff || d.gap || '+0.000')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: themeAccent, fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>MEJOR V.</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', fontSize: '13px' }}>
                      {d.bestLap && d.bestLap !== '' ? d.bestLap : '-:--.---'}
                    </span>
                  </div>
                </div>
              </>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}