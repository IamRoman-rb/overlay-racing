export default function Battle({ drivers, config, isVisible, battleFocusPos = 1, id = 'battle' }) {
  const pos = config?.positions?.[id] || { x: 50, y: 150, scale: 1 };
  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#3498db';

  // MAGIA: EXTRAEMOS EL DISEÑO
  const customBg = config[`design_${id}`];

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
      transform: isVisible ? `scale(${pos.scale}) translateX(0)` : `scale(${pos.scale}) translateX(-40px)`,
      pointerEvents: 'none', display: 'flex', flexDirection: 'column', width: '420px',
      // FONDO A LA CAJA MADRE
      backgroundImage: customBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      padding: customBg ? '20px' : '0' // Un poco de padding interior si el diseño PNG lo requiere
    }}>
      
      {/* CABECERA (Se esconde el fondo si hay diseño personalizado) */}
      <div style={{
        backgroundColor: customBg ? 'transparent' : themeMain, 
        padding: '6px 15px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
        display: 'flex', alignItems: 'center', boxShadow: customBg ? 'none' : '0 5px 15px rgba(0,0,0,0.5)', zIndex: 2
      }}>
        <span style={{ color: customBg ? themeNormalText : themeBg, fontWeight: '900', fontStyle: 'italic', fontSize: '15px', letterSpacing: '1px' }}>
          BATALLA POR EL P{battleDrivers[0]?.pos}
        </span>
      </div>

      <div style={{
        backgroundColor: customBg ? 'transparent' : themeBg,
        borderBottom: customBg ? 'none' : `4px solid ${themeMain}`,
        borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px',
        boxShadow: customBg ? 'none' : '0 10px 20px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {battleDrivers.map((d, i) => (
          <div key={d.pos} style={{
            display: 'flex', alignItems: 'center', padding: '10px 15px',
            borderBottom: (i < battleDrivers.length - 1 && !customBg) ? '1px solid rgba(255,255,255,0.1)' : 'none'
          }}>
            <span style={{ width: '30px', color: themeAccent, fontWeight: '900', fontSize: '20px' }}>{d.pos}</span>
            <span style={{ backgroundColor: themeSecondary, color: themeBg, padding: '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '16px', marginRight: '12px' }}>{d.number}</span>
            <span style={{ flex: 1, color: themeNormalText, fontWeight: 'bold', fontSize: '20px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
            <span style={{ color: themeNumberText, fontWeight: '900', fontSize: '18px' }}>
              {i === 0 ? 'INTERVALO' : (d.diff || d.gap || '+0.000')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}