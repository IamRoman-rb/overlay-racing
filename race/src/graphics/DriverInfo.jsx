import pilotoAnonimo from '../assets/piloto_anonimo.png';
import { DriverFlag } from '../components/CountryFlag';
import { useDriverPhoto } from '../utils/useDriverPhoto';
import { getSkinStyle } from '../utils/skinStyles';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import CategoryTag from '../components/CategoryTag';
import { useSuitStyle } from '../utils/suitColor';
import SuitNumber from '../components/SuitNumber';
import { makeFx } from '../utils/contentAnim';

export default function DriverInfo({ driver, config, isVisible, id = 'driverInfo' }) {
  // Color del número tomado del traje (foto del piloto), si está activado en PILOTOS
  const sc = useSuitStyle([driver?.number], config);
  const pos = config?.positions?.[id] || { x: 380, y: 335, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#bdc3c7';

  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;

  // LECTURA DE BORDES Y ANIMACIÓN
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const driverInfoFormat = config?.driverInfoFormat || 'standard';
  const skin = getSkinStyle(driverInfoFormat, { themeMain, themeAccent });
  // Los datos entran escalonados (foto, posición, número, nombre, tiempo); si cambia el piloto al aire, se repite
  const fx = makeFx(config, id, isVisible);

  // CÁLCULO DE LA ANIMACIÓN DE ENTRADA
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; // Slide
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; // Solo opacidad
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`; // Pequeño al inicio
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const imgSrc = useDriverPhoto(driver?.number, !!(driver && config?.photosPath), pilotoAnonimo);

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left', zIndex: 45, pointerEvents: 'none',
    transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
    opacity: isVisible || animStyle === 'roll' ? 1 : 0,
    transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateX(0)` : transformHidden, ...getRollClip(animStyle, isVisible)
  };

  if (!driver) return <div style={wrapperStyle} />;

  // FORMATO FOTO: retrato del piloto a un lado + datos al otro
  if (driverInfoFormat === 'photo') {
    return (
      <div style={wrapperStyle}>
        <div key={driver.number} style={{
          display: 'flex', alignItems: 'stretch', width: '460px', height: '150px',
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)', overflow: 'hidden'
        }}>
          <div className={fx.group} style={{ width: '120px', flexShrink: 0, backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={imgSrc} style={{ height: '100%', objectFit: 'contain' }} />
          </div>
          <div className={fx.group} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 18px', minWidth: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: themeAccent, letterSpacing: '1px' }}>
              P{driver.pos} — Nº<SuitNumber number={driver.number} config={config} prefix="" /><CategoryTag config={config} id={id} size="1em" />
            </span>
            <span style={{ fontSize: '22px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
              <DriverFlag driver={driver} config={config} id={id} height={17} style={{ marginRight: '8px', marginTop: '-3px' }} />{driver.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>MEJOR VUELTA</span>
              <span style={{ fontSize: '16px', color: themeNumberText, fontWeight: '900' }}>{driver.bestLap}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO COMPACTO: una sola fila angosta
  if (driverInfoFormat === 'compact') {
    return (
      <div style={wrapperStyle}>
        <div key={driver.number} className={fx.group} style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '380px', padding: '8px 15px',
          backgroundColor: hasCustomBg ? 'transparent' : themeBg,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderLeft: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)'
        }}>
          <div style={{ backgroundColor: hasCustomBg ? 'rgba(255,255,255,0.15)' : themeAccent, color: '#000', fontWeight: '900', fontSize: '16px', minWidth: '32px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', flexShrink: 0 }}>
            {driver.pos}
          </div>
          <span style={{ color: themeNumberText, fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>
            <SuitNumber number={driver.number} config={config} />
          </span>
          <span style={{ flex: 1, color: themeNormalText, fontWeight: '900', fontSize: '17px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <DriverFlag driver={driver} config={config} id={id} height={14} style={{ marginRight: '6px', marginTop: '-2px' }} />{driver.name}
          </span>
          <span style={{ color: themeTitleText, fontWeight: '900', fontSize: '15px', whiteSpace: 'nowrap' }}>
            {driver.bestLap}
          </span>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo texto flotando sobre el video
  if (driverInfoFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div key={driver.number} className={fx.group} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: themeAccent, letterSpacing: '1px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            P{driver.pos} — Nº<SuitNumber number={driver.number} config={config} prefix="" /><CategoryTag config={config} id={id} size="1em" />
          </span>
          <span style={{ fontSize: '28px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            <DriverFlag driver={driver} config={config} id={id} height={21} style={{ marginRight: '10px', marginTop: '-4px' }} />{driver.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>MEJOR VUELTA</span>
            <span style={{ fontSize: '18px', color: themeNumberText, fontWeight: '900', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>{driver.bestLap}</span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={wrapperStyle}>
      <div key={driver.number} style={{
        display: 'flex', width: '480px',
        backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
        border: skin ? skin.border : 'none',
        borderTop: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
        backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        boxShadow: skin ? skin.boxShadow : (hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.6)'),
        backdropFilter: skin?.backdropFilter,
        borderRadius: bRad,
        overflow: 'hidden'
      }}>
        {/* POS: bloque propio, chico, separado del número */}
        <div className={fx.group} style={{
          backgroundColor: skin ? 'transparent' : (hasCustomBg ? 'transparent' : themeMain),
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '15px 12px', minWidth: '55px',
          borderRight: skin ? `2px solid ${themeAccent}` : (hasCustomBg ? 'none' : `2px solid rgba(0,0,0,0.3)`)
        }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: skin ? themeAccent : '#fff', letterSpacing: '1px', opacity: 0.85 }}>POS</span>
          <span style={{ fontSize: '30px', fontWeight: '900', color: skin ? themeNormalText : '#fff', lineHeight: '1' }}>{driver.pos}</span>
        </div>

        {/* NÚMERO: bloque propio, con el color de acento del tema */}
        <div className={fx.group} style={{
          backgroundColor: skin ? 'transparent' : (hasCustomBg ? 'transparent' : themeAccent),
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '15px 20px',
          borderRight: skin ? `2px solid ${themeAccent}` : (hasCustomBg ? 'none' : `3px solid ${themeMain}`)
        }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: skin ? themeAccent : '#000', letterSpacing: '1px', opacity: 0.75 }}>Nº</span>
          <span style={{ fontSize: '38px', fontWeight: '900', color: skin ? themeNormalText : '#000', lineHeight: '1', ...(sc(driver.number).backgroundColor ? { ...sc(driver.number), padding: '2px 8px', borderRadius: '4px' } : {}) }}>{driver.number}</span>
        </div>

        <div className={fx.group} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '15px 25px', minWidth: 0 }}>
          <span style={{ fontSize: '24px', fontWeight: '900', color: themeNormalText, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
            <DriverFlag driver={driver} config={config} id={id} height={18} style={{ marginRight: '8px', marginTop: '-3px' }} />{driver.name}<CategoryTag config={config} id={id} size="0.5em" color={themeTitleText} />
          </span>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>MEJOR VUELTA</span>
            <span style={{ fontSize: '18px', color: themeNumberText, fontWeight: '900' }}>{driver.bestLap}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
