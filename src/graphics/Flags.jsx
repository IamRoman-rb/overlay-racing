import banderaCuadrosImg from '../assets/bandera cuadros.jpg';
import { getSkinStyle } from '../utils/skinStyles';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';

const FLAG_GLOW_COLOR = { red: '#e74c3c', black: '#ffcc00', blue: '#3498db', tricolor: '#ffffff', checkered: '#ffffff', green: '#2ecc71' };

export default function Flags({ activeFlags, config, id = 'flags' }) {
  let activeFlagType = null;
  if (activeFlags?.red) activeFlagType = 'red';
  else if (activeFlags?.tricolor) activeFlagType = 'tricolor';
  else if (activeFlags?.black) activeFlagType = 'black';
  else if (activeFlags?.blue) activeFlagType = 'blue';
  else if (activeFlags?.checkered) activeFlagType = 'checkered';
  else if (activeFlags?.green) activeFlagType = 'green';

  const isVisible = !!activeFlagType;
  const pos = config?.positions?.[id] || { x: 320, y: 50, scale: 1 };

  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  // MAGIA DE DISEÑO INDIVIDUAL
  const customBg = config[`design_${id}`];
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const flagsFormat = config?.flagsFormat || 'standard';

  // Lógica para la Bandera Negra con color de acento
  const blackText = config?.blackFlagNumber
    ? <>BANDERA NEGRA - AUTO <span style={{ color: themeAccent }}>#{config.blackFlagNumber}</span></>
    : 'BANDERA NEGRA - EXCLUSIÓN';

  // Fondos fijos por reglamento deportivo, pero textos dinámicos
  const flagStyles = {
    red: { bg: '#e74c3c', text: 'BANDERA ROJA', color: themeNormalText },
    black: { bg: '#111111', text: blackText, color: themeNormalText },
    blue: { bg: '#2980b9', text: 'BANDERA AZUL - DEJAR PASAR', color: themeNormalText },
    green: { bg: '#27ae60', text: 'BANDERA VERDE - PISTA LIBRE', color: themeNormalText },
    tricolor: {
      bg: 'linear-gradient(90deg, #0033a0 33.3%, #ffffff 33.3%, #ffffff 66.6%, #ff8200 66.6%)',
      text: 'AUTO DE SEGURIDAD', color: '#000', textShadow: '0px 0px 8px rgba(255,255,255,0.8)'
    },
    checkered: {
      bg: '#000000', image: banderaCuadrosImg,
      text: 'ÚLTIMA VUELTA', color: '#ffffff', textShadow: '0px 0px 8px rgba(0,0,0,1)'
    }
  };

  const currentStyle = activeFlagType ? flagStyles[activeFlagType] : flagStyles.red;

  // La bandera a cuadros usa la foto subida por el usuario como fondo (salvo que haya un diseño custom propio)
  const bgUrl = customBg || currentStyle.image || null;
  const useImageBg = !!bgUrl;
  const bgSize = customBg ? '100% 100%' : 'cover';

  // Skins (broadcast pro/degradé/cristal): el acento usa el color propio de cada bandera para no perder su significado
  const flagGlowColor = FLAG_GLOW_COLOR[activeFlagType] || themeAccent;
  const skin = getSkinStyle(flagsFormat, { themeMain: '#000000', themeAccent: flagGlowColor });

  // Animación de entrada (Las banderas suelen caer de arriba)
  let transformHidden = 'translateY(-150%) scale(1)';
  if (animStyle === 'fade') transformHidden = 'translateY(0) scale(1)';
  if (animStyle === 'zoom') transformHidden = 'translateY(0) scale(0.8)';
  if (animStyle === 'bounce') transformHidden = 'translateY(0) scale(0.3)';
  if (animStyle === 'flip') transformHidden = 'translateY(0) scaleY(0.05)';
  if (animStyle === 'rotate') transformHidden = 'translateY(0) scale(0.85) rotate(-15deg)';

  // Envuelve el texto en una placa de fondo cuando el estilo lo pide (p. ej. cuadros, para legibilidad)
  const label = currentStyle.textBoxBg ? (
    <span style={{ display: 'inline-block', backgroundColor: currentStyle.textBoxBg, padding: '4px 18px', borderRadius: '6px' }}>
      {currentStyle.text}
    </span>
  ) : currentStyle.text;

  // FORMATO BANNER: barra completa de ancho de pantalla
  if (flagsFormat === 'banner') {
    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transform: `scale(${pos.scale})`, transformOrigin: 'top left',
        zIndex: 60, pointerEvents: 'none', width: '1920px'
      }}>
        <div style={{
          background: useImageBg ? 'transparent' : currentStyle.bg,
          backgroundImage: useImageBg ? `url(${bgUrl})` : 'none',
          backgroundSize: bgSize, backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          padding: '18px 0', textAlign: 'center', width: '100%',
          borderTop: useImageBg ? 'none' : '4px solid rgba(0,0,0,0.35)',
          borderBottom: useImageBg ? 'none' : '4px solid rgba(0,0,0,0.35)',
          boxShadow: useImageBg ? 'none' : '0 6px 20px rgba(0,0,0,0.6)',
          transform: isVisible || animStyle === 'roll' ? 'translateY(0) scale(1)' : transformHidden, ...getRollClip(animStyle, isVisible),
          opacity: isVisible || animStyle === 'roll' ? 1 : 0,
          transition: `transform ${animDur}s cubic-bezier(0.25, 1, 0.5, 1), opacity ${animDur}s ease-in-out, clip-path ${animDur}s ease-in-out`
        }}>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: '900', color: currentStyle.color, textTransform: 'uppercase', letterSpacing: '2px', textShadow: currentStyle.textShadow || '1px 1px 0px rgba(0,0,0,0.5)' }}>
            {label}
          </h1>
        </div>
      </div>
    );
  }

  // FORMATO ESQUINA: banderín compacto tipo ribbon anclado a la izquierda
  if (flagsFormat === 'corner') {
    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transform: `scale(${pos.scale})`, transformOrigin: 'top left',
        zIndex: 60, pointerEvents: 'none'
      }}>
        <div style={{
          background: useImageBg ? 'transparent' : currentStyle.bg,
          backgroundImage: useImageBg ? `url(${bgUrl})` : 'none',
          backgroundSize: bgSize, backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          padding: '14px 30px 14px 22px', maxWidth: '480px',
          borderRadius: `0 ${bRad} ${bRad} 0`,
          borderLeft: useImageBg ? 'none' : '8px solid rgba(0,0,0,0.35)',
          boxShadow: useImageBg ? 'none' : '0 5px 15px rgba(0,0,0,0.5)',
          transform: isVisible ? 'translateX(0) scale(1)' : 'translateX(-120%) scale(1)',
          opacity: isVisible ? 1 : 0,
          transition: `transform ${animDur}s cubic-bezier(0.25, 1, 0.5, 1), opacity ${animDur}s ease-in-out, clip-path ${animDur}s ease-in-out`
        }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: currentStyle.color, textTransform: 'uppercase', textShadow: currentStyle.textShadow || '1px 1px 0px rgba(0,0,0,0.5)' }}>
            {label}
          </h2>
        </div>
      </div>
    );
  }

  // FORMATO APILADO: franja de color a un lado + caja oscura con el texto
  if (flagsFormat === 'stacked') {
    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transform: `scale(${pos.scale})`, transformOrigin: 'top left',
        zIndex: 60, pointerEvents: 'none'
      }}>
        <div style={{
          display: 'flex', borderRadius: bRad, overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
          transform: isVisible || animStyle === 'roll' ? 'translateY(0) scale(1)' : transformHidden, ...getRollClip(animStyle, isVisible),
          opacity: isVisible || animStyle === 'roll' ? 1 : 0,
          transition: `transform ${animDur}s cubic-bezier(0.25, 1, 0.5, 1), opacity ${animDur}s ease-in-out, clip-path ${animDur}s ease-in-out`
        }}>
          <div style={{
            width: '70px', background: useImageBg ? 'transparent' : currentStyle.bg,
            backgroundImage: useImageBg ? `url(${bgUrl})` : 'none',
            backgroundSize: bgSize, backgroundRepeat: 'no-repeat', backgroundPosition: 'center'
          }} />
          <div style={{ backgroundColor: '#0a0a0a', padding: '14px 26px', display: 'flex', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#fff', textTransform: 'uppercase' }}>
              {currentStyle.text}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      zIndex: 60, pointerEvents: 'none', width: '640px', display: 'flex', justifyContent: 'center'
    }}>
      <div style={{
         background: skin ? skin.background : (useImageBg ? 'transparent' : currentStyle.bg),
         backgroundImage: skin ? (skin.backgroundImage || 'none') : (useImageBg ? `url(${bgUrl})` : 'none'),
         backgroundSize: bgSize, backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
         padding: '10px 30px',
         border: skin ? skin.border : 'none',
         borderRadius: bRad, // <-- BORDE INDIVIDUAL
         boxShadow: skin ? skin.boxShadow : (useImageBg ? 'none' : '0 5px 15px rgba(0,0,0,0.5)'),
         backdropFilter: skin?.backdropFilter,
         textAlign: 'center', width: '100%',
         transform: isVisible || animStyle === 'roll' ? 'translateY(0) scale(1)' : transformHidden, ...getRollClip(animStyle, isVisible),
         opacity: isVisible || animStyle === 'roll' ? 1 : 0,
         transition: `transform ${animDur}s cubic-bezier(0.25, 1, 0.5, 1), opacity ${animDur}s ease-in-out, clip-path ${animDur}s ease-in-out`
      }}>
         <h1 style={{
           margin: 0, fontSize: '36px', fontWeight: '900',
           color: currentStyle.color, textTransform: 'uppercase',
           textShadow: currentStyle.textShadow || '1px 1px 0px rgba(0,0,0,0.5)'
         }}>
           {label}
         </h1>
      </div>
    </div>
  );
}
