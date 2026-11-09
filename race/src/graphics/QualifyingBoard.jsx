import { Fragment } from 'react';
import { getGraphicFrame, useLiveClock, secondsSinceCross, SECTOR_COLORS } from '../utils/raceVisuals';

// MODO CLASIFICACIÓN: tabla por mejor vuelta con la línea de corte (top N que pasa), la zona de eliminación,
// quién está en vuelta rápida, la vuelta en curso de los que están en pista y el tiempo que necesita cada uno para pasar.
export default function QualifyingBoard({ drivers, config, isVisible, sessionInfo, id = 'qualifying' }) {
  const { wrapperStyle, bRad, customBg, theme } = getGraphicFrame(config, id, isVisible, { x: 20, y: 20, scale: 1 });
  const clock = useLiveClock(!!isVisible, drivers, 250);
  const cutoff = Math.max(0, parseInt(config?.qualiCutoff, 10) || 0);
  const maxRows = Math.min(40, Math.max(5, parseInt(config?.qualiRows, 10) || 20));
  const list = (drivers || []).filter(d => !d.dsq).slice(0, maxRows);
  const cutoffDriver = cutoff > 0 ? (drivers || []).filter(d => !d.dsq)[cutoff - 1] : null;
  const cutoffTime = cutoffDriver && cutoffDriver.bestLap && cutoffDriver.bestLap !== '-' ? cutoffDriver.bestLap : '';
  const title = (config?.qualiTitle || '').trim() || 'CLASIFICACIÓN';
  const ROW = 34;

  const status = (d, idx) => {
    if (d.onPushLap) return { text: 'VUELTA RÁPIDA', color: SECTOR_COLORS.purple, pill: true };
    const since = secondsSinceCross(d, clock);
    if (d.onTrack && since !== null) {
      if (cutoffTime && idx >= cutoff) return { text: `OBJ ${cutoffTime}`, color: '#f39c12' };
      const m = Math.floor(since / 60);
      const s = Math.floor(since % 60);
      return { text: `EN PISTA ${m}:${String(s).padStart(2, '0')}`, color: '#2ecc71' };
    }
    return { text: '', color: theme.number };
  };

  return (
    <div style={wrapperStyle}>
      <div style={{
        width: '440px', boxSizing: 'border-box', borderRadius: bRad, overflow: 'hidden',
        backgroundColor: customBg ? 'transparent' : theme.bg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        borderTop: customBg ? 'none' : `4px solid ${theme.main}`, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        <div style={{ padding: '10px 14px', backgroundColor: customBg ? 'transparent' : theme.headerBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ color: theme.title, fontWeight: 900, fontSize: '16px', letterSpacing: '2px', textTransform: 'uppercase' }}>{title}</span>
            <span style={{ color: theme.number, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{config?.categoryName || sessionInfo?.name || ''}</span>
          </div>
          <div style={{ display: cutoff > 0 ? 'flex' : 'none', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: '#e74c3c', fontSize: '10px', fontWeight: 900, letterSpacing: '1px' }}>CORTE P{cutoff}</span>
            <span style={{ color: theme.text, fontSize: '16px', fontWeight: 900, fontFamily: 'monospace' }}>{cutoffTime || '-:--.---'}</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          {list.map((d, idx) => {
            const st = status(d, idx);
            const eliminated = cutoff > 0 && idx >= cutoff;
            return (
              <Fragment key={d.number}>
              {cutoff > 0 && idx === cutoff && (
                <div style={{ height: '16px', lineHeight: '16px', backgroundColor: '#e74c3c', color: '#fff', fontSize: '9px', fontWeight: 900, letterSpacing: '2px', textAlign: 'center' }}>
                  ZONA DE ELIMINACIÓN
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', height: `${ROW}px`, padding: '0 12px', boxSizing: 'border-box',
                backgroundColor: eliminated ? 'rgba(231,76,60,0.16)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ width: '26px', color: eliminated ? '#e74c3c' : theme.accent, fontWeight: 900, fontSize: '15px' }}>{d.pos}</span>
                <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '12px', width: '28px', textAlign: 'center', borderRadius: '2px', marginRight: '8px' }}>{d.number}</span>
                <span style={{ flex: 1, color: theme.text, fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                <span style={{ width: '104px', textAlign: 'right', fontSize: '10px', fontWeight: 900, color: st.pill ? '#fff' : st.color, whiteSpace: 'nowrap' }}>
                  <span style={{ backgroundColor: st.pill ? st.color : 'transparent', padding: st.pill ? '2px 5px' : 0, borderRadius: '3px' }}>{st.text}</span>
                </span>
                <span style={{ width: '82px', textAlign: 'right', color: d.isFastest ? SECTOR_COLORS.purple : theme.number, fontWeight: 900, fontSize: '14px', fontFamily: 'monospace' }}>
                  {idx === 0 ? (d.bestLap || '-') : (d.diff && d.diff !== '-' ? d.diff : (d.bestLap || '-'))}
                </span>
              </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
