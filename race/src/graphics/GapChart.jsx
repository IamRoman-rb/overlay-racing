import { getGraphicFrame, getFormatStyles } from '../utils/raceVisuals';
import CategoryTag from '../components/CategoryTag';
import DriverPhoto, { photosEnabled } from '../components/DriverPhoto';

const PAD = { l: 44, r: 14, t: 12, b: 22 };

// Coordenadas del gráfico de la brecha para un tamaño dado
function chartGeometry(series, W, H, pad) {
  const gaps = series.map(p => p.gap);
  const minY = Math.min(0, ...gaps);
  const maxY = Math.max(0, ...gaps, 0.5);
  const span = Math.max(0.5, maxY - minY) * 1.15;
  const top = maxY + (span - (maxY - minY)) / 2;
  const x = (i) => pad.l + (series.length <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (series.length - 1));
  const y = (g) => pad.t + ((top - g) / span) * (H - pad.t - pad.b);
  return { x, y, top, points: series.map((p, i) => `${x(i).toFixed(1)},${y(p.gap).toFixed(1)}`).join(' ') };
}

// BRECHA VUELTA A VUELTA entre dos pilotos (dato calculado en main.cjs con las pasadas por meta) y la predicción:
// cuánto descuenta por vuelta y en cuántas vueltas lo alcanza.
// Formatos (PERSONALIZAR): standard | compact (sin gráfico) | duel (los dos pilotos enfrentados) | minimal | skins.
export default function GapChart({ data, config, id = 'gapChart', formatName = (n) => n }) {
  const isVisible = !!data?.isVisible;
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 730, y: 640, scale: 1 });
  const format = config?.gapChartFormat || 'standard';
  const f = getFormatStyles(format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const ts = f.textShadow;
  const showPh = photosEnabled(config, id);
  const series = (data?.series || []).slice(-25);

  const rate = data?.rate;
  const current = data?.current;
  let trendText = 'SIN DATOS SUFICIENTES TODAVÍA';
  let trendShort = '—';
  let trendColor = theme.number;
  if (rate !== null && rate !== undefined) {
    if (rate < -0.02) { trendText = `SE ACERCA ${Math.abs(rate).toFixed(3)} s POR VUELTA`; trendShort = `▼ ${Math.abs(rate).toFixed(2)} s/V`; trendColor = '#2ecc71'; }
    else if (rate > 0.02) { trendText = `SE ALEJA ${rate.toFixed(3)} s POR VUELTA`; trendShort = `▲ ${rate.toFixed(2)} s/V`; trendColor = '#e74c3c'; }
    else { trendText = 'RITMO PAREJO'; trendShort = '= PAREJO'; }
  }
  const gapText = current === null || current === undefined ? '-' : `${current >= 0 ? '+' : ''}${current.toFixed(3)}`;
  const catchText = data?.lapsToCatch ? `LO ALCANZA EN ~${data.lapsToCatch} ${data.lapsToCatch === 1 ? 'VUELTA' : 'VUELTAS'}` : '';
  const front = { pos: data?.frontPos || '-', num: data?.front, name: formatName(data?.frontName || '') };
  const back = { pos: data?.backPos || '-', num: data?.back, name: formatName(data?.backName || '') };

  const renderChart = (W, H, pad, { labels = true, dots = true } = {}) => {
    const g = chartGeometry(series, W, H, pad);
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <line x1={pad.l} x2={W - pad.r} y1={g.y(0)} y2={g.y(0)} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
        {labels && <text x={pad.l - 6} y={g.y(0) + 4} fill={theme.number} fontSize="10" textAnchor="end">0.0</text>}
        {labels && <text x={pad.l - 6} y={pad.t + 8} fill={theme.number} fontSize="10" textAnchor="end">{g.top.toFixed(1)}</text>}
        {series.length > 1 && <polyline points={g.points} fill="none" stroke={theme.accent} strokeWidth="3" strokeLinejoin="round" />}
        {series.map((p, i) => (
          <g key={p.lap}>
            {(dots || i === series.length - 1) && <circle cx={g.x(i)} cy={g.y(p.gap)} r={i === series.length - 1 ? 5 : 3} fill={i === series.length - 1 ? theme.main : theme.accent} />}
            {labels && (series.length <= 12 || i % 2 === series.length % 2 || i === series.length - 1) && (
              <text x={g.x(i)} y={H - 6} fill={theme.number} fontSize="10" textAnchor="middle">V{p.lap}</text>
            )}
          </g>
        ))}
        {series.length === 0 && <text x={W / 2} y={H / 2} fill={theme.number} fontSize="13" textAnchor="middle">Esperando pasadas por meta…</text>}
      </svg>
    );
  };

  const driverTag = (d, align) => (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {showPh && <DriverPhoto number={d.num} config={config} height={96} maxWidth={130} fade style={{ marginBottom: '4px' }} />}
      <span style={{ display: 'flex', alignItems: 'center', flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        <span style={{ color: theme.accent, fontWeight: 900, fontSize: '18px', margin: '0 6px', textShadow: ts }}>P{d.pos}</span>
        <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '14px', padding: '2px 7px', borderRadius: '3px' }}>{d.num}</span>
      </span>
      <span style={{ color: theme.text, fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', marginTop: '4px', textShadow: ts }}>{d.name}</span>
    </div>
  );

  // COMPACTO: una sola fila con los dos pilotos, la brecha y la tendencia
  if (f.compact) {
    return (
      <div style={wrapperStyle}>
        <div style={{ ...f.box, width: '560px', display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
          <span style={{ color: theme.title, fontWeight: 900, fontSize: '11px', letterSpacing: '2px', marginRight: '12px', whiteSpace: 'nowrap' }}>BRECHA<CategoryTag config={config} id={id} block size="0.8em" /></span>
          <span style={{ flex: 1, minWidth: 0, color: theme.text, fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            #{front.num} {front.name} <span style={{ color: theme.number }}>vs</span> #{back.num} {back.name}
          </span>
          <span style={{ color: theme.text, fontWeight: 900, fontSize: '20px', fontFamily: 'monospace', margin: '0 12px' }}>{gapText}</span>
          <span style={{ color: trendColor, fontWeight: 900, fontSize: '12px', whiteSpace: 'nowrap' }}>{trendShort}</span>
        </div>
      </div>
    );
  }

  // DUELO: los dos pilotos enfrentados, la brecha grande en el medio y un mini gráfico debajo
  if (format === 'duel') {
    return (
      <div style={wrapperStyle}>
        <div style={{ ...f.box, width: '600px', padding: '0 0 10px' }}>
          <div style={{ padding: '6px 14px', backgroundColor: f.headerBg, borderBottom: f.headerBorder, color: theme.title, fontWeight: 900, fontSize: '12px', letterSpacing: '2px', textAlign: 'center' }}>
            BRECHA VUELTA A VUELTA<CategoryTag config={config} id={id} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 4px' }}>
            {driverTag(front, 'left')}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 14px' }}>
              <span style={{ color: theme.text, fontWeight: 900, fontSize: '34px', fontFamily: 'monospace', lineHeight: 1, textShadow: ts }}>{gapText}</span>
              <span style={{ color: trendColor, fontWeight: 900, fontSize: '12px', marginTop: '4px' }}>{trendShort}</span>
            </div>
            {driverTag(back, 'right')}
          </div>
          {renderChart(600, 70, { l: 16, r: 16, t: 8, b: 8 }, { labels: false, dots: false })}
          <div style={{ display: catchText ? 'block' : 'none', textAlign: 'center', color: theme.accent, fontWeight: 900, fontSize: '13px', marginTop: '4px' }}>{catchText}</div>
        </div>
      </div>
    );
  }

  // CLÁSICO / MINIMALISTA / SKINS: gráfico completo
  const W = 520;
  return (
    <div style={wrapperStyle}>
      <div style={{ ...f.box, width: `${W + 20}px`, padding: '0 0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', backgroundColor: f.headerBg, borderBottom: f.headerBorder }}>
          <span style={{ color: theme.title, fontWeight: 900, fontSize: '13px', letterSpacing: '2px', marginRight: '12px', whiteSpace: 'nowrap', textShadow: ts }}>BRECHA<CategoryTag config={config} id={id} block size="0.7em" /></span>
          <span style={{ flex: 1, color: theme.text, fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: ts }}>
            <span style={{ color: theme.accent }}>P{front.pos}</span> #{front.num} {front.name}
            <span style={{ color: theme.number }}>{'  vs  '}</span>
            <span style={{ color: theme.accent }}>P{back.pos}</span> #{back.num} {back.name}
          </span>
        </div>
        {renderChart(W + 20, 150, PAD)}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 14px', fontWeight: 'bold', textShadow: ts }}>
          <span style={{ color: theme.title, fontSize: '12px' }}>
            BRECHA <span style={{ color: theme.text, fontSize: '20px', fontFamily: 'monospace' }}>{gapText}</span>
          </span>
          <span style={{ color: trendColor, fontSize: '12px' }}>{trendText}</span>
        </div>
        <div style={{ display: catchText ? 'block' : 'none', padding: '4px 14px 0', color: theme.accent, fontWeight: 900, fontSize: '14px', textAlign: 'right', textShadow: ts }}>
          AL RITMO ACTUAL {catchText}
        </div>
      </div>
    </div>
  );
}
