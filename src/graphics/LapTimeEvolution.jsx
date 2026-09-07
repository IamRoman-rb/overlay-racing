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

  // --- CAJA RECTANGULAR ANCHA Y BAJA ---
  const W = 420, H = 90;
  const PAD_LEFT = 30, PAD_RIGHT = 8, PAD_TOP = 6, PAD_BOTTOM = 6;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  let transformHidden = `scale(${pos.scale}) translateY(30px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;

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

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left', zIndex: 40, pointerEvents: 'none',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? `scale(${pos.scale}) translateY(0)` : transformHidden
    }}>
      <div style={{
        width: `${W}px`,
        backgroundColor: customBg ? 'transparent' : themeBg,
        backgroundImage: customBg ? `url(${customBg})` : 'none',
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        borderTop: customBg ? 'none' : `3px solid ${isFocusMode ? '#00e5ff' : themeMain}`,
        borderRadius: bRad,
        boxShadow: customBg ? 'none' : '0 6px 18px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          backgroundColor: customBg ? 'transparent' : themeHeaderBg,
          padding: '6px 12px', borderBottom: customBg ? 'none' : `1px solid ${isFocusMode ? '#00e5ff' : themeMain}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ color: themeTitleText, fontSize: '11px', fontWeight: '900', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isFocusMode ? `RITMO — #${focusDriver} ${getDriverName(focusDriver)}` : 'EVOLUCIÓN DE TIEMPOS DE VUELTA'}
          </span>

          {isFocusMode && focusStats && (
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', color: '#2ecc71', fontWeight: '900' }}>MEJOR {formatSeconds(focusStats.best)}</span>
              <span style={{ fontSize: '10px', color: themeAccent, fontWeight: '900' }}>ÚLTIMA {formatSeconds(focusStats.last)}</span>
              <span style={{ fontSize: '10px', color: '#e74c3c', fontWeight: '900' }}>PEOR {formatSeconds(focusStats.worst)}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', padding: '4px 8px', alignItems: 'center', gap: '10px' }}>
          <svg width={isFocusMode ? W - 16 : (W - 16) * 0.62} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', flexShrink: 0 }}>
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

          {!isFocusMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
              {topDriverNumbers.map((num, idx) => (
                <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: palette[idx % palette.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '9px', color: themeNormalText, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    #{num} {getDriverName(num)}
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