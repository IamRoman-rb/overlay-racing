import { getGraphicFrame, getFormatStyles, SECTOR_COLORS } from '../utils/raceVisuals';
import CategoryTag from '../components/CategoryTag';
import DriverPhoto, { photosEnabled } from '../components/DriverPhoto';

// MINI-SECTORES: hasta 2 pilotos con sus 3 sectores coloreados (violeta = mejor de la sesión, verde = mejor personal,
// amarillo = más lento), última vuelta, mejor vuelta y vuelta teórica (suma de sus mejores sectores).
// Formatos (PERSONALIZAR): standard | compact (una fila por piloto) | big (sectores grandes) | minimal | skins.
export default function Sectors({ drivers, config, state, sessionInfo, id = 'sectors' }) {
  const isVisible = !!state?.isVisible;
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 1440, y: 360, scale: 1 });
  const format = config?.sectorsFormat || 'standard';
  const f = getFormatStyles(format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const big = format === 'big';
  const numbers = state?.numbers || [];
  const selected = numbers.map(n => (drivers || []).find(d => String(d.number) === String(n))).filter(Boolean);
  const hasSectors = selected.some(d => [d.sector1, d.sector2, d.sector3].some(Boolean));
  const ts = f.textShadow;
  const showPh = photosEnabled(config, id);

  const cell = (label, value, color) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
      <span style={{ fontSize: big ? '12px' : '10px', fontWeight: 'bold', color: theme.title, letterSpacing: '1px', textShadow: ts }}>{label}</span>
      <div style={{ width: '100%', height: big ? '8px' : '6px', borderRadius: '3px', backgroundColor: SECTOR_COLORS[color || ''], margin: '3px 0' }} />
      <span style={{ fontSize: big ? '24px' : '15px', fontWeight: 900, color: color ? SECTOR_COLORS[color] : theme.number, fontFamily: 'monospace', textShadow: ts }}>{value || '--.---'}</span>
    </div>
  );

  // Una fila por piloto con los tres sectores como fichas de color
  const chip = (value, color) => (
    <span style={{ minWidth: '52px', textAlign: 'center', padding: '3px 4px', marginLeft: '4px', borderRadius: '3px', backgroundColor: SECTOR_COLORS[color || ''], color: color === 'yellow' ? '#000' : '#fff', fontSize: '12px', fontWeight: 900, fontFamily: 'monospace' }}>
      {value || '--.-'}
    </span>
  );

  const width = f.compact ? 420 : (big ? 560 : 460);

  return (
    <div style={wrapperStyle}>
      <div style={{ ...f.box, width: `${width}px` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: f.compact ? '6px 12px' : '8px 14px', backgroundColor: f.headerBg, borderBottom: f.headerBorder }}>
          <span style={{ color: theme.title, fontWeight: 900, fontSize: f.compact ? '12px' : '14px', letterSpacing: '2px', textShadow: ts }}>SECTORES<CategoryTag config={config} id={id} /></span>
          <span style={{ color: theme.number, fontSize: '11px', fontWeight: 'bold', display: sessionInfo?.idealLap ? 'inline' : 'none', textShadow: ts }}>
            {f.compact ? 'IDEAL' : 'VUELTA IDEAL'} <span style={{ color: SECTOR_COLORS.purple, fontFamily: 'monospace', fontSize: '13px' }}>{sessionInfo?.idealLap}</span>
          </span>
        </div>

        {f.compact ? selected.map(d => (
          <div key={d.number} style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color: theme.accent, fontWeight: 900, fontSize: '15px', width: '24px' }}>{d.pos}</span>
            <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '12px', padding: '1px 6px', borderRadius: '3px', marginRight: '8px' }}>{d.number}</span>
            <span style={{ flex: 1, minWidth: 0, color: theme.text, fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
            {hasSectors ? <>{chip(d.sector1, d.sectorColors?.[0])}{chip(d.sector2, d.sectorColors?.[1])}{chip(d.sector3, d.sectorColors?.[2])}</>
              : <span style={{ color: theme.text, fontFamily: 'monospace', fontWeight: 900, fontSize: '13px' }}>{d.lastLap || '-'}</span>}
          </div>
        )) : selected.map(d => (
          <div key={d.number} style={{ padding: big ? '12px 16px' : '10px 14px', borderBottom: f.minimal ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              {showPh && <DriverPhoto number={d.number} config={config} height={big ? 70 : 54} maxWidth={70} style={{ marginRight: '10px' }} />}
              <span style={{ color: theme.accent, fontWeight: 900, fontSize: big ? '22px' : '18px', width: '34px', textShadow: ts }}>{d.pos}</span>
              <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '13px', padding: '2px 7px', borderRadius: '3px', marginRight: '10px' }}>{d.number}</span>
              <span style={{ flex: 1, color: theme.text, fontWeight: 900, fontSize: big ? '21px' : '17px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: ts }}>{d.name}</span>
            </div>
            <div style={{ display: hasSectors ? 'flex' : 'none', marginBottom: '8px' }}>
              {cell('S1', d.sector1, d.sectorColors?.[0])}
              <div style={{ width: '8px' }} />
              {cell('S2', d.sector2, d.sectorColors?.[1])}
              <div style={{ width: '8px' }} />
              {cell('S3', d.sector3, d.sectorColors?.[2])}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: theme.title, textShadow: ts }}>
              <span>ÚLTIMA <span style={{ color: theme.text, fontFamily: 'monospace', fontSize: '13px' }}>{d.lastLap || '-'}</span></span>
              <span>MEJOR <span style={{ color: d.isFastest ? SECTOR_COLORS.purple : theme.text, fontFamily: 'monospace', fontSize: '13px' }}>{d.bestLap || '-'}</span></span>
              <span style={{ display: d.theoreticalBest ? 'inline' : 'none' }}>TEÓRICA <span style={{ color: SECTOR_COLORS.green, fontFamily: 'monospace', fontSize: '13px' }}>{d.theoreticalBest}</span></span>
            </div>
          </div>
        ))}
        <div style={{ display: selected.length && !hasSectors ? 'block' : 'none', padding: '8px 14px', fontSize: '11px', color: theme.number, textShadow: ts }}>
          La fuente de cronometraje no informa sectores.
        </div>
      </div>
    </div>
  );
}
