import { getGraphicFrame, getFormatStyles } from '../utils/raceVisuals';
import { useSuitColors } from '../utils/suitColor';
import BrandLogo from '../components/BrandLogo';
import DriverPhoto, { photosEnabled } from '../components/DriverPhoto';
import CategoryTag from '../components/CategoryTag';

const fmt = (sec) => {
  if (!Number.isFinite(sec)) return '-';
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(3);
  return m > 0 ? `${m}:${s.padStart(6, '0')}` : s;
};

// ÚLTIMAS VUELTAS: el primer piloto con sus tiempos y el segundo con la diferencia en cada vuelta
// (verde = el de abajo fue más rápido, rojo = más lento). Usa el historial de vueltas que guarda el programa.
// Formatos (PERSONALIZAR): standard | compact | minimal | skins. Cantidad de vueltas: config.lapCompareLaps (3 a 8).
export default function LapCompare({ state, drivers, history, config, id = 'lapCompare' }) {
  const isVisible = !!state?.isVisible;
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 640, y: 880, scale: 1 });
  const format = config?.lapCompareFormat || 'standard';
  const f = getFormatStyles(format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const find = (num) => (drivers || []).find(d => String(d.number) === String(num)) || null;
  const a = find(state?.a);
  const b = find(state?.b);
  const pair = [a, b].filter(Boolean);
  const suit = useSuitColors(pair, config);
  const showPh = photosEnabled(config, id);
  const count = Math.min(8, Math.max(3, parseInt(config?.lapCompareLaps, 10) || 5));

  const lapsOf = (num) => {
    const map = {};
    ((history && history[String(num)]) || []).forEach(p => { if (Number.isFinite(p.seconds)) map[p.lap] = p.seconds; });
    return map;
  };
  const la = a ? lapsOf(a.number) : {};
  const lb = b ? lapsOf(b.number) : {};
  const laps = Object.keys(la).map(Number).sort((x, y) => x - y).slice(-count);
  const cols = Array.from({ length: count }, (_, i) => laps[i - (count - laps.length)]).map(v => (Number.isFinite(v) ? v : null));

  const COL = f.compact ? 72 : 88;
  const ROW = f.compact ? 32 : 38;
  const label = (d) => (
    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, padding: '0 10px' }}>
      <span style={{ width: '18px', color: theme.number, fontSize: '12px', fontWeight: 900 }}>{d.pos}</span>
      {showPh && <DriverPhoto number={d.number} config={config} height={ROW} maxWidth={40} style={{ marginRight: '6px' }} />}
      <span style={{ minWidth: '30px', textAlign: 'center', fontWeight: 900, fontSize: '13px', padding: '1px 5px', marginRight: '8px', borderRadius: '2px', backgroundColor: theme.secondary, color: '#000', ...(suit[String(d.number)] ? { backgroundColor: suit[String(d.number)].bg, color: suit[String(d.number)].text } : {}) }}>{d.number}</span>
      <span style={{ flex: 1, minWidth: 0, color: theme.text, fontWeight: 900, fontSize: f.compact ? '13px' : '15px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
      <BrandLogo brand={d.brand} config={config} size={f.compact ? 16 : 20} style={{ marginLeft: '6px' }} />
    </div>
  );

  return (
    <div style={wrapperStyle}>
      <div style={{ ...f.box, borderTop: 'none', width: `${300 + COL * count}px` }}>
        <div style={{ display: 'flex', height: '26px', alignItems: 'center', backgroundColor: theme.main, color: '#fff', fontWeight: 900, fontSize: '13px', letterSpacing: '1px' }}>
          <span style={{ flex: 1, textAlign: 'center' }}>ÚLTIMAS {count} VUELTAS<CategoryTag config={config} id={id} /></span>
          {cols.map((lap, i) => <span key={i} style={{ width: `${COL}px`, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.25)' }}>{lap ? `V${lap}` : `VTA${i + 1}`}</span>)}
        </div>
        {a && (
          <div style={{ display: 'flex', alignItems: 'center', height: `${ROW}px`, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            {label(a)}
            {cols.map((lap, i) => (
              <span key={i} style={{ width: `${COL}px`, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.text, fontWeight: 700, fontSize: f.compact ? '13px' : '15px', fontFamily: 'monospace', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                {lap ? fmt(la[lap]) : '-'}
              </span>
            ))}
          </div>
        )}
        {b && (
          <div style={{ display: 'flex', alignItems: 'center', height: `${ROW}px` }}>
            {label(b)}
            {cols.map((lap, i) => {
              const delta = lap && Number.isFinite(lb[lap]) ? lb[lap] - la[lap] : null;
              const bg = delta === null ? 'transparent' : (delta < 0 ? '#1e8e3e' : '#c62828');
              return (
                <span key={i} style={{ width: `${COL}px`, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: bg, color: '#fff', fontWeight: 900, fontSize: f.compact ? '13px' : '15px', fontFamily: 'monospace', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  {delta === null ? '-' : `${delta > 0 ? '+' : ''}${delta.toFixed(3)}`}
                </span>
              );
            })}
          </div>
        )}
        {!pair.length && <div style={{ padding: '10px', color: theme.number, fontSize: '12px' }}>Elegí dos pilotos en el PANEL.</div>}
      </div>
    </div>
  );
}
