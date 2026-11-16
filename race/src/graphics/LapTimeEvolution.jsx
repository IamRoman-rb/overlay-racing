import { getSkinStyle } from '../utils/skinStyles';
import Icon from '../components/Icon';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import CategoryTag from '../components/CategoryTag';
import SuitNumber from '../components/SuitNumber';
import DriverPhoto from '../components/DriverPhoto';
import { photosEnabled } from '../utils/photos';
import { makeFx } from '../utils/contentAnim';

export default function LapTimeEvolution({ history, drivers, config, isVisible, focusDriver, id = 'lapTimesHistory' }) {
  const pos = config?.positions?.[id] || { x: 100, y: 500, scale: 1 };
  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.88)';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeAccent = config?.themeAccent || '#00e5ff';

  const customBg = config?.[`design_${id}`];
  const bRad = config?.[`borderRadius_${id}`] || '8px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const chartFormat = config?.lapTimesHistoryFormat || 'standard';
  const isCompact = chartFormat === 'compact';
  const isLarge = chartFormat === 'large';
  const isMinimal = chartFormat === 'minimal';
  const isTable = chartFormat === 'table';
  const isCards = chartFormat === 'photoCards';
  const skin = getSkinStyle(chartFormat, { themeMain, themeAccent });
  const fx = makeFx(config, id, isVisible, 0.25);
  const showPh = photosEnabled(config, id) || isCards;
  const transparent = !!customBg || isMinimal;

  // --- CAJA RECTANGULAR ANCHA Y BAJA (el tamaño varía según el formato) ---
  const W = isLarge ? 560 : (isCompact ? 320 : 420);
  const H = isLarge ? 130 : (isCompact ? 70 : 90);
  const PAD_LEFT = 30, PAD_RIGHT = 8, PAD_TOP = 6, PAD_BOTTOM = 6;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  let transformHidden = `scale(${pos.scale}) translateY(30px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const historyData = history || {};
  const isFocusMode = !!focusDriver && !!historyData[focusDriver] && historyData[focusDriver].length > 0;

  const palette = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#ff6b9d', '#00e5ff'];

  const getDriverName = (num) => {
    const d = drivers?.find(dr => String(dr.number) === String(num));
    return d?.name || `#${num}`;
  };

  const formatSeconds = (secs) => {
    if (secs === null || secs === undefined) return '-';
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(3);
    return m > 0 ? `${m}:${s.padStart(6, '0')}` : s;
  };

  let driverNumbers;
  if (isFocusMode) {
    driverNumbers = [focusDriver];
  } else {
    driverNumbers = Object.keys(historyData).filter(num => historyData[num] && historyData[num].length > 0);
  }

  const topDriverNumbers = isFocusMode
    ? driverNumbers
    : driverNumbers.filter(num => historyData[num].length >= 2).slice(0, 4);

  if (topDriverNumbers.length === 0) return null;

  const allSeconds = topDriverNumbers.flatMap(num => historyData[num].map(p => p.seconds));
  const maxLap = Math.max(1, ...topDriverNumbers.flatMap(num => historyData[num].map(p => p.lap)));
  const minSec = Math.min(...allSeconds);
  const maxSec = Math.max(...allSeconds);
  const secRange = Math.max(0.001, maxSec - minSec);
  const secPad = secRange * 0.15 || 1;

  const xScale = (lap) => PAD_LEFT + (maxLap <= 1 ? 0 : ((lap - 1) / (maxLap - 1)) * chartW);
  const yScale = (secs) => PAD_TOP + ((secs - (minSec - secPad)) / (secRange + secPad * 2)) * chartH;

  let focusStats = null;
  if (isFocusMode) {
    const points = historyData[focusDriver];
    const secondsOnly = points.map(p => p.seconds);
    focusStats = {
      best: Math.min(...secondsOnly),
      worst: Math.max(...secondsOnly),
      last: points[points.length - 1]?.seconds
    };
  }

  // FORMATO TABLA: "últimas N vueltas" estilo transmisión TV — el líder muestra el tiempo
  // absoluto de cada vuelta y el resto la diferencia contra él, vuelta por vuelta.
  if (isTable || isCards) {
    const formatDelta = (secs) => {
      if (secs === null || secs === undefined) return '-';
      const sign = secs > 0 ? '+' : (secs < 0 ? '-' : '');
      return `${sign}${Math.abs(secs).toFixed(3)}`;
    };

    const rows = topDriverNumbers
      .map(num => ({ num, driver: drivers?.find(d => String(d.number) === String(num)), points: historyData[num] || [] }))
      .sort((a, b) => {
        const pa = a.driver?.pos ? parseInt(a.driver.pos, 10) : 999;
        const pb = b.driver?.pos ? parseInt(b.driver.pos, 10) : 999;
        return pa - pb;
      });

    const lapCols = Math.min(4, maxLap);
    const lapNumbers = Array.from({ length: lapCols }, (_, i) => maxLap - lapCols + 1 + i);
    const leaderPoints = rows[0]?.points || [];
    const getSecondsForLap = (points, lap) => points.find(p => p.lap === lap)?.seconds ?? null;

    const NAME_W = showPh ? 210 : 150;
    const TABLE_W = NAME_W + lapCols * 110;

    // FORMATO TARJETAS CON FOTO: una tarjeta por piloto (foto, posición, número y nombre) con sus últimas vueltas
    // apiladas; la mejor de las mostradas en verde. Las tarjetas entran con la aparición de filas configurada.
    if (isCards) {
      const CARD_W = 190;
      return (
        <div style={{
          position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
          transformOrigin: 'top left', zIndex: 40, pointerEvents: 'none',
          transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
          opacity: isVisible || animStyle === 'roll' ? 1 : 0,
          transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible)
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 14px', marginBottom: '8px',
            backgroundColor: themeHeaderBg, borderLeft: `4px solid ${themeMain}`, borderRadius: bRad, ...fx.wipe(0)
          }}>
            {config?.logo && <img src={config.logo} alt="Logo" style={{ height: '20px', maxWidth: '90px', objectFit: 'contain', ...fx.icon(1) }} />}
            <span style={{ display: 'inline-block', color: themeNormalText, fontSize: '14px', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase', ...fx.text(1) }}>
              ÚLTIMAS {lapCols} VUELTAS<CategoryTag config={config} id={id} />
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            {rows.map((row, i) => {
              const shown = lapNumbers.map(lap => ({ lap, secs: getSecondsForLap(row.points, lap) }));
              const valid = shown.filter(x => x.secs !== null).map(x => x.secs);
              const best = valid.length ? Math.min(...valid) : null;
              return (
                <div key={row.num} style={{
                  width: `${CARD_W}px`, borderRadius: bRad, overflow: 'hidden',
                  backgroundColor: skin ? skin.background : (customBg ? 'transparent' : themeBg),
                  backgroundImage: customBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'), backgroundSize: '100% 100%',
                  border: skin ? skin.border : 'none', borderTop: skin ? skin.border : `4px solid ${i === 0 ? themeAccent : themeMain}`,
                  boxShadow: skin ? skin.boxShadow : '0 8px 20px rgba(0,0,0,0.55)', backdropFilter: skin?.backdropFilter,
                  ...fx.row(i, rows.length, 0.35)
                }}>
                  <div style={{ position: 'relative', height: '120px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: `linear-gradient(to top, ${themeHeaderBg}, transparent)` }}>
                    <span style={{ position: 'absolute', top: '6px', left: '10px', color: themeTitleText, fontSize: '30px', fontWeight: 900, lineHeight: 1, textShadow: '2px 2px 6px rgba(0,0,0,0.8)', ...fx.num(i + 1) }}>{row.driver?.pos || '-'}</span>
                    <span style={{ position: 'absolute', top: '8px', right: '10px', ...fx.icon(i + 1) }}><SuitNumber number={row.num} config={config} chip prefix="" style={{ display: 'inline-block', backgroundColor: config?.themeSecondary || '#3498db', color: '#000', padding: '2px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '15px' }} /></span>
                    <DriverPhoto number={row.num} config={config} height={116} maxWidth={CARD_W - 20} fade style={fx.photo(i + 2)} />
                  </div>
                  <div style={{ padding: '6px 10px', backgroundColor: themeHeaderBg, color: themeNormalText, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom', ...fx.text(i + 2) }}>{row.driver?.name || `#${row.num}`}</span>
                  </div>
                  <div style={{ padding: '4px 0 6px' }}>
                    {shown.map((x, li) => (
                      <div key={x.lap} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 10px', ...fx.slide(i + 3 + li) }}>
                        <span style={{ color: themeAccent, fontSize: '11px', fontWeight: 900, letterSpacing: '0.5px' }}>V{x.lap}</span>
                        <span style={{ color: x.secs !== null && x.secs === best ? '#2ecc71' : themeNormalText, fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace' }}>{formatSeconds(x.secs)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transformOrigin: 'top left', zIndex: 40, pointerEvents: 'none',
        transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
        opacity: isVisible || animStyle === 'roll' ? 1 : 0,
        transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible)
      }}>
        <div style={{
          width: `${TABLE_W}px`,
          backgroundColor: skin ? skin.background : (transparent ? 'transparent' : themeBg),
          backgroundImage: customBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: skin ? skin.border : 'none',
          borderRadius: bRad, overflow: 'hidden',
          boxShadow: skin ? skin.boxShadow : (transparent ? 'none' : '0 6px 18px rgba(0,0,0,0.6)'),
          backdropFilter: skin?.backdropFilter
        }}>
          {/* BARRA SUPERIOR: LOGO + ETIQUETA */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px',
            backgroundColor: skin ? 'transparent' : themeHeaderBg
          }}>
            {config?.logo && <img src={config.logo} alt="Logo" style={{ height: '20px', maxWidth: '90px', objectFit: 'contain', ...fx.icon(0) }} />}
            <span style={{ display: 'inline-block', color: themeNormalText, fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px', textTransform: 'uppercase', ...fx.text(1) }}>
              ÚLTIMAS {lapCols} VUELTAS<CategoryTag config={config} id={id} />
            </span>
          </div>

          {/* ENCABEZADO DE VUELTAS */}
          <div style={{ display: 'flex', borderBottom: `2px solid ${themeMain}` }}>
            <div style={{ width: `${NAME_W}px`, flexShrink: 0 }} />
            {lapNumbers.map((lap, li) => (
              <div key={lap} style={{
                width: '110px', boxSizing: 'border-box', flexShrink: 0, textAlign: 'center', padding: '6px 4px',
                color: themeAccent, fontSize: '12px', fontWeight: '900', letterSpacing: '0.5px', ...fx.text(2 + li)
              }}>
                VUELTA {lap}
              </div>
            ))}
          </div>

          {/* FILAS DE PILOTOS */}
          {rows.map((row, i) => {
            const isLeaderRow = i === 0;
            const last = row.points[row.points.length - 1];
            const prev = row.points[row.points.length - 2];
            let trendColor = themeNormalText;
            let trendArrow = <span>—</span>;
            if (last && prev) {
              if (last.seconds < prev.seconds) { trendColor = '#2ecc71'; trendArrow = <Icon name="trending_up" size="1.3em" />; }
              else if (last.seconds > prev.seconds) { trendColor = '#e74c3c'; trendArrow = <Icon name="trending_down" size="1.3em" />; }
            }

            return (
              <div key={row.num} style={{
                display: 'flex', alignItems: 'center',
                borderBottom: i === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                ...fx.row(i, rows.length, 0.45)
              }}>
                <div style={{ width: `${NAME_W}px`, boxSizing: 'border-box', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: showPh ? '2px 10px 0' : '8px 10px', minWidth: 0 }}>
                  <span style={{ color: themeTitleText, fontSize: '13px', fontWeight: '900', width: '16px', flexShrink: 0 }}>{row.driver?.pos || '-'}</span>
                  <span style={{ color: trendColor, fontSize: '13px', fontWeight: '900', flexShrink: 0 }}>{trendArrow}</span>
                  {showPh && <DriverPhoto number={row.num} config={config} height={40} maxWidth={44} fade style={{ flexShrink: 0, alignSelf: 'flex-end', ...fx.photo(i + 1) }} />}
                  <span style={{
                    color: themeNormalText, fontSize: '13px', fontWeight: '900', textTransform: 'uppercase',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>{row.driver?.name || `#${row.num}`}</span>
                </div>

                {lapNumbers.map(lap => {
                  const secs = getSecondsForLap(row.points, lap);
                  if (isLeaderRow) {
                    return (
                      <div key={lap} style={{ width: '110px', boxSizing: 'border-box', flexShrink: 0, textAlign: 'center', padding: '8px 4px', color: themeNormalText, fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatSeconds(secs)}
                      </div>
                    );
                  }
                  const leaderSecs = getSecondsForLap(leaderPoints, lap);
                  const delta = (secs !== null && leaderSecs !== null) ? secs - leaderSecs : null;
                  const deltaColor = delta === null ? themeNormalText : (delta < 0 ? '#2ecc71' : (delta > 0 ? '#e74c3c' : themeNormalText));
                  return (
                    <div key={lap} style={{ width: '110px', boxSizing: 'border-box', flexShrink: 0, textAlign: 'center', padding: '8px 4px', color: deltaColor, fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {formatDelta(delta)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left', zIndex: 40, pointerEvents: 'none',
      transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
      opacity: isVisible || animStyle === 'roll' ? 1 : 0,
      transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible)
    }}>
      {isMinimal && (
        <span style={{ display: 'block', color: themeTitleText, fontSize: '11px', fontWeight: '900', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' , ...fx.text(0) }}>
          {isFocusMode ? `RITMO — #${focusDriver} ${getDriverName(focusDriver)}` : 'EVOLUCIÓN DE TIEMPOS DE VUELTA'}<CategoryTag config={config} id={id} />
        </span>
      )}
      <div style={{
        width: `${W}px`,
        backgroundColor: skin ? skin.background : (transparent ? 'transparent' : themeBg),
        backgroundImage: customBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        border: skin ? skin.border : 'none',
        borderTop: skin ? skin.border : (transparent ? 'none' : `3px solid ${isFocusMode ? '#00e5ff' : themeMain}`),
        borderRadius: bRad,
        boxShadow: skin ? skin.boxShadow : (transparent ? 'none' : '0 6px 18px rgba(0,0,0,0.6)'),
        backdropFilter: skin?.backdropFilter,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {!isMinimal && (
          <div style={{
            backgroundColor: skin ? 'transparent' : (customBg ? 'transparent' : themeHeaderBg),
            padding: isCompact ? '4px 10px' : '6px 12px', borderBottom: customBg ? 'none' : `1px solid ${isFocusMode ? '#00e5ff' : themeMain}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ color: themeTitleText, fontSize: isLarge ? '13px' : '11px', fontWeight: '900', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' , ...fx.text(0) }}>
              {isFocusMode ? `RITMO — #${focusDriver} ${getDriverName(focusDriver)}` : (isCompact ? 'TIEMPOS' : 'EVOLUCIÓN DE TIEMPOS DE VUELTA')}<CategoryTag config={config} id={id} />
            </span>

            {isFocusMode && focusStats && !isCompact && (
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', color: '#2ecc71', fontWeight: '900' }}>MEJOR {formatSeconds(focusStats.best)}</span>
                <span style={{ fontSize: '10px', color: themeAccent, fontWeight: '900' }}>ÚLTIMA {formatSeconds(focusStats.last)}</span>
                <span style={{ fontSize: '10px', color: '#e74c3c', fontWeight: '900' }}>PEOR {formatSeconds(focusStats.worst)}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', padding: '4px 8px', alignItems: 'center', gap: '10px' }}>
          <svg width={(isFocusMode || isCompact) ? W - 16 : (W - 16) * 0.62} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', flexShrink: 0 }}>
            <line x1={PAD_LEFT} y1={yScale(minSec)} x2={W - PAD_RIGHT} y2={yScale(minSec)} stroke="rgba(46,204,113,0.25)" strokeWidth="1" strokeDasharray="2,2" />
            <text x={PAD_LEFT - 4} y={yScale(minSec) + 3} textAnchor="end" fontSize="8" fill="rgba(46,204,113,0.8)" fontWeight="bold">
              {formatSeconds(minSec)}
            </text>

            {topDriverNumbers.map((num, idx) => {
              const points = historyData[num];
              const color = isFocusMode ? themeAccent : palette[idx % palette.length];
              const strokeW = isFocusMode ? 2.5 : 2;
              const pathPoints = points.map(p => `${xScale(p.lap)},${yScale(p.seconds)}`).join(' ');
              const last = points[points.length - 1];
              const bestPoint = points.reduce((best, p) => (p.seconds < best.seconds ? p : best), points[0]);

              return (
                <g key={num}>
                  <polyline
                    points={pathPoints}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength="1"
                    style={fx.draw(idx)}
                  />
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={xScale(p.lap)} cy={yScale(p.seconds)}
                      r={p === bestPoint ? 3 : 2}
                      fill={p === bestPoint ? '#2ecc71' : color}
                    />
                  ))}
                  {last && !isFocusMode && (
                    <circle cx={xScale(last.lap)} cy={yScale(last.seconds)} r="3.5" fill={color} stroke="#000" strokeWidth="1" />
                  )}
                </g>
              );
            })}
          </svg>

          {!isFocusMode && !isCompact && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
              {topDriverNumbers.map((num, idx) => (
                <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '4px', ...fx.row(idx, topDriverNumbers.length, 0.4) }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: palette[idx % palette.length], flexShrink: 0 }} />
                  <span style={{ fontSize: isLarge ? '11px' : '9px', color: themeNormalText, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <SuitNumber number={num} config={config} /> {getDriverName(num)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}