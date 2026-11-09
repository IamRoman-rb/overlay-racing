import { Fragment } from 'react';
import { getGraphicFrame, getFormatStyles, useLiveClock, secondsSinceCross, SECTOR_COLORS, getCategory } from '../utils/raceVisuals';
import BrandLogo from '../components/BrandLogo';
import { useSuitColors } from '../utils/suitColor';

// MODO CLASIFICACIÓN: tabla por mejor vuelta con la línea de corte (top N que pasa), la zona de eliminación,
// quién está en vuelta rápida, la vuelta en curso de los que están en pista y el tiempo que necesita cada uno para pasar.
// Formatos (PERSONALIZAR): standard | compact | times (tiempos absolutos en vez de diferencias) | minimal | skins.
export default function QualifyingBoard({ drivers, config, isVisible, sessionInfo, id = 'qualifying' }) {
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 20, y: 20, scale: 1 });
  const format = config?.qualifyingFormat || 'standard';
  const f = getFormatStyles(format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const ts = f.textShadow;
  const showTimes = format === 'times';
  const clock = useLiveClock(!!isVisible, drivers, 250);
  // Color del número tomado del traje (foto del piloto), si está activado en PILOTOS
  const suit = useSuitColors(drivers, config);
  const sc = (n) => (suit[String(n)] ? { backgroundColor: suit[String(n)].bg, color: suit[String(n)].text } : {});
  const cutoff = Math.max(0, parseInt(config?.qualiCutoff, 10) || 0);
  const maxRows = Math.min(40, Math.max(5, parseInt(config?.qualiRows, 10) || 20));
  const list = (drivers || []).filter(d => !d.dsq).slice(0, maxRows);
  const cutoffDriver = cutoff > 0 ? (drivers || []).filter(d => !d.dsq)[cutoff - 1] : null;
  const cutoffTime = cutoffDriver && cutoffDriver.bestLap && cutoffDriver.bestLap !== '-' ? cutoffDriver.bestLap : '';
  const title = (config?.qualiTitle || '').trim() || 'CLASIFICACIÓN';
  const ROW = f.compact ? 27 : 34;
  const width = f.compact ? 380 : 440;

  const status = (d, idx) => {
    if (d.onPushLap) return { text: f.compact ? 'RÁPIDA' : 'VUELTA RÁPIDA', color: SECTOR_COLORS.purple, pill: true };
    const since = secondsSinceCross(d, clock);
    if (d.onTrack && since !== null) {
      if (cutoffTime && idx >= cutoff) return { text: `OBJ ${cutoffTime}`, color: '#f39c12' };
      const m = Math.floor(since / 60);
      const s = Math.floor(since % 60);
      return { text: `${f.compact ? '' : 'EN PISTA '}${m}:${String(s).padStart(2, '0')}`, color: '#2ecc71' };
    }
    return { text: '', color: theme.number };
  };

  const timeOf = (d, idx) => {
    if (showTimes || idx === 0) return d.bestLap || '-';
    return d.diff && d.diff !== '-' ? d.diff : (d.bestLap || '-');
  };

  return (
    <div style={wrapperStyle}>
      <div style={{ ...f.box, width: `${width}px` }}>
        <div style={{ padding: f.compact ? '7px 12px' : '10px 14px', backgroundColor: f.headerBg, borderBottom: f.headerBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ color: theme.title, fontWeight: 900, fontSize: f.compact ? '13px' : '16px', letterSpacing: '2px', textTransform: 'uppercase', textShadow: ts }}>{title}</span>
            <span style={{ color: theme.number, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: ts }}>{getCategory(config, id) || sessionInfo?.name || ''}</span>
          </div>
          <div style={{ display: cutoff > 0 ? 'flex' : 'none', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: '#e74c3c', fontSize: '10px', fontWeight: 900, letterSpacing: '1px', textShadow: ts }}>CORTE P{cutoff}</span>
            <span style={{ color: theme.text, fontSize: f.compact ? '14px' : '16px', fontWeight: 900, fontFamily: 'monospace', textShadow: ts }}>{cutoffTime || '-:--.---'}</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          {list.map((d, idx) => {
            const st = status(d, idx);
            const eliminated = cutoff > 0 && idx >= cutoff;
            // Minimalista: filas translúcidas sobre el video, sin caja
            const rowBg = f.minimal
              ? (eliminated ? 'rgba(120,20,20,0.6)' : (idx % 2 === 0 ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'))
              : (eliminated ? 'rgba(231,76,60,0.16)' : 'transparent');
            return (
              <Fragment key={d.number}>
              {cutoff > 0 && idx === cutoff && (
                <div style={{ height: '16px', lineHeight: '16px', backgroundColor: '#e74c3c', color: '#fff', fontSize: '9px', fontWeight: 900, letterSpacing: '2px', textAlign: 'center', marginTop: f.minimal ? '3px' : 0 }}>
                  ZONA DE ELIMINACIÓN
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', height: `${ROW}px`, padding: '0 12px', boxSizing: 'border-box',
                backgroundColor: rowBg, marginTop: f.minimal ? '3px' : 0, borderRadius: f.minimal ? bRad : 0,
                borderBottom: f.minimal ? 'none' : '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ width: f.compact ? '22px' : '26px', color: eliminated ? '#e74c3c' : theme.accent, fontWeight: 900, fontSize: f.compact ? '13px' : '15px' }}>{d.pos}</span>
                <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: f.compact ? '11px' : '12px', width: '28px', textAlign: 'center', borderRadius: '2px', marginRight: '8px', ...sc(d.number) }}>{d.number}</span>
                <span style={{ flex: 1, color: theme.text, fontWeight: 'bold', fontSize: f.compact ? '12px' : '14px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><BrandLogo brand={d.brand} config={config} size={14} style={{ marginRight: '6px' }} />{d.name}</span>
                <span style={{ width: f.compact ? '78px' : '104px', textAlign: 'right', fontSize: f.compact ? '9px' : '10px', fontWeight: 900, color: st.pill ? '#fff' : st.color, whiteSpace: 'nowrap' }}>
                  <span style={{ backgroundColor: st.pill ? st.color : 'transparent', padding: st.pill ? '2px 5px' : 0, borderRadius: '3px' }}>{st.text}</span>
                </span>
                <span style={{ width: f.compact ? '70px' : '82px', textAlign: 'right', color: d.isFastest ? SECTOR_COLORS.purple : theme.number, fontWeight: 900, fontSize: f.compact ? '12px' : '14px', fontFamily: 'monospace' }}>
                  {timeOf(d, idx)}
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
