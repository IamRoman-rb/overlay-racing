import { getSkinStyle } from '../utils/skinStyles';

export default function VotingQR({ isVisible, config, localIp, id = 'votingQR' }) {
  const pos = config?.positions?.[id] || { x: 20, y: 700, scale: 1 };
  const themeBg = config?.themeBg || '#1a1a1a';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config?.[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config?.[`borderRadius_${id}`] || '8px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const qrFormat = config?.votingQRFormat || 'standard';
  const skin = getSkinStyle(qrFormat, { themeMain, themeAccent });

  let transformHidden = `scale(${pos.scale}) translateY(30px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  // Verificamos si la URL ya se generó (túnel/IP local) o si sigue cargando
  const isValidIp = typeof localIp === 'string' && localIp.trim() !== '';
  const qrSize = qrFormat === 'compact' ? 90 : (qrFormat === 'minimal' ? 110 : 150);
  const qrUrl = isValidIp ? `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(localIp)}&margin=10` : null;

  const renderQrBox = (size) => (
    <div style={{ padding: '5px', backgroundColor: '#fff', borderRadius: '4px', width: `${size}px`, height: `${size}px`, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
      {isValidIp ? (
        <img src={qrUrl} alt="QR Code" style={{ width: `${size - 10}px`, height: `${size - 10}px`, display: 'block' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#000', fontSize: size > 100 ? '10px' : '9px', fontWeight: '900', textAlign: 'center', letterSpacing: '1px' }}>
            {size > 100 ? <>GENERANDO<br/>TÚNEL...</> : 'GENERANDO...'}
          </span>
        </div>
      )}
    </div>
  );

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
    zIndex: 40, pointerEvents: 'none',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden
  };

  // FORMATO COMPACTO: QR chico + texto al lado, sin encabezado
  if (qrFormat === 'compact') {
    return (
      <div style={{
        ...wrapperStyle, display: 'flex', alignItems: 'center', gap: '12px', width: '260px', padding: '10px',
        backgroundColor: hasCustomBg ? 'transparent' : themeBg,
        backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        borderLeft: hasCustomBg ? 'none' : `4px solid ${themeMain}`,
        borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)'
      }}>
        {renderQrBox(90)}
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: '900', lineHeight: '1.3', textTransform: 'uppercase' }}>
          Escaneá para<br/>votar al ganador
        </span>
      </div>
    );
  }

  // FORMATO BANNER: caja ancha horizontal con QR a la izquierda
  if (qrFormat === 'banner') {
    return (
      <div style={{
        ...wrapperStyle, display: 'flex', alignItems: 'stretch', width: '420px',
        backgroundColor: hasCustomBg ? 'transparent' : themeBg,
        backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        borderRadius: bRad, boxShadow: hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)',
        overflow: 'hidden', borderLeft: hasCustomBg ? 'none' : `4px solid ${themeMain}`
      }}>
        <div style={{ padding: '15px', display: 'flex', alignItems: 'center' }}>
          {renderQrBox(110)}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '15px 20px 15px 5px' }}>
          <span style={{ color: themeAccent, fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            PILOTO DEL DÍA
          </span>
          <span style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', lineHeight: '1.4' }}>
            Escaneá para votar<br/>al ganador
          </span>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, solo el QR flotando con una etiqueta
  if (qrFormat === 'minimal') {
    return (
      <div style={{ ...wrapperStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {renderQrBox(110)}
        <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
          ESCANEÁ PARA VOTAR
        </span>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={{
      ...wrapperStyle,
      display: 'flex', flexDirection: 'column', width: '250px',
      backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
      backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      borderRadius: bRad,
      border: skin ? skin.border : 'none',
      boxShadow: skin ? skin.boxShadow : (hasCustomBg ? 'none' : '0 10px 30px rgba(0,0,0,0.8)'),
      backdropFilter: skin?.backdropFilter,
      overflow: 'hidden', borderLeft: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
      padding: hasCustomBg ? '10px' : '0'
    }}>
      <div style={{ backgroundColor: skin ? 'transparent' : (hasCustomBg ? 'transparent' : themeHeaderBg), padding: '10px', textAlign: 'center', borderBottom: skin ? `1px solid ${themeAccent}44` : (hasCustomBg ? 'none' : `2px solid ${themeMain}`) }}>
        <span style={{ color: themeAccent, fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
          PILOTO DEL DÍA
        </span>
      </div>
      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        {renderQrBox(150)}
        <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.4' }}>
          ESCANEÁ PARA VOTAR<br/>AL GANADOR
        </span>
      </div>
    </div>
  );
}
