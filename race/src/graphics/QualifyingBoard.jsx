import { Fragment } from 'react';
import { getGraphicFrame, getFormatStyles, useLiveClock, secondsSinceCross, SECTOR_COLORS, getCategory } from '../utils/raceVisuals';
import BrandLogo from '../components/BrandLogo';
import DriverPhoto from '../components/DriverPhoto';
import { photosEnabled } from '../utils/photos';
import { useSuitColors } from '../utils/suitColor';
import { makeFx } from '../utils/contentAnim';

// MODO CLASIFICACIÓN: tabla por mejor vuelta con la línea de corte (top N que pasa), la zona de eliminación,
// quién está en vuelta rápida, la vuelta en curso de los que están en pista y el tiempo que necesita cada uno para pasar.
// Formatos (PERSONALIZAR): standard | compact | times (tiempos absolutos en vez de diferencias) | minimal |
// pole (arriba, el puntero con su foto y su tiempo) | skins. Las filas entran con la aparición configurada (como la torre).
export default function QualifyingBoard({ drivers, config, isVisible, sessionInfo, id = 'qualifying' }) {
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 20, y: 20, scale: 1 });
  const format = config?.qualifyingFormat || 'standard';
  const isPole = format === 'pole';
  const f = getFormatStyles(isPole ? 'standard' : format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const ts = f.textShadow;
  const showTimes = format === 'times';
  const clock = useLiveClock(!!isVisible, drivers, 250);
  const fx = makeFx(config, id, isVisible, 0.2);
  const showPh = photosEnabled(config, id);
  // Color del número tomado del traje (foto del piloto), si está activado en PILOTOS
  const suit = useSuitColors(drivers, config);
  const sc = (n) => (suit[String(n)] ? { backgroundColor: suit[String(n)].bg, color: suit[String(n)].text } : {});
  const cutoff = Math.max(0, parseInt(config?.qualiCutoff, 10) || 0);
  const maxRows = Math.min(40, Math.max(5, parseInt(config?.qualiRows, 10) || 20));
  const list = (drivers || []).filter(d => !d.dsq).slice(0, maxRows);
  const cutoffDriver = cutoff > 0 ? (drivers || []).filter(d => !d.dsq)[cutoff - 1] : null;
  const cutoffTime = cutoffDriver && cutoffDriver.bestLap && cutoffDriver.bestLap !== '-' ? cutoffDriver.bestLap : '';
  const title = (config?.qualiTitle || '').trim() || 'CLASIFICACIÓN';
  const ROW = f.compact ? 27 : (showPh ? 40 : 34);
  const width = f.compact ? 380 : 440;
  const pole = isPole ? list[0] : null;
  const rows = isPole ? list.slice(1) : list;
  const rowOffset = isPole ? 1 : 0; // índice real de la fila en la tabla (para el corte)

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
            <span style={{ display: 'inline-block', color: theme.title, fontWeight: 900, fontSize: f.compact ? '13px' : '16px', letterSpacing: '2px', textTransform: 'uppercase', textShadow: ts, ...fx.text(0) }}>{title}</span>
            <span style={{ display: 'block', color: theme.number, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: ts, ...fx.text(1) }}>{getCategory(config, id) || sessionInfo?.name || ''}</span>
          </div>
          <div style={{ display: cutoff > 0 ? 'flex' : 'none', flexDirection: 'column', alignItems: 'flex-end', ...fx.text(2) }}>
            <span style={{ color: '#e74c3c', fontSize: '10px', fontWeight: 900, letterSpacing: '1px', textShadow: ts }}>CORTE P{cutoff}</span>
            <span style={{ color: theme.text, fontSize: f.compact ? '14px' : '16px', fontWeight: 900, fontFamily: 'monospace', textShadow: ts }}>{cutoffTime || '-:--.---'}</span>
          </div>
        </div>

        {/* POLE PROVISIONAL: el puntero con foto, número, nombre y su mejor vuelta */}
        {pole && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '12px', height: '112px', padding: '0 14px', boxSizing: 'border-box', overflow: 'hidden', background: `linear-gradient(90deg, ${theme.main}55, transparent 70%)`, borderBottom: `2px solid ${theme.accent}` }}>
            <DriverPhoto number={pole.number} config={config} height={108} maxWidth={130} fade style={{ flexShrink: 0, ...fx.photo(2) }} />
            <div style={{ flex: 1, minWidth: 0, alignSelf: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', ...fx.text(3) }}>
                <span style={{ backgroundColor: theme.accent, color: '#000', fontWeight: 900, fontSize: '12px', padding: '2px 8px', borderRadius: '3px', letterSpacing: '1px' }}>POLE</span>
                <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '13px', padding: '1px 8px', borderRadius: '3px', ...sc(pole.number) }}>{pole.number}</span>
              </span>
              <span style={{ display: 'block', color: theme.text, fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...fx.text(4) }}>
                <BrandLogo brand={pole.brand} config={config} size={20} style={{ marginRight: '8px' }} />{pole.name}
              </span>
              <span style={{ display: 'inline-block', color: pole.isFastest ? SECTOR_COLORS.purple : theme.title, fontWeight: 900, fontSize: '24px', fontFamily: 'monospace', ...fx.num(5) }}>{pole.bestLap || '-:--.---'}</span>
            </div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {rows.map((d, i) => {
            const idx = i + rowOffset;
            const st = status(d, idx);
            const eliminated = cutoff > 0 && idx >= cutoff;
            // Minimalista: filas translúcidas sobre el video, sin caja
            const rowBg = f.minimal
              ? (eliminated ? 'rgba(120,20,20,0.6)' : (idx % 2 === 0 ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'))
              : (eliminated ? 'rgba(231,76,60,0.16)' : 'transparent');
            return (
              <Fragment key={d.number}>
              {cutoff > 0 && idx === cutoff && (
                <div style={{ height: '16px', lineHeight: '16px', backgroundColor: '#e74c3c', color: '#fff', fontSize: '9px', fontWeight: 900, letterSpacing: '2px', textAlign: 'center', marginTop: f.minimal ? '3px' : 0, ...fx.wipe(3) }}>
                  ZONA DE ELIMINACIÓN
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', height: `${ROW}px`, padding: '0 12px', boxSizing: 'border-box', overflow: 'hidden',
                backgroundColor: rowBg, marginTop: f.minimal ? '3px' : 0, borderRadius: f.minimal ? bRad : 0,
                borderBottom: f.minimal ? 'none' : '1px solid rgba(255,255,255,0.05)',
                ...fx.row(i, rows.length, isPole ? 0.45 : 0.25)
              }}>
                <span style={{ width: f.compact ? '22px' : '26px', flexShrink: 0, color: eliminated ? '#e74c3c' : theme.accent, fontWeight: 900, fontSize: f.compact ? '13px' : '15px' }}>{d.pos}</span>
                {showPh && <DriverPhoto number={d.number} config={config} height={ROW - 2} maxWidth={ROW + 6} fade style={{ alignSelf: 'flex-end', marginRight: '6px', flexShrink: 0 }} />}
                <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: f.compact ? '11px' : '12px', width: '28px', flexShrink: 0, textAlign: 'center', borderRadius: '2px', marginRight: '8px', ...sc(d.number) }}>{d.number}</span>
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
