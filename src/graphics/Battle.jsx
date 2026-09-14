import { useEffect, useRef, useState } from 'react';
import { getSkinStyle } from '../utils/skinStyles';

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
  const isCompact = battleFormat === 'compact';
  const isDuel = battleFormat === 'duel';
  const isMinimal = battleFormat === 'minimal';
  const skin = getSkinStyle(battleFormat, { themeMain, themeAccent });

  const containerWidth = isHorizontal ? '880px' : (isCompact ? '360px' : '460px');

  let transformHidden = `scale(${pos.scale}) translateX(-40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

  const targetPos = parseInt(battleFocusPos) || 1;
  const startIndex = Math.max(0, drivers.findIndex(d => parseInt(d.pos) === targetPos));
  const battleDrivers = drivers.slice(startIndex, startIndex + (isDuel ? 2 : 3));

  if (battleDrivers.length === 0) return null;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left', zIndex: 45,
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? `scale(${pos.scale}) translateX(0)` : transformHidden,
    pointerEvents: 'none'
  };

  // FORMATO DUELO: 1 vs 1 cara a cara, con "VS" al centro
  if (isDuel) {
    const [a, b] = battleDrivers;
    const renderSide = (d) => d && (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '15px 10px',
        backgroundColor: customBg ? 'transparent' : themeBg, minWidth: 0
      }}>
        <span style={{ color: themeAccent, fontWeight: '900', fontSize: '32px', lineHeight: 1 }}>P{d.pos}</span>
        <span style={{ backgroundColor: themeSecondary, color: '#000', fontWeight: '900', fontSize: '16px', padding: '2px 10px', borderRadius: '4px' }}>{d.number}</span>
        <ScrollingName
          text={d.name}
          containerStyle={{ maxWidth: '100%', textAlign: 'center' }}
          style={{ color: themeNormalText, fontWeight: '900', fontSize: '17px', textTransform: 'uppercase' }}
        />
        <span style={{ color: themeNumberText, fontWeight: 'bold', fontSize: '13px' }}>
          {d.bestLap && d.bestLap !== '' ? d.bestLap : '-:--.---'}
        </span>
      </div>
    );

    return (
      <div style={{ ...wrapperStyle, display: 'flex', flexDirection: 'column', width: '520px' }}>
        <div style={{
          backgroundColor: customBg ? 'transparent' : themeMain, padding: '6px 15px',
          borderTopLeftRadius: bRad, borderTopRightRadius: bRad,
          textAlign: 'center', boxShadow: customBg ? 'none' : '0 5px 15px rgba(0,0,0,0.5)'
        }}>
          <span style={{ color: '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: '16px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            BATALLA POR LA POSICIÓN {a?.pos}
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'stretch', position: 'relative',
          backgroundImage: customBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderBottomLeftRadius: bRad, borderBottomRightRadius: bRad, overflow: 'hidden',
          boxShadow: customBg ? 'none' : '0 10px 20px rgba(0,0,0,0.5)'
        }}>
          {renderSide(a)}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: themeAccent, color: '#000', fontWeight: '900', fontSize: '15px',
            width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 4px rgba(0,0,0,0.5)', zIndex: 2
          }}>
            VS
          </div>
          {renderSide(b)}
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: filas flotando sin caja ni fondo
  if (isMinimal) {
    return (
      <div style={{ ...wrapperStyle, display: 'flex', flexDirection: 'column', gap: '6px', width: '420px' }}>
        <span style={{ color: themeAccent, fontWeight: '900', fontStyle: 'italic', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
          BATALLA POR LA POSICIÓN {battleDrivers[0]?.pos}
        </span>
        {battleDrivers.map((d, i) => (
          <div key={d.pos} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '28px', color: themeAccent, fontWeight: '900', fontSize: '18px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>{d.pos}</span>
            <span style={{ color: themeNumberText, fontWeight: 'bold', fontSize: '13px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>#{d.number}</span>
            <ScrollingName
              text={d.name}
              containerStyle={{ flex: 1, minWidth: 0 }}
              style={{ color: themeNormalText, fontWeight: '900', fontSize: '18px', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}
            />
            <span style={{ color: themeNumberText, fontWeight: '900', fontSize: '14px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
              {i === 0 ? '' : (d.diff || d.gap || '+0.000')}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      ...wrapperStyle, display: 'flex', flexDirection: 'column',
      width: containerWidth,
      backgroundImage: customBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      padding: customBg ? '20px' : '0'
    }}>

      <div style={{
        backgroundColor: skin ? skin.background : (customBg ? 'transparent' : themeMain),
        padding: isHorizontal ? '8px 15px' : (isCompact ? '5px 12px' : '6px 15px'),
        borderTopLeftRadius: bRad, borderTopRightRadius: bRad,
        border: skin ? skin.border : 'none', borderBottom: 'none',
        display: 'flex', alignItems: 'center',
        justifyContent: isHorizontal ? 'center' : 'flex-start',
        boxShadow: skin ? skin.boxShadow : (customBg ? 'none' : '0 5px 15px rgba(0,0,0,0.5)'), zIndex: 2
      }}>
        <span style={{ color: (customBg || skin) ? themeNormalText : '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: isCompact ? '13px' : '16px', letterSpacing: '1px', textTransform: 'uppercase', textShadow: skin?.textShadow }}>
          BATALLA POR LA POSICIÓN {battleDrivers[0]?.pos}
        </span>
      </div>

      <div style={{
        backgroundColor: skin ? skin.background : (customBg ? 'transparent' : themeBg),
        borderBottom: skin ? skin.border : (customBg ? 'none' : `4px solid ${themeMain}`),
        borderLeft: skin ? skin.border : 'none', borderRight: skin ? skin.border : 'none',
        borderBottomLeftRadius: bRad, borderBottomRightRadius: bRad,
        boxShadow: skin ? skin.boxShadow : (customBg ? 'none' : '0 10px 20px rgba(0,0,0,0.5)'),
        backdropFilter: skin?.backdropFilter,
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
            display: 'flex', alignItems: 'center', padding: isCompact ? '6px 12px' : '10px 15px',
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
                <span style={{ width: isCompact ? '24px' : '30px', flexShrink: 0, color: themeAccent, fontWeight: '900', fontSize: isCompact ? '15px' : '20px' }}>{d.pos}</span>
                <span style={{ flexShrink: 0, backgroundColor: themeSecondary, color: themeBg, padding: isCompact ? '1px 6px' : '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: isCompact ? '12px' : '16px', marginRight: isCompact ? '8px' : '12px' }}>{d.number}</span>
                <ScrollingName
                  text={d.name}
                  containerStyle={{ flex: 1, minWidth: 0, paddingRight: '10px' }}
                  style={{ color: themeNormalText, fontWeight: 'bold', fontSize: isCompact ? '15px' : '20px', textTransform: 'uppercase' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: themeNumberText, fontWeight: '900', fontSize: isCompact ? '13px' : '18px', lineHeight: '1.2' }}>
                    {i === 0 ? 'INTERVALO' : (d.diff || d.gap || '+0.000')}
                  </span>
                  {!isCompact && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ color: themeAccent, fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>MEJOR V.</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', fontSize: '13px' }}>
                        {d.bestLap && d.bestLap !== '' ? d.bestLap : '-:--.---'}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}