// Pestaña CIRCUITO > CLIMA EN PISTA: lo que necesita la gráfica CONDICIONES DE PISTA y que no sale del trazado.
//   - Norte del mapa (config.trackNorth): para saber cómo le pega el viento a cada tramo
//   - Zonas de sombra (config.trackShade: [{ t, w }]): el asfalto se estima más fresco ahí
//   - Mediciones (config.trackTempPoints: [{ id, t, temp }]): temperatura del asfalto medida en la pista
// Panel izquierdo (CondControls) + capa sobre el lienzo del circuito (CondOverlay), en coordenadas % de la imagen.
import { useMemo } from 'react';
import Icon from '../components/Icon';
import { buildTrack, DEFAULT_ASPECT } from '../utils/trackPath';
import { analyzeTrack, travelReversed, northAngle, windAlongColor, shadeAt, estimateTrackTemp, lapDist, SHADE_W } from '../utils/trackConditions';

export function CondControls({ config, onConfigChange, tool, setTool, hasPath, colors, inputStyle, btnStyle, t }) {
  const north = northAngle(config);
  const zones = Array.isArray(config?.trackShade) ? config.trackShade : [];
  const pts = Array.isArray(config?.trackTempPoints) ? config.trackTempPoints : [];
  const wd = config?.weatherData;
  const est = estimateTrackTemp(wd);
  const smallBtn = { ...btnStyle(false), flex: 1, padding: '8px', fontSize: '10px' };
  const row = { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '4px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}` };
  const pct = (v) => `${Math.round(v * 100)}%`;

  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: '11px', color: hasPath ? colors.textMuted : '#e67e22', marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }}>{hasPath ? t('circuito.condInstructions') : t('circuito.curvesNeedPath')}</p>

      <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.yellow, margin: '6px 0' }}>{t('circuito.condNorth')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <button onClick={() => onConfigChange?.('trackNorth', (north + 345) % 360)} style={{ ...smallBtn, flex: 'none', padding: '6px 9px' }}>↺</button>
        <input type="range" min="0" max="359" step="1" value={north} onChange={(e) => onConfigChange?.('trackNorth', Number(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
        <button onClick={() => onConfigChange?.('trackNorth', (north + 15) % 360)} style={{ ...smallBtn, flex: 'none', padding: '6px 9px' }}>↻</button>
        <span style={{ width: '36px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: colors.textMain }}>{north}°</span>
      </div>
      <p style={{ fontSize: '10px', color: wd ? colors.textMuted : '#e67e22', lineHeight: 1.4, marginTop: 0 }}>{wd ? t('circuito.condPreview') : t('circuito.condNoWeather')}</p>
      {est !== null && <p style={{ fontSize: '10px', color: colors.textMain, lineHeight: 1.4, marginTop: 0 }}>{t('circuito.condEstimate', { t: Math.round(est), a: Math.round(wd.temp) })}</p>}

      <div style={{ display: 'flex', gap: '5px', margin: '12px 0 8px' }}>
        <button onClick={() => setTool('shade')} style={{ ...smallBtn, ...(tool === 'shade' ? { backgroundColor: colors.green, color: '#000', borderColor: colors.green } : {}) }}>{t('circuito.condToolShade')}</button>
        <button onClick={() => setTool('temp')} style={{ ...smallBtn, ...(tool === 'temp' ? { backgroundColor: colors.green, color: '#000', borderColor: colors.green } : {}) }}>{t('circuito.condToolTemp')}</button>
      </div>
      <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: 1.4, marginTop: 0 }}>{tool === 'temp' ? t('circuito.condTempHint') : t('circuito.condShadeHint')}</p>

      {tool === 'shade' && (
        <>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.yellow, margin: '8px 0 6px' }}>{t('circuito.condShadeZones', { n: zones.length })}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {zones.map((z, i) => (
              <div key={i} style={row}>
                <span style={{ fontSize: '11px', color: colors.textMain, width: '38px' }}>{pct(z.t)}</span>
                <span style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t('circuito.condWidth')}</span>
                <input type="range" min="0.01" max="0.12" step="0.005" value={Number(z.w) || SHADE_W}
                  onChange={(e) => onConfigChange?.('trackShade', zones.map((q, k) => (k === i ? { ...q, w: Number(e.target.value) } : q)))} style={{ flex: 1, cursor: 'pointer' }} />
                <button onClick={() => onConfigChange?.('trackShade', zones.filter((_, k) => k !== i))} style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 7px', fontSize: '10px', cursor: 'pointer' }}><Icon name="close" /></button>
              </div>
            ))}
          </div>
          {zones.length > 0 && <button onClick={() => onConfigChange?.('trackShade', [])} style={{ ...smallBtn, width: '100%', marginTop: '8px', backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('circuito.condClear')}</button>}
        </>
      )}

      {tool === 'temp' && (
        <>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.yellow, margin: '8px 0 6px' }}>{t('circuito.condTempPoints', { n: pts.length })}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {pts.map((p, i) => (
              <div key={p.id || i} style={row}>
                <span style={{ backgroundColor: '#e85d04', color: '#000', fontWeight: 900, fontSize: '10px', padding: '1px 6px', borderRadius: '2px' }}>{i + 1}</span>
                <span style={{ fontSize: '11px', color: colors.textMain, width: '38px' }}>{pct(p.t)}</span>
                <input type="number" step="0.5" value={p.temp ?? ''} placeholder={est !== null ? String(Math.round(est)) : '°C'}
                  onChange={(e) => onConfigChange?.('trackTempPoints', pts.map((q, k) => (k === i ? { ...q, temp: e.target.value } : q)))}
                  style={{ ...inputStyle, flex: 1, padding: '4px 6px', fontSize: '11px', minWidth: 0 }} />
                <span style={{ fontSize: '11px', color: colors.textMuted }}>°C</span>
                <button onClick={() => onConfigChange?.('trackTempPoints', pts.filter((_, k) => k !== i))} style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 7px', fontSize: '10px', cursor: 'pointer' }}><Icon name="close" /></button>
              </div>
            ))}
          </div>
          {pts.length > 0 && <button onClick={() => onConfigChange?.('trackTempPoints', [])} style={{ ...smallBtn, width: '100%', marginTop: '8px', backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('circuito.condClear')}</button>}
        </>
      )}
    </div>
  );
}

// Capa sobre el lienzo (SVG 0..100 estirado + marcas en %): pista pintada por el viento, sombras, mediciones y brújula
export function CondOverlay({ config, aspect }) {
  const ar = Number.isFinite(aspect) && aspect > 0.2 ? aspect : DEFAULT_ASPECT;
  const north = northAngle(config);
  const track = useMemo(() => buildTrack(config?.trackPath, { width: 100 * ar, fit: false, aspect: ar }), [config?.trackPath, ar]);
  const analysis = useMemo(() => (track ? analyzeTrack(track, {
    weatherData: config?.weatherData || {}, north, reverse: travelReversed(track, config?.circuitDirection)
  }) : null), [track, config?.weatherData, north, config?.circuitDirection]);
  if (!track || !analysis) return null;
  const P = (p) => `${(p.x / ar).toFixed(2)} ${p.y.toFixed(2)}`;
  const pts = analysis.points;
  const shade = Array.isArray(config?.trackShade) ? config.trackShade : [];
  const temps = Array.isArray(config?.trackTempPoints) ? config.trackTempPoints : [];
  const at = (t) => pts.reduce((b, p) => (lapDist(p.t, t) < lapDist(b.t, t) ? p : b), pts[0]);
  const hasWind = analysis.windSpeed > 0 && analysis.windDir !== null;

  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {pts.map((p, i) => {
          const q = pts[(i + 1) % pts.length];
          const s = shadeAt(shade, p.t);
          return (
            <g key={i}>
              <path d={`M ${P(p)} L ${P(q)}`} stroke={hasWind ? windAlongColor(p.along) : '#9aa3ad'} strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {s > 0 && <path d={`M ${P(p)} L ${P(q)}`} stroke="#0b1d3a" strokeOpacity={0.75 * s} strokeWidth="16" strokeLinecap="butt" vectorEffect="non-scaling-stroke" />}
            </g>
          );
        })}
      </svg>
      {temps.map((m, i) => {
        const p = at(Number(m.t) || 0);
        return (
          <div key={m.id || i} style={{
            position: 'absolute', left: `${p.x / ar}%`, top: `${p.y}%`, transform: 'translate(-50%, -120%)', pointerEvents: 'none', zIndex: 2,
            backgroundColor: '#e85d04', color: '#000', border: '2px solid #000', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 900, whiteSpace: 'nowrap'
          }}>{i + 1}{m.temp !== '' && m.temp !== undefined && m.temp !== null ? ` · ${m.temp}°` : ''}</div>
        );
      })}
      {/* Brújula: la N apunta al norte real */}
      <div style={{ position: 'absolute', right: '12px', top: '12px', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.65)', border: '2px solid rgba(255,255,255,0.4)', pointerEvents: 'none', zIndex: 3 }}>
        <div style={{ position: 'absolute', inset: 0, transform: `rotate(${north}deg)` }}>
          <div style={{ position: 'absolute', left: '50%', top: '6px', transform: 'translateX(-50%)', color: '#ff4d4d', fontWeight: 900, fontSize: '15px', lineHeight: 1 }}>N</div>
          <div style={{ position: 'absolute', left: '50%', top: '22px', width: 0, height: 0, transform: 'translateX(-50%)', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '20px solid #ff4d4d' }} />
        </div>
      </div>
    </>
  );
}
