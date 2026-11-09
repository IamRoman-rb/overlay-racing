import { getGraphicFrame } from '../utils/raceVisuals';
import CategoryTag from '../components/CategoryTag';

const W = 520;
const H = 150;
const PAD = { l: 44, r: 14, t: 12, b: 22 };

// BRECHA VUELTA A VUELTA entre dos pilotos (dato calculado en main.cjs con las pasadas por meta) y la predicción:
// cuánto descuenta por vuelta y en cuántas vueltas lo alcanza.
export default function GapChart({ data, config, id = 'gapChart', formatName = (n) => n }) {
  const isVisible = !!data?.isVisible;
  const { wrapperStyle, bRad, customBg, theme } = getGraphicFrame(config, id, isVisible, { x: 730, y: 640, scale: 1 });
  const series = (data?.series || []).slice(-25);
  const gaps = series.map(p => p.gap);
  const minY = Math.min(0, ...gaps);
  const maxY = Math.max(0, ...gaps, 0.5);
  const span = Math.max(0.5, maxY - minY) * 1.15;
  const top = maxY + (span - (maxY - minY)) / 2;
  const x = (i) => PAD.l + (series.length <= 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (series.length - 1));
  const y = (g) => PAD.t + ((top - g) / span) * (H - PAD.t - PAD.b);
  const points = series.map((p, i) => `${x(i).toFixed(1)},${y(p.gap).toFixed(1)}`).join(' ');

  const rate = data?.rate;
  const current = data?.current;
  let trendText = 'SIN DATOS SUFICIENTES TODAVÍA';
  let trendColor = theme.number;
  if (rate !== null && rate !== undefined) {
    if (rate < -0.02) { trendText = `SE ACERCA ${Math.abs(rate).toFixed(3)} s POR VUELTA`; trendColor = '#2ecc71'; }
    else if (rate > 0.02) { trendText = `SE ALEJA ${rate.toFixed(3)} s POR VUELTA`; trendColor = '#e74c3c'; }
    else { trendText = 'RITMO PAREJO'; }
  }

  return (
    <div style={wrapperStyle}>
      <div style={{
        width: `${W + 20}px`, boxSizing: 'border-box', borderRadius: bRad, overflow: 'hidden', padding: '0 0 10px',
        backgroundColor: customBg ? 'transparent' : theme.bg,
        backgroundImage: customBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
        borderTop: customBg ? 'none' : `4px solid ${theme.main}`, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', backgroundColor: customBg ? 'transparent' : theme.headerBg }}>
          <span style={{ color: theme.title, fontWeight: 900, fontSize: '13px', letterSpacing: '2px', marginRight: '12px', whiteSpace: 'nowrap' }}>BRECHA<CategoryTag config={config} id={id} block size="0.7em" /></span>
          <span style={{ flex: 1, color: theme.text, fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: theme.accent }}>P{data?.frontPos || '-'}</span> #{data?.front} {formatName(data?.frontName || '')}
            <span style={{ color: theme.number }}>{'  vs  '}</span>
            <span style={{ color: theme.accent }}>P{data?.backPos || '-'}</span> #{data?.back} {formatName(data?.backName || '')}
          </span>
        </div>
        <svg width={W + 20} height={H} viewBox={`0 0 ${W + 20} ${H}`} style={{ display: 'block' }}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
          <text x={PAD.l - 6} y={y(0) + 4} fill={theme.number} fontSize="10" textAnchor="end">0.0</text>
          <text x={PAD.l - 6} y={PAD.t + 8} fill={theme.number} fontSize="10" textAnchor="end">{top.toFixed(1)}</text>
          {series.length > 1 && <polyline points={points} fill="none" stroke={theme.accent} strokeWidth="3" strokeLinejoin="round" />}
          {series.map((p, i) => (
            <g key={p.lap}>
              <circle cx={x(i)} cy={y(p.gap)} r={i === series.length - 1 ? 5 : 3} fill={i === series.length - 1 ? theme.main : theme.accent} />
              {(series.length <= 12 || i % 2 === series.length % 2 || i === series.length - 1) && (
                <text x={x(i)} y={H - 6} fill={theme.number} fontSize="10" textAnchor="middle">V{p.lap}</text>
              )}
            </g>
          ))}
          {series.length === 0 && <text x={(W + 20) / 2} y={H / 2} fill={theme.number} fontSize="13" textAnchor="middle">Esperando pasadas por meta…</text>}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 14px', fontWeight: 'bold' }}>
          <span style={{ color: theme.title, fontSize: '12px' }}>
            BRECHA <span style={{ color: theme.text, fontSize: '20px', fontFamily: 'monospace' }}>{current === null || current === undefined ? '-' : `${current >= 0 ? '+' : ''}${current.toFixed(3)}`}</span>
          </span>
          <span style={{ color: trendColor, fontSize: '12px' }}>{trendText}</span>
        </div>
        <div style={{ display: data?.lapsToCatch ? 'block' : 'none', padding: '4px 14px 0', color: theme.accent, fontWeight: 900, fontSize: '14px', textAlign: 'right' }}>
          AL RITMO ACTUAL LO ALCANZA EN ~{data?.lapsToCatch} {data?.lapsToCatch === 1 ? 'VUELTA' : 'VUELTAS'}
        </div>
      </div>
    </div>
  );
}
