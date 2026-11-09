import { getGraphicFrame, SECTOR_COLORS } from '../utils/raceVisuals';
import CategoryTag from '../components/CategoryTag';

// MINI-SECTORES: hasta 2 pilotos con sus 3 sectores coloreados (violeta = mejor de la sesión, verde = mejor personal,
// amarillo = más lento), última vuelta, mejor vuelta y vuelta teórica (suma de sus mejores sectores).
export default function Sectors({ drivers, config, state, sessionInfo, id = 'sectors' }) {
  const isVisible = !!state?.isVisible;
  const { wrapperStyle, bRad, customBg, theme } = getGraphicFrame(config, id, isVisible, { x: 1440, y: 360, scale: 1 });
  const numbers = state?.numbers || [];
  const selected = numbers.map(n => (drivers || []).find(d => String(d.number) === String(n))).filter(Boolean);
  const hasSectors = selected.some(d => [d.sector1, d.sector2, d.sector3].some(Boolean));

  const cell = (label, value, color) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
      <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.title, letterSpacing: '1px' }}>{label}</span>
      <div style={{ width: '100%', height: '6px', borderRadius: '3px', backgroundColor: SECTOR_COLORS[color || ''], margin: '3px 0' }} />
      <span style={{ fontSize: '15px', fontWeight: 900, color: color ? SECTOR_COLORS[color] : theme.number, fontFamily: 'monospace' }}>{value || '--.---'}</span>
    </div>
  );

  return (
    <div style={wrapperStyle}>
      <div style={{
        width: '460px', boxSizing: 'border-box', borderRadius: bRad, overflow: 'hidden',
        backgroundColor: customBg ? 'transparent' : theme.bg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        borderTop: customBg ? 'none' : `4px solid ${theme.main}`, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', backgroundColor: customBg ? 'transparent' : theme.headerBg }}>
          <span style={{ color: theme.title, fontWeight: 900, fontSize: '14px', letterSpacing: '2px' }}>SECTORES<CategoryTag config={config} id={id} /></span>
          <span style={{ color: theme.number, fontSize: '11px', fontWeight: 'bold', display: sessionInfo?.idealLap ? 'inline' : 'none' }}>
            VUELTA IDEAL <span style={{ color: SECTOR_COLORS.purple, fontFamily: 'monospace', fontSize: '13px' }}>{sessionInfo?.idealLap}</span>
          </span>
        </div>
        {selected.map(d => (
          <div key={d.number} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: theme.accent, fontWeight: 900, fontSize: '18px', width: '34px' }}>{d.pos}</span>
              <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '13px', padding: '2px 7px', borderRadius: '3px', marginRight: '10px' }}>{d.number}</span>
              <span style={{ flex: 1, color: theme.text, fontWeight: 900, fontSize: '17px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
            </div>
            <div style={{ display: hasSectors ? 'flex' : 'none', marginBottom: '8px' }}>
              {cell('S1', d.sector1, d.sectorColors?.[0])}
              <div style={{ width: '8px' }} />
              {cell('S2', d.sector2, d.sectorColors?.[1])}
              <div style={{ width: '8px' }} />
              {cell('S3', d.sector3, d.sectorColors?.[2])}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: theme.title }}>
              <span>ÚLTIMA <span style={{ color: theme.text, fontFamily: 'monospace', fontSize: '13px' }}>{d.lastLap || '-'}</span></span>
              <span>MEJOR <span style={{ color: d.isFastest ? SECTOR_COLORS.purple : theme.text, fontFamily: 'monospace', fontSize: '13px' }}>{d.bestLap || '-'}</span></span>
              <span style={{ display: d.theoreticalBest ? 'inline' : 'none' }}>TEÓRICA <span style={{ color: SECTOR_COLORS.green, fontFamily: 'monospace', fontSize: '13px' }}>{d.theoreticalBest}</span></span>
            </div>
          </div>
        ))}
        <div style={{ display: selected.length && !hasSectors ? 'block' : 'none', padding: '8px 14px', fontSize: '11px', color: theme.number }}>
          La fuente de cronometraje no informa sectores.
        </div>
      </div>
    </div>
  );
}
