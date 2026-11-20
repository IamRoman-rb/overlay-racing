// CONDICIONES DE PISTA: mapa de calor sobre el trazado del circuito (pestaña CIRCUITO) con el viento por tramo y la
// temperatura del asfalto. Capas (PERSONALIZAR, config.trackConditionsLayer):
//   both (por defecto): pista pintada por temperatura + flechas de viento coloreadas según cómo le pegan al auto
//   wind : pista pintada por el viento (de cola azul, cruzado gris, de frente rojo) + carteles en los tramos largos
//   temp : sólo el mapa de calor del asfalto con la zona más caliente y la más fresca
// Formatos: standard | compact | full (grande, con columna de datos) | minimal | skins.
// La temperatura del asfalto es una estimación (o la medición del operador): el cartel lo aclara.
import { useMemo } from 'react';
import { getGraphicFrame, getFormatStyles, useImageAspect } from '../utils/raceVisuals';
import { buildTrack, DEFAULT_ASPECT } from '../utils/trackPath';
import { analyzeTrack, windRuns, travelReversed, northAngle, heatColor, windAlongColor, WIND_COLORS, HEAT_STOPS, norm } from '../utils/trackConditions';
import { getWindDirLabel } from '../utils/weather';
import { WindLayer, WindCompass } from './WindField';
import CategoryTag from '../components/CategoryTag';
import { makeFx } from '../utils/contentAnim';

const fmt = (v) => (Number.isFinite(v) ? `${Math.round(v)}°` : '—');
const LABELS = { head: 'DE FRENTE', tail: 'DE COLA', cross: 'CRUZADO' };

// Flecha de viento (apunta hacia donde sopla) en coordenadas locales
function Arrow({ x, y, angle, color, s = 1 }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${s})`}>
      <path d="M -9 0 H 5 M 1 -4.5 L 7 0 L 1 4.5" fill="none" stroke="#000" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M -9 0 H 5 M 1 -4.5 L 7 0 L 1 4.5" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

// Brújula chica: dónde queda el norte en la imagen del circuito
function NorthMark({ x, y, north, color, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r="14" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.35)" />
      <g transform={`rotate(${north})`}>
        <path d="M 0 -11 L 4.5 -1 L -4.5 -1 Z" fill={color} />
        <text y="9" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">N</text>
      </g>
    </g>
  );
}

export default function TrackConditions({ config, isVisible, id = 'trackConditions' }) {
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 1400, y: 560, scale: 1 });
  const format = config?.[`${id}Format`] || 'standard';
  const f = getFormatStyles(format === 'full' ? 'standard' : format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const compact = format === 'compact';
  const full = format === 'full';
  const layer = ['wind', 'temp'].includes(config?.trackConditionsLayer) ? config.trackConditionsLayer : 'both';
  const showWind = layer !== 'temp';
  const showTemp = layer !== 'wind';
  const flow = config?.trackConditionsFlow !== false;

  const W = full ? 860 : compact ? 330 : 460;
  const k = full ? 1.7 : compact ? 0.8 : 1;
  const trackPath = config?.trackPath;
  const trackImage = config?.trackImage || null;
  const imageAspect = useImageAspect(trackImage);
  const aspect = trackImage ? imageAspect : DEFAULT_ASPECT;
  const track = useMemo(() => (aspect ? buildTrack(trackPath, {
    width: W, fit: true, aspect,
    pad: full ? 46 : compact ? 22 : 30,
    maxHeight: full ? 560 : compact ? 230 : 320, minHeight: full ? 420 : compact ? 150 : 200
  }) : null), [trackPath, aspect, W, full, compact]);

  const wd = config?.weatherData || null;
  const north = northAngle(config);
  const analysis = useMemo(() => (track ? analyzeTrack(track, {
    weatherData: wd || {}, north, shade: config?.trackShade, tempPoints: config?.trackTempPoints,
    reverse: travelReversed(track, config?.circuitDirection)
  }) : null), [track, wd, north, config?.trackShade, config?.trackTempPoints, config?.circuitDirection]);

  const H = track ? track.height : 200;
  const hasWind = !!analysis && analysis.windSpeed > 0 && analysis.windDir !== null;
  const hasTemp = !!analysis && analysis.min !== null;
  // Escala de color: al menos 6 °C de rango para que una diferencia de décimas no parezca un incendio
  const tMin = hasTemp ? Math.min(analysis.min, (analysis.min + analysis.max) / 2 - 3) : 0;
  const tMax = hasTemp ? Math.max(analysis.max, (analysis.min + analysis.max) / 2 + 3) : 1;
  const spread = hasTemp ? analysis.max - analysis.min : 0;
  // Ángulo en pantalla hacia donde sopla (0 = derecha), con el norte de la imagen
  const windScreen = hasWind ? analysis.windDir + 180 + north - 90 : 0;
  const runs = useMemo(() => (showWind && hasWind ? windRuns(analysis, 0.07).slice(0, full ? 3 : 2) : []), [analysis, showWind, hasWind, full]);

  // Tramos de color: cada muestra hasta la siguiente
  const segs = useMemo(() => {
    if (!analysis) return [];
    const pts = analysis.points;
    return pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const color = layer === 'wind'
        ? (hasWind ? windAlongColor(p.along) : WIND_COLORS.none)
        : (hasTemp ? heatColor(norm(p.temp, tMin, tMax)) : '#777');
      return { d: `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${q.x.toFixed(1)} ${q.y.toFixed(1)}`, color };
    });
  }, [analysis, layer, hasWind, hasTemp, tMin, tMax]);

  // Flechas de viento sobre la pista (capa ambas): todas apuntan igual (es el mismo viento), el color dice cómo pega
  const arrows = useMemo(() => {
    if (!analysis || layer !== 'both' || !hasWind) return [];
    const pts = analysis.points;
    const count = full ? 16 : compact ? 9 : 12;
    return Array.from({ length: count }, (_, i) => pts[Math.floor(((i + 0.5) / count) * pts.length)]);
  }, [analysis, layer, hasWind, full, compact]);

  const fx = makeFx(config, id, isVisible);
  const textShadow = f.textShadow;
  const fs = full ? 1.45 : compact ? 0.85 : 1;
  const px = (v) => `${Math.round(v * fs)}px`;
  const gid = `tc${id}`;
  const measured = analysis?.measured;
  const trackTemp = hasTemp ? (measured ? (analysis.min + analysis.max) / 2 : analysis.trackTemp) : null;

  const pill = (key, x, y, text, bg, fg = '#fff') => {
    const w = text.length * 6.1 * k + 12 * k;
    return (
      <g key={key} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
        <rect x={-w / 2} y={-9 * k} width={w} height={18 * k} rx={9 * k} fill={bg} stroke="#000" strokeOpacity="0.7" strokeWidth="1" />
        <text y={3.6 * k} textAnchor="middle" fontSize={10 * k} fontWeight="900" fill={fg} letterSpacing="0.4">{text}</text>
      </g>
    );
  };

  const legend = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px(6), padding: full ? '0' : (compact ? '6px 10px 8px' : '8px 14px 10px'), fontSize: px(10), color: theme.text, textShadow }}>
      {showTemp && hasTemp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
          <span style={{ fontWeight: 900, color: theme.title, minWidth: full ? '0' : px(44), letterSpacing: '1px' }}>ASFALTO</span>
          <span style={{ fontWeight: 800 }}>{fmt(tMin)}</span>
          <span style={{ flex: 1, height: px(8), borderRadius: px(4), background: `linear-gradient(90deg, ${HEAT_STOPS.join(', ')})` }} />
          <span style={{ fontWeight: 800 }}>{fmt(tMax)}</span>
          <span style={{ fontSize: px(8.5), fontWeight: 900, padding: '1px 5px', borderRadius: '3px', border: `1px solid ${theme.number}`, color: theme.number }}>{measured ? 'MEDIDA' : 'ESTIMADA'}</span>
        </div>
      )}
      {showWind && hasWind && (
        <div style={{ display: 'flex', alignItems: 'center', gap: px(10), flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 900, color: theme.title, minWidth: full ? '0' : px(44), letterSpacing: '1px' }}>VIENTO</span>
          {['tail', 'cross', 'head'].map(c => (
            <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: px(4), fontWeight: 800 }}>
              <span style={{ width: px(14), height: px(5), borderRadius: '3px', backgroundColor: WIND_COLORS[c] }} />
              {LABELS[c]} <span style={{ color: theme.number }}>{analysis.share[c]}%</span>
            </span>
          ))}
          {analysis.gusts ? <span style={{ fontWeight: 800 }}><span style={{ color: theme.number }}>RÁF. </span>{Math.round(analysis.gusts)} KM/H</span> : null}
        </div>
      )}
      {!hasWind && showWind && <span style={{ color: theme.number }}>Sin datos de viento: cargá el clima en el PANEL.</span>}
    </div>
  );

  const map = (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <filter id={`${gid}Glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={5 * k} /></filter>
      </defs>
      {track && analysis && (
        <g>
          {/* Asfalto */}
          <path d={track.d} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={20 * k} strokeLinejoin="round" strokeLinecap="round" />
          <path d={track.d} fill="none" stroke="#1d1d1d" strokeWidth={16 * k} strokeLinejoin="round" strokeLinecap="round" />
          {/* Resplandor: el calor (o el viento) se "derrama" fuera de la pista, como en un mapa térmico */}
          <g filter={`url(#${gid}Glow)`} opacity={layer === 'wind' ? 0.55 : 0.85}>
            {segs.map((s, i) => <path key={i} d={s.d} stroke={s.color} strokeWidth={18 * k} strokeLinecap="round" fill="none" />)}
          </g>
          {segs.map((s, i) => <path key={`c${i}`} d={s.d} stroke={s.color} strokeWidth={8 * k} strokeLinecap="round" fill="none" />)}
          {/* Largada */}
          <g transform={`translate(${track.start.x.toFixed(1)} ${track.start.y.toFixed(1)}) rotate(${(track.start.angle + 90).toFixed(1)})`}>
            <rect x={-11 * k} y={-2.5 * k} width={22 * k} height={5 * k} fill="#fff" stroke="#000" strokeWidth="0.8" />
            <rect x={-11 * k} y={-2.5 * k} width={5.5 * k} height={2.5 * k} fill="#000" />
            <rect x="0" y={-2.5 * k} width={5.5 * k} height={2.5 * k} fill="#000" />
            <rect x={-5.5 * k} y="0" width={5.5 * k} height={2.5 * k} fill="#000" />
            <rect x={5.5 * k} y="0" width={5.5 * k} height={2.5 * k} fill="#000" />
          </g>
          {arrows.map((p, i) => <Arrow key={i} x={p.x} y={p.y} angle={windScreen} color={WIND_COLORS[p.cls]} s={k} />)}
          {/* Zona más caliente y más fresca (sólo si hay diferencia real) */}
          {showTemp && hasTemp && spread >= 1 && (
            <g>
              {pill('hot', analysis.hot.x, analysis.hot.y - 20 * k, `▲ ${fmt(analysis.max)}`, heatColor(0.85), '#000')}
              {pill('cold', analysis.cold.x, analysis.cold.y - 20 * k, `▼ ${fmt(analysis.min)}`, '#3d4a5c')}
            </g>
          )}
          {/* Tramos largos con viento de frente / de cola */}
          {runs.map((r, i) => pill(`run${i}`, r.mid.x, r.mid.y + 22 * k, `${LABELS[r.cls]} ${Math.round(Math.abs(r.along) * analysis.windSpeed)} KM/H`, WIND_COLORS[r.cls], '#fff'))}
          <NorthMark x={W - 24 * k} y={24 * k} north={north} color={theme.main} s={k} />
        </g>
      )}
      {!track && aspect && <text x={W / 2} y={H / 2} textAnchor="middle" fill={theme.number} fontSize="13">Dibujá el trazado en la pestaña CIRCUITO</text>}
    </svg>
  );

  const windBg = flow && hasWind && showWind ? (
    <WindLayer width={W} height={H} count={full ? 34 : 18} variant="arrows" grid={false} opacity={0.32} running={!!isVisible}
      idPrefix={`${gid}W`} weatherData={{ ...wd, windDir: analysis.windDir + north }} />
  ) : null;

  const stat = (label, value, sub, color) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '2px', color: theme.title }}>{label}</span>
      <span style={{ fontSize: '40px', fontWeight: 900, lineHeight: 1, color: color || theme.text }}>{value}</span>
      {sub && <span style={{ fontSize: '12px', fontWeight: 800, color: theme.number, letterSpacing: '1px' }}>{sub}</span>}
    </div>
  );

  if (full) {
    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{ ...f.box, display: 'flex', width: `${W + 300}px` }}>
          <div style={{ position: 'relative', width: `${W}px` }}>
            {windBg}
            <div style={{ position: 'relative' }}>{map}</div>
            <div style={{ padding: '0 26px 20px' }}>{legend}</div>
          </div>
          <div style={{ width: '300px', boxSizing: 'border-box', padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid rgba(255,255,255,0.12)', backgroundColor: f.headerBg, textShadow }}>
            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '3px', color: theme.title }}>CONDICIONES<br />DE PISTA<CategoryTag config={config} id={id} /></div>
            {stat('AIRE', fmt(analysis?.air), wd?.humidity != null ? `HUMEDAD ${Math.round(wd.humidity)}%` : null)}
            {stat('ASFALTO', fmt(trackTemp), measured ? 'MEDIDA' : 'ESTIMADA', hasTemp ? heatColor(0.75) : null)}
            {hasWind && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <WindCompass weatherData={wd} size={84} color={theme.text} muted="rgba(255,255,255,0.45)" bg="rgba(0,0,0,0.35)" running={!!isVisible} idPrefix={`${gid}C`} showLabel={false} />
                {stat('VIENTO', `${Math.round(analysis.windSpeed)}`, `KM/H ${getWindDirLabel(analysis.windDir)}${analysis.gusts ? ` · RÁF. ${Math.round(analysis.gusts)}` : ''}`)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div className={fx.group} style={{ ...f.box, width: `${W}px` }}>
        <div style={{ display: f.minimal ? 'none' : 'flex', padding: compact ? '6px 10px' : '8px 14px', backgroundColor: f.headerBg, borderBottom: f.headerBorder, color: theme.title, fontWeight: 900, fontSize: compact ? '10px' : '12px', letterSpacing: '2px', justifyContent: 'space-between', alignItems: 'center', textShadow }}>
          <span style={{ whiteSpace: 'nowrap' }}>{compact ? 'CONDICIONES' : 'CONDICIONES DE PISTA'}<CategoryTag config={config} id={id} /></span>
          <span style={{ display: 'flex', gap: compact ? '8px' : '12px', color: theme.text, letterSpacing: compact ? '0' : '1px', whiteSpace: 'nowrap' }}>
            <span><span style={{ color: theme.number }}>AIRE </span>{fmt(analysis?.air)}</span>
            {showTemp && <span><span style={{ color: theme.number }}>PISTA </span>{fmt(trackTemp)}</span>}
            {showWind && hasWind && <span><span style={{ color: theme.number }}>VIENTO </span>{Math.round(analysis.windSpeed)} {getWindDirLabel(analysis.windDir)}</span>}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          {windBg}
          <div style={{ position: 'relative' }}>{map}</div>
        </div>
        {legend}
      </div>
    </div>
  );
}
