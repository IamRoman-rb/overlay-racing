export default function Flags({ activeFlags, config, id = 'flags' }) {
  let activeFlagType = null;
  if (activeFlags?.red) activeFlagType = 'red';
  else if (activeFlags?.tricolor) activeFlagType = 'tricolor';
  else if (activeFlags?.black) activeFlagType = 'black';
  else if (activeFlags?.blue) activeFlagType = 'blue';

  const isVisible = !!activeFlagType;
  const pos = config?.positions?.[id] || { x: 320, y: 50, scale: 1 };

  // EXTRAEMOS LA PALETA NECESARIA
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';

  // Lógica para la Bandera Negra con color de acento
  const blackText = config?.blackFlagNumber 
    ? <>BANDERA NEGRA - AUTO <span style={{ color: themeAccent }}>#{config.blackFlagNumber}</span></> 
    : 'BANDERA NEGRA - EXCLUSIÓN';

  // Fondos fijos por reglamento deportivo, pero textos dinámicos
  const flagStyles = {
    red: { bg: '#e74c3c', text: 'BANDERA ROJA', color: themeNormalText },
    black: { bg: '#111111', text: blackText, color: themeNormalText },
    blue: { bg: '#2980b9', text: 'BANDERA AZUL - DEJAR PASAR', color: themeNormalText },
    tricolor: { 
      bg: 'linear-gradient(90deg, #0033a0 33.3%, #ffffff 33.3%, #ffffff 66.6%, #ff8200 66.6%)', 
      text: 'AUTO DE SEGURIDAD', color: '#000', textShadow: '0px 0px 8px rgba(255,255,255,0.8)' 
    }
  };

  const currentStyle = activeFlagType ? flagStyles[activeFlagType] : flagStyles.red;

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      zIndex: 60, pointerEvents: 'none', width: '640px', display: 'flex', justifyContent: 'center'
    }}>
      <div style={{
         background: currentStyle.bg, padding: '10px 30px', borderRadius: '4px',
         boxShadow: '0 5px 15px rgba(0,0,0,0.5)', textAlign: 'center', width: '100%',
         transform: isVisible ? 'translateY(0)' : 'translateY(-150%)',
         opacity: isVisible ? 1 : 0,
         transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease-in-out'
      }}>
         <h1 style={{ 
           margin: 0, fontSize: '36px', fontWeight: '900', 
           color: currentStyle.color, textTransform: 'uppercase',
           textShadow: currentStyle.textShadow || '1px 1px 0px rgba(0,0,0,0.5)' 
         }}>
           {currentStyle.text}
         </h1>
      </div>
    </div>
  );
}