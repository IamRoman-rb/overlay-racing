import { getGraphicFrame } from '../utils/raceVisuals';
import CategoryTag from '../components/CategoryTag';

// MAYORES REMONTADAS: los pilotos que más posiciones ganaron respecto de la grilla de largada
export default function Gainers({ drivers, config, isVisible, id = 'gainers' }) {
  const { wrapperStyle, bRad, customBg, theme } = getGraphicFrame(config, id, isVisible, { x: 1440, y: 470, scale: 1 });
  const count = Math.min(10, Math.max(1, parseInt(config?.gainersCount, 10) || 5));
  const list = (drivers || [])
    .filter(d => Number.isFinite(d.posGain) && d.posGain > 0 && !d.dsq)
    .sort((a, b) => (b.posGain - a.posGain) || (parseInt(a.pos, 10) - parseInt(b.pos, 10)))
    .slice(0, count);
  const hasGrid = (drivers || []).some(d => Number.isFinite(d.startPos));

  return (
    <div style={wrapperStyle}>
      <div style={{
        width: '420px', boxSizing: 'border-box', borderRadius: bRad, overflow: 'hidden',
        backgroundColor: customBg ? 'transparent' : theme.bg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        borderTop: customBg ? 'none' : `4px solid ${theme.main}`, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        <div style={{ padding: '9px 14px', backgroundColor: customBg ? 'transparent' : theme.headerBg, color: theme.title, fontWeight: 900, fontSize: '14px', letterSpacing: '2px' }}>
          MAYORES REMONTADAS<CategoryTag config={config} id={id} />
        </div>
        {list.map((d, i) => (
          <div key={d.number} style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: theme.number, fontWeight: 'bold', fontSize: '13px', width: '22px' }}>{i + 1}.</span>
            <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '13px', padding: '2px 7px', borderRadius: '3px', marginRight: '10px' }}>{d.number}</span>
            <span style={{ flex: 1, color: theme.text, fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
            <span style={{ color: theme.number, fontSize: '12px', fontWeight: 'bold', margin: '0 12px', whiteSpace: 'nowrap' }}>P{d.startPos} → P{d.pos}</span>
            <span style={{ color: '#2ecc71', fontWeight: 900, fontSize: '18px', minWidth: '48px', textAlign: 'right' }}>▲{d.posGain}</span>
          </div>
        ))}
        <div style={{ display: list.length ? 'none' : 'block', padding: '12px 14px', color: theme.number, fontSize: '12px', fontWeight: 'bold' }}>
          {hasGrid ? 'NADIE GANÓ POSICIONES TODAVÍA' : 'SIN GRILLA DE LARGADA'}
        </div>
      </div>
    </div>
  );
}
