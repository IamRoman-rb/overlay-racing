import { getGraphicFrame } from '../utils/raceVisuals';

const KIND_COLORS = { leader: '#ffd700', stopped: '#e74c3c', pole: '#a23cf0' };

// AVISO DE CARRERA: lo que el operador saca al aire desde una alerta automática (nuevo líder, posible abandono).
export default function RaceNotice({ notice, config, id = 'raceNotice' }) {
  const isVisible = !!notice?.isVisible;
  const { wrapperStyle, bRad, customBg, theme } = getGraphicFrame(config, id, isVisible, { x: 760, y: 820, scale: 1 }, 55);
  const accent = KIND_COLORS[notice?.kind] || theme.main;

  return (
    <div style={wrapperStyle}>
      <div style={{
        display: 'flex', alignItems: 'stretch', width: '440px', boxSizing: 'border-box', borderRadius: bRad, overflow: 'hidden',
        backgroundColor: customBg ? 'transparent' : theme.bg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        <div style={{ width: '8px', backgroundColor: accent, flexShrink: 0 }} />
        <div style={{ display: notice?.number ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', minWidth: '64px', backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '26px', padding: '0 8px' }}>
          {notice?.number}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 16px', minWidth: 0, flex: 1 }}>
          <span style={{ color: accent, fontWeight: 900, fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' }}>{notice?.title}</span>
          <span style={{ color: theme.text, fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notice?.text}</span>
        </div>
      </div>
    </div>
  );
}
