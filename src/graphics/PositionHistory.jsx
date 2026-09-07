export default function PositionHistory({ history, drivers, config, isVisible, focusDriver, id = 'positionHistory' }) {
  const pos = config?.positions?.[id] || { x: 100, y: 100, scale: 1 };
  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.88)';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeAccent = config?.themeAccent || '#f39c12';

  const customBg = config?.[`design_${id}`];
  const bRad = config?.[`borderRadius_${id}`] || '8px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';

  const W = 620, H = 380;
  const PAD_LEFT = 45, PAD_RIGHT = 20, PAD_TOP = 20, PAD_BOTTOM = 35;
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

  // --- Determinar qué pilotos graficar ---
  let driverNumbers;
  if (isFocusMode) {
    driverNumbers = [focusDriver];
  } else {
    driverNumbers = Object.keys(historyData).filter(num => historyData[num] && historyData[num].length > 0);
  }

  const topDriverNumbers = isFocusMode
    ? driverNumbers
    : [...driverNumbers]
        .sort((a, b) => {
          const lastA = historyData[a][historyData[a].length - 1];
          const lastB = historyData[b][historyData[b].length - 1];
          return (lastA?.pos || 99) - (lastB?.pos || 99);
        })
        .slice(0, 8);

  if (topDriverNumbers.length === 0) return null;

  const maxLap = Math.max(1, ...topDriverNumbers.flatMap(num => historyData[num].map(p => p.lap)));
  const maxPos = Math.max(1, ...topDriverNumbers.flatMap(num => historyData[num].map(p => p.pos)));

  const xScale = (lap) => PAD_LEFT + (maxLap <= 1 ? 0 : ((lap - 1) / (maxLap - 1)) * chartW);
  const yScale = (posValue) => PAD_TOP + ((posValue - 1) / Math.max(1, maxPos - 1)) * chartH;

  // Estadísticas rápidas del piloto enfocado (mejor posición, peor posición, posición actual)
  let focusStats = null;
  if (isFocusMode) {
    const points = historyData[focusDriver];
    const positionsOnly = points.map(p => p.pos);
    focusStats = {
      best: Math.min(...positionsOnly),
      worst: Math.max(...positionsOnly),
      current: points[points.length - 1]?.pos
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
        borderTop: customBg ? 'none' : `4px solid ${isFocusMode ? '#9b59b6' : themeMain}`,
        borderRadius: bRad,
        boxShadow: customBg ? 'none' : '0 10px 30px rgba(0,0,0,0.7)',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: customBg ? 'transparent' : themeHeaderBg,
          padding: '10px 20px', borderBottom: customBg ? 'none' : `2px solid ${isFocusMode ? '#9b59b6' : themeMain}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ color: themeTitleText, fontSize: '16px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {isFocusMode ? `EVOLUCIÓN — #${focusDriver} ${getDriverName(focusDriver)}` : 'EVOLUCIÓN DE POSICIONES'}
          </span>
          {isFocusMode && focusStats && (
            <div style={{ display: 'flex', gap: '15px' }}>
              <span style={{ fontSize: '11px', color: '#2ecc71', fontWeight: '900' }}>MEJOR P{focusStats.best}</span>
              <span style={{ fontSize: '11px', color: themeAccent, fontWeight: '900' }}>ACTUAL P{focusStats.current}</span>
              <span style={{ fontSize: '11px', color: '#e74c3c', fontWeight: '900' }}>PEOR P{focusStats.worst}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', padding: '15px' }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
            {Array.from({ length: maxPos }).map((_, i) => {
              const p = i + 1;
              return (
                <g key={`grid-${p}`}>
                  <line
                    x1={PAD_LEFT} y1={yScale(p)} x2={W - PAD_RIGHT} y2={yScale(p)}
                    stroke="rgba(255,255,255,0.08)" strokeWidth="1"
                  />
                  <text x={PAD_LEFT - 10} y={yScale(p) + 4} textAnchor="end" fontSize="12" fill="rgba(255,255,255,0.5)" fontWeight="bold">
                    P{p}
                  </text>
                </g>
              );
            })}

            {Array.from({ length: maxLap }).map((_, i) => {
              const lap = i + 1;
              if (maxLap > 15 && lap % Math.ceil(maxLap / 15) !== 0 && lap !== maxLap && lap !== 1) return null;
              return (
                <text key={`lap-${lap}`} x={xScale(lap)} y={H - PAD_BOTTOM + 20} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)">
                  {lap}
                </text>
              );
            })}
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.4)" fontWeight="bold" letterSpacing="1">
              VUELTA
            </text>

            {topDriverNumbers.map((num, idx) => {
              const points = historyData[num];
              const color = isFocusMode ? themeAccent : palette[idx % palette.length];
              const strokeW = isFocusMode ? 4 : 3;
              const pathPoints = points.map(p => `${xScale(p.lap)},${yScale(p.pos)}`).join(' ');
              const last = points[points.length - 1];

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
                    <circle key={i} cx={xScale(p.lap)} cy={yScale(p.pos)} r={isFocusMode ? 5 : 3.5} fill={color} />
                  ))}
                  {last && (
                    <g>
                      <circle cx={xScale(last.lap)} cy={yScale(last.pos)} r={isFocusMode ? 8 : 6} fill={color} stroke="#000" strokeWidth="1.5" />
                      {!isFocusMode && (
                        <text
                          x={xScale(last.lap) + 10} y={yScale(last.pos) + 4}
                          fontSize="13" fontWeight="900" fill={color}
                        >
                          #{num}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {!isFocusMode && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '0 15px 15px' }}>
            {topDriverNumbers.map((num, idx) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: palette[idx % palette.length] }} />
                <span style={{ fontSize: '12px', color: themeNormalText, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  #{num} {getDriverName(num)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}