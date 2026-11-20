import { useMemo, useState } from 'react';
import { getGraphicFrame, useImageAspect } from '../utils/raceVisuals';
import { buildTrack, pointOnTrack, nearestOnTrack, trackDirection, turnAt, sectorRanges, trackSegment, projectTilt, detectCurves, DEFAULT_ASPECT } from '../utils/trackPath';
import { getElitePalette, ELITE_FONT, SECTOR_PALETTE, photoUrl, rgba } from '../utils/elite';
import { WeatherIcon } from './Weather';
import { getWeatherVisual, getWindDirLabel } from '../utils/weather';
import { WindLayer, WindCompass } from './WindField';
import WeatherScene from './WeatherScene';
import CircuitTour from './CircuitTour';
import { useSuitStyle } from '../utils/suitColor';
import { makeFx } from '../utils/contentAnim';
import { circuitCountry } from '../utils/countries';
import { FlagChip, FlagFade } from '../components/CountryFlag';
import { rainInfo } from '../utils/weatherMap';

const thousands = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const polyLen = (pts) => pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
const toPoints = (pts) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const num = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '-' : Math.round(v));

// Iconos simples (SVG en línea, heredan el color)
const IconPin = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: '-2px' }}><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>);
const IconRuler = () => (<svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6h24M1 1v10M25 1v10" /></svg>);
const IconDirection = ({ cw, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d={cw ? 'M12 3a9 9 0 1 1-8.5 6' : 'M12 3a9 9 0 1 0 8.5 6'} />
    <path d={cw ? 'M3.5 4v5h5' : 'M20.5 4v5h-5'} />
  </svg>
);
const IconWind = ({ size = 26 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7" /></svg>);
const IconDrop = ({ size = 22 }) => (<svg width={size} height={size * 1.18} viewBox="0 0 24 28" fill="currentColor"><path d="M12 2C9 7 5 11.5 5 16.5A7 7 0 0 0 19 16.5C19 11.5 15 7 12 2z" /></svg>);
const IconRain = ({ size = 26 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8.5 3.5 3.5 0 0 1 17.5 15z" /><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" /></svg>);

// Todo lo que sale del config y del trazado (no depende del tamaño en el que se dibuje el circuito)
function useCircuitData(config) {
  const trackImage = config?.trackImage || null;
  const imageAspect = useImageAspect(trackImage);
  const aspect = trackImage ? imageAspect : DEFAULT_ASPECT;
  const trackPath = config?.trackPath;
  const splits = config?.trackSectors;
  const curves = config?.trackCurves;
  const hasPath = !!aspect && Array.isArray(trackPath) && trackPath.length >= 3;

  const dirSetting = config?.circuitDirection;
  const direction = dirSetting === 'cw' || dirSetting === 'ccw' ? dirSetting : (hasPath ? trackDirection(trackPath, aspect) : null);
  const curveStops = useMemo(() => {
    if (!hasPath) return [];
    return (curves || []).map(c => {
      const t = Number.isFinite(c.t) ? c.t : (nearestOnTrack(trackPath, aspect, c) || {}).t;
      return Number.isFinite(t) ? { id: c.id, name: c.name, t, side: turnAt(trackPath, aspect, t) } : null;
    }).filter(Boolean);
  }, [curves, trackPath, aspect, hasPath]);
  // Curva por curva sin curvas marcadas en CIRCUITO > CURVAS: se usan las que se detectan solas en el trazado
  // (antes el recorrido pasaba a ser una vuelta común y parecía que la cinemática había desaparecido)
  const wantsCurves = config?.circuitIntroMode === 'curves';
  const tourStops = useMemo(() => {
    if (!wantsCurves || curveStops.length || !hasPath) return curveStops;
    return detectCurves(trackPath, aspect);
  }, [wantsCurves, curveStops, hasPath, trackPath, aspect]);
  const turns = { L: 0, R: 0 };
  curveStops.forEach(c => { if (c.side) turns[c.side] += 1; });
  const curveCount = Array.isArray(curves) ? curves.length : 0;
  const lengthM = parseFloat(String(config?.circuitLength || '').replace(',', '.'));
  const hasLength = Number.isFinite(lengthM) && lengthM > 0;
  const sectorLens = sectorRanges(splits).map(([a, b]) => (hasLength ? Math.round(lengthM * (b - a)) : null));
  const wd = config?.weatherData;
  const weather = wd ? getWeatherVisual(wd.weathercode) : null;
  const recordName = String(config?.recordDriver || '').trim();
  const [firstName, ...rest] = recordName.split(/\s+/);
  return {
    aspect, trackPath, splits, direction, curveStops, tourStops, turns, curveCount, lengthM, hasLength, sectorLens, wd, weather,
    weatherFx: !!weather && config?.circuitIntroWeatherFx !== false,
    tourMode: ['tour', 'curves'].includes(config?.circuitIntroMode) ? config.circuitIntroMode : 'static',
    circuitName: config?.circuitName || config?.circuito || 'CIRCUITO',
    // País del circuito (bandera): el elegido en CIRCUITO, el de la lista de circuitos o el de la ubicación de la PC
    country: config?.circuitShowFlag === false ? '' : circuitCountry(config),
    eventTitle: config?.eventTitle || config?.campeonato || '',
    city: config?.circuitCity || '',
    recordName, firstName, surname: rest.join(' ')
  };
}

// EL CIRCUITO dibujado en una zona de width x height: estático (dibujándose por sectores, con pines) o con el recorrido
// (vuelta / curva por curva). tilt = 0 lo muestra visto desde arriba.
function TrackView({ data, width, height, tilt, pal, running, isVisible, config, idPrefix = 'ci' }) {
  const { aspect, trackPath, splits } = data;
  const geo = useMemo(() => {
    if (!aspect) return null;
    const track = buildTrack(trackPath, { width, fit: true, pad: 10, minHeight: height, maxHeight: height, aspect });
    if (!track) return null;
    const proj = (p) => projectTilt(p, { cx: width / 2, cy: height / 2, tilt, distance: 700 });
    const projected = track.samples.map(proj);
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    projected.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const pad = Math.max(18, Math.min(34, width * 0.057));
    const k = Math.min((width - pad * 2) / Math.max(1, maxX - minX), (height - pad * 2 - 10) / Math.max(1, maxY - minY));
    const ox = (width - (maxX - minX) * k) / 2 - minX * k;
    const oy = (height - (maxY - minY) * k) / 2 - minY * k + 6;
    const f = (p) => { const q = proj(p); return { x: q.x * k + ox, y: q.y * k + oy }; };
    const sectors = sectorRanges(splits).map(([a, b], i) => {
      const pts = trackSegment(track, a, b).map(f);
      return { i, a, b, pts, flat: trackSegment(track, a, b), len: polyLen(pts), color: SECTOR_PALETTE[i % SECTOR_PALETTE.length], pin: f(pointOnTrack(track, (a + b) / 2)) };
    });
    return { sectors, start: f(pointOnTrack(track, 0)), outline: track.samples.map(f), track };
  }, [trackPath, splits, aspect, tilt, width, height]);

  const touring = data.tourMode !== 'static' && geo;
  const s = Math.max(0.65, Math.min(1.25, width / 600));   // escala de trazos y pines según el tamaño
  const glow = `${idPrefix}Glow`;
  if (touring) {
    return (
      <CircuitTour track={geo.track} sectors={geo.sectors} curves={data.tourStops} mode={data.tourMode} running={running} width={width} height={height} pal={pal}
        tourSec={parseFloat(config?.circuitIntroTourSec) || 16} tilt={tilt ? 56 : 40} />
    );
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible', position: 'relative' }}>
      <defs><filter id={glow} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={4 * s} /></filter></defs>
      {geo && (
        <g key={isVisible ? 'on' : 'off'}>
          {/* Grosor de la pista (lado oscuro) para el efecto 3D */}
          {tilt > 0 && <polyline points={toPoints(geo.outline.map(p => ({ x: p.x, y: p.y + 7 * s })))} fill="none" stroke={rgba(pal.deep, 0.9)} strokeWidth={11 * s} strokeLinejoin="round" />}
          {geo.sectors.map(sec => {
            const anim = { strokeDasharray: sec.len, strokeDashoffset: sec.len, animation: `ciDraw 0.55s ease-out ${(0.25 + sec.i * 0.45).toFixed(2)}s forwards` };
            return (
              <g key={sec.i}>
                <polyline points={toPoints(sec.pts)} fill="none" stroke={sec.color} strokeOpacity="0.45" strokeWidth={16 * s} strokeLinejoin="round" strokeLinecap="round" filter={`url(#${glow})`} style={anim} />
                <polyline points={toPoints(sec.pts)} fill="none" stroke={sec.color} strokeWidth={9 * s} strokeLinejoin="round" strokeLinecap="round" style={anim} />
                <polyline points={toPoints(sec.pts)} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2.5 * s} strokeLinejoin="round" strokeLinecap="round" style={anim} />
              </g>
            );
          })}
          {/* Pines: largada y cada sector */}
          {[{ p: geo.start, label: 'S/F', color: '#ffffff', delay: 0.2 }, ...(geo.sectors.length > 1 ? geo.sectors.map(sec => ({ p: sec.pin, label: `S${sec.i + 1}`, color: sec.color, delay: 0.5 + sec.i * 0.45 })) : [])].map((pin, i) => (
            <g key={`pin${i}`} style={{ opacity: 0, animation: `ciPin 0.35s ease-out ${pin.delay.toFixed(2)}s forwards` }}>
              <g transform={`translate(${pin.p.x.toFixed(1)} ${pin.p.y.toFixed(1)}) scale(${s.toFixed(3)})`}>
                <line x1="0" y1="0" x2="0" y2="-20" stroke="#fff" strokeWidth="1.5" />
                <circle cx="0" cy="-30" r="11" fill={pin.color} stroke="#0b0f3a" strokeWidth="2" />
                <text x="0" y="-26.5" textAnchor="middle" fontSize={pin.label.length > 2 ? 8 : 9.5} fontWeight="800" fill="#000" fontFamily="Arial, sans-serif">{pin.label}</text>
              </g>
            </g>
          ))}
        </g>
      )}
      {!geo && <text x={width / 2} y={height / 2} textAnchor="middle" fill={pal.muted} fontSize={Math.max(11, 16 * s)} fontFamily="Arial">DIBUJÁ EL TRAZADO EN LA PESTAÑA CIRCUITO</text>}
    </svg>
  );
}

// Viento (campo de vectores) detrás del circuito
const Wind = ({ data, width, height, running, idPrefix, count }) => (
  <WindLayer width={width} height={height} count={count || Math.round((width * height) / 5200)} variant="arrows" weatherData={data.wd} running={running} idPrefix={idPrefix} />
);

// Rosa de los vientos con la velocidad abajo
function Compass({ data, pal, size = 64, running, idPrefix, label = true }) {
  if (!data.wd || !Number.isFinite(Number(data.wd.windDir))) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
      <WindCompass weatherData={data.wd} size={size} color={pal.text} muted={rgba(pal.text, 0.5)} bg={rgba(pal.deep, 0.78)} running={running} idPrefix={idPrefix} showLabel={false} />
      {label && (
        <span style={{ marginTop: '4px', fontSize: `${Math.max(10, size / 5.4)}px`, fontWeight: 800, letterSpacing: '0.5px', backgroundColor: rgba(pal.deep, 0.8), padding: '2px 6px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
          {num(data.wd.windSpeed)} KM/H · {getWindDirLabel(data.wd.windDir)}
        </span>
      )}
    </div>
  );
}

// Datos del clima en fila: temperatura + viento / humedad / lluvia
function WeatherRow({ data, pal, scale = 1, items = ['wind', 'hum', 'rain'], temp = true }) {
  const { wd, weather } = data;
  const z = (n) => `${Math.round(n * scale)}px`;
  const all = {
    wind: { icon: <IconWind size={26 * scale} />, value: num(wd?.windSpeed), unit: 'km/h', label: 'VIENTO' },
    hum: { icon: <span style={{ color: '#3db6ff', display: 'flex' }}><IconDrop size={22 * scale} /></span>, value: num(wd?.humidity), unit: '%', label: 'HUMEDAD' },
    rain: (() => { const r = rainInfo(wd); return { icon: <IconRain size={26 * scale} />, value: r ? String(r.value).replace('.', ',') : '-', unit: r ? r.unit : '', label: 'LLUVIA' }; })()
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: temp ? 'flex' : 'none', alignItems: 'center', marginRight: z(24) }}>
        {weather && <WeatherIcon category={weather.category} color="#ffc93c" size={24 * scale} />}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: z(8), lineHeight: 1 }}>
          <span style={{ fontSize: z(30), fontWeight: 700 }}>{wd ? Math.round(wd.temp) : '-'}°</span>
          <span style={{ fontSize: z(10), fontWeight: 700, color: pal.muted, whiteSpace: 'nowrap' }}>{weather ? weather.label : ''}</span>
        </div>
      </div>
      {items.map(k => all[k]).map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', marginRight: z(22) }}>
          <span style={{ color: pal.muted, display: 'flex' }}>{item.icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: z(7), lineHeight: 1 }}>
            <span style={{ fontSize: z(28), fontWeight: 700 }}>{item.value}<span style={{ fontSize: z(12), marginLeft: '2px' }}>{item.unit}</span></span>
            <span style={{ fontSize: z(10), fontWeight: 700, color: '#3db6ff', letterSpacing: '0.5px' }}>{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Foto (o número) del piloto del récord
function RecordPhoto({ config, sc, pal, height = 118 }) {
  const [photoOk, setPhotoOk] = useState(true);
  const photo = config?.recordNumber && config?.photosPath ? photoUrl(config.recordNumber) : null;
  return (
    <div style={{ width: `${height * 0.85}px`, height: `${height}px`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
      {photo && photoOk && <img src={photo} alt="" onError={() => setPhotoOk(false)} style={{ maxHeight: `${height}px`, maxWidth: `${height * 0.93}px`, objectFit: 'contain' }} />}
      <span style={{ display: photo && photoOk ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: `${height * 0.54}px`, height: `${height * 0.37}px`, marginBottom: `${height * 0.25}px`, backgroundColor: pal.deep, fontSize: `${height * 0.22}px`, fontWeight: 800, ...sc(config?.recordNumber) }}>{config?.recordNumber || ''}</span>
    </div>
  );
}

const KEYFRAMES = `@keyframes ciDraw { to { stroke-dashoffset: 0; } } @keyframes ciPin { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`;

// PRESENTACIÓN DEL CIRCUITO (estilo Elite): circuito dibujado con el trazado y coloreado por sectores, datos del circuito,
// récord con su piloto y el clima. Formatos (PERSONALIZAR):
//   'elite' (en perspectiva) | 'flat' (visto desde arriba) | 'cinematic' (pantalla grande) | 'band' (zócalo ancho)
//   'vertical' (columna lateral) | 'compact' (tarjeta chica)
export default function CircuitIntro({ config, isVisible, id = 'circuitIntro' }) {
  const format = config?.circuitIntroFormat || 'elite';
  const defaults = { cinematic: { x: 260, y: 150, scale: 1 }, band: { x: 210, y: 790, scale: 1 }, vertical: { x: 1400, y: 160, scale: 1 }, compact: { x: 60, y: 620, scale: 1 } }[format] || { x: 470, y: 230, scale: 1 };
  const sc = useSuitStyle([config?.recordNumber], config);
  const { wrapperStyle, bRad } = getGraphicFrame(config, id, isVisible, defaults, 45);
  const pal = getElitePalette(config);
  const data = useCircuitData(config);
  const fx = makeFx(config, id, isVisible);
  const running = !!isVisible;
  const p = { data, pal, config, sc, bRad, fx, running, isVisible };

  let body;
  if (format === 'cinematic') body = <Cinematic {...p} />;
  else if (format === 'band') body = <Band {...p} />;
  else if (format === 'vertical') body = <Vertical {...p} />;
  else if (format === 'compact') body = <Compact {...p} />;
  else body = <Elite {...p} flat={format === 'flat'} />;

  return (
    <div style={wrapperStyle}>
      <style>{KEYFRAMES}</style>
      {body}
    </div>
  );
}

const chipStyle = (pal, size = 12) => ({ display: 'inline-block', backgroundColor: pal.deep, color: pal.text, fontSize: `${size}px`, fontWeight: 700, letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '2px', border: `1px solid ${rgba('#ffffff', 0.12)}` });
const boxStyle = (pal, bRad) => ({ background: pal.background, borderRadius: bRad, overflow: 'hidden', boxShadow: '0 18px 40px rgba(0,0,0,0.55)', position: 'relative' });

// Encabezado: logo de la categoría + nombre del circuito
function Header({ config, data, pal, fx, height = 58, fontSize = 30, logoW = 210, right = null }) {
  return (
    <div className={fx.group} style={{ position: 'relative', isolation: 'isolate', display: 'flex', alignItems: 'center', height: `${height}px`, backgroundColor: rgba(pal.deep, 0.55), borderBottom: `2px solid ${pal.line}` }}>
      {/* Bandera del país del circuito, desvaneciéndose desde la derecha (detrás del contenido) */}
      <FlagFade code={data.country} fadeTo="left" opacity={0.6} dim={0.4} style={{ left: 'auto', width: '58%', zIndex: -1 }} />
      <div style={{ display: config?.categoryLogo ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', height: '100%', minWidth: `${logoW}px`, backgroundColor: '#0b0b0b', padding: '0 14px', boxSizing: 'border-box' }}>
        {config?.categoryLogo && <img src={config.categoryLogo} alt="" style={{ maxHeight: `${height - 16}px`, maxWidth: `${logoW - 20}px`, objectFit: 'contain' }} />}
      </div>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: `${Math.round(fontSize * 0.4)}px`, fontSize: `${fontSize}px`, fontWeight: 700, letterSpacing: '1px', padding: '6px 20px 0', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <FlagChip code={data.country} height={Math.round(fontSize * 0.72)} style={{ marginTop: '-4px' }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{data.circuitName}</span>
      </span>
      {right}
    </div>
  );
}

// ---------- ELITE / ELITE PLANO (formato original) ----------
function Elite({ data, pal, config, sc, bRad, fx, running, isVisible, flat }) {
  const W = 980; const TW = 600; const TH = 300;
  const chip = (text) => <span style={chipStyle(pal)}>{text}</span>;
  const row = { display: 'flex', alignItems: 'center', marginTop: '8px' };
  const { wd } = data;
  return (
    <div className={fx.group} style={{ width: `${W}px`, fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase' }}>
      <div style={{ display: data.eventTitle ? 'inline-block' : 'none', backgroundColor: rgba(pal.deep, 0.88), padding: '4px 14px', fontSize: '17px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '2px' }}>{data.eventTitle}</div>
      <div style={boxStyle(pal, bRad)}>
        {data.weatherFx && <WeatherScene category={data.weather.category} code={wd.weathercode} width={W} height={58 + TH + 90} running={running} idPrefix="ciWx" />}
        <Header config={config} data={data} pal={pal} fx={fx} />
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* CIRCUITO */}
          <div style={{ width: `${TW}px`, height: `${TH + 90}px`, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
            <Wind data={data} width={TW} height={TH + 90} running={running} idPrefix="ciWind" count={46} />
            <div style={{ marginTop: '6px', position: 'relative', zIndex: 1 }}>
              <TrackView data={data} width={TW} height={TH} tilt={flat ? 0 : 52} pal={pal} running={running} isVisible={isVisible} config={config} />
            </div>
            {/* Rosa de los vientos */}
            <div style={{ position: 'absolute', right: '12px', top: '12px', zIndex: 3 }}>
              <Compass data={data} pal={pal} size={58} running={running} idPrefix="ciCmp" />
            </div>
            {/* CLIMA */}
            <div style={{ display: wd ? 'flex' : 'none', alignItems: 'center', position: 'absolute', left: '16px', bottom: '14px', height: '62px', padding: '0 18px', borderLeft: `3px solid ${pal.line}`, backgroundColor: pal.panel, borderRadius: '0 6px 6px 0', zIndex: 3 }}>
              <WeatherRow data={data} pal={pal} scale={0.92} />
            </div>
          </div>

          {/* DATOS DEL CIRCUITO */}
          <div className={fx.group} style={{ flex: 1, padding: '14px 22px 0 10px', minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', isolation: 'isolate' }}>
            <FlagFade code={data.country} fadeTo="radial" opacity={0.13} dim={0} animated={false} style={{ zIndex: -1 }} />
            <div style={{ display: data.city ? 'block' : 'none', fontSize: '14px', fontWeight: 600, color: pal.muted }}><IconPin /> {data.city}</div>
            <div style={{ ...row, justifyContent: 'space-between', borderBottom: `1px solid ${rgba('#ffffff', 0.12)}`, paddingBottom: '6px' }}>
              <div style={{ display: data.hasLength ? 'block' : 'none' }}>
                {chip('EXTENSIÓN')}
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                  <IconRuler />
                  <span style={{ fontSize: '32px', fontWeight: 700, marginLeft: '8px', lineHeight: 1 }}>{data.hasLength ? thousands(data.lengthM) : ''}</span>
                  <span style={{ fontSize: '13px', marginLeft: '3px', alignSelf: 'flex-end' }}>m</span>
                </div>
              </div>
              <div style={{ display: data.direction ? 'block' : 'none', textAlign: 'right' }}>
                {chip('SENTIDO')}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '6px', fontSize: '16px', fontWeight: 700 }}>
                  <IconDirection cw={data.direction === 'cw'} />
                  <span style={{ marginLeft: '6px' }}>{data.direction === 'cw' ? 'HORARIO' : 'ANTIHORARIO'}</span>
                </div>
              </div>
            </div>
            <div style={{ ...row, display: data.curveCount ? 'flex' : 'none', justifyContent: 'space-between' }}>
              <span>{chip('CURVAS')} <span style={{ fontSize: '24px', fontWeight: 700, marginLeft: '8px', verticalAlign: 'middle' }}>{data.curveCount}</span></span>
              <span style={{ fontSize: '22px', fontWeight: 700, display: data.turns.L + data.turns.R ? 'inline' : 'none' }}>
                <span style={{ color: pal.muted }}>‹‹‹</span> {data.turns.L} {chip('IZQ')} <span style={{ marginLeft: '8px' }}>{data.turns.R}</span> {chip('DER')} <span style={{ color: pal.muted }}>›››</span>
              </span>
            </div>
            <div style={{ marginTop: '10px', display: data.sectorLens.length > 1 ? 'block' : 'none' }}>
              {chip('SECTORES')}
              <SectorChips data={data} />
            </div>
            <RecordLine config={config} pal={pal} chip={chip} />
            <div className={fx.group} style={{ display: data.recordName ? 'flex' : 'none', alignItems: 'flex-end', justifyContent: 'flex-end', marginTop: 'auto', height: '118px', flexShrink: 0 }}>
              <DriverName data={data} config={config} pal={pal} />
              <RecordPhoto config={config} sc={sc} pal={pal} height={118} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectorChips({ data, size = 1 }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '6px' }}>
      {data.sectorLens.map((len, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', marginRight: '10px', marginBottom: '4px', borderBottom: `2px solid ${SECTOR_PALETTE[i % SECTOR_PALETTE.length]}` }}>
          <span style={{ backgroundColor: SECTOR_PALETTE[i % SECTOR_PALETTE.length], color: '#000', fontSize: `${11 * size}px`, fontWeight: 800, padding: '1px 5px' }}>S{i + 1}</span>
          <span style={{ fontSize: `${14 * size}px`, fontWeight: 700, marginLeft: '4px' }}>{len !== null ? len : ''}<span style={{ fontSize: `${9 * size}px`, marginLeft: '1px' }}>{len !== null ? 'm' : ''}</span></span>
        </span>
      ))}
    </div>
  );
}

function RecordLine({ config, pal, chip, size = 1 }) {
  return (
    <>
      <div style={{ display: config?.recordTime ? 'flex' : 'none', alignItems: 'center', marginTop: '8px', justifyContent: 'space-between', borderTop: `1px solid ${rgba('#ffffff', 0.12)}`, paddingTop: '8px' }}>
        {chip('RÉCORD')}
        <span style={{ fontSize: `${30 * size}px`, fontWeight: 700, letterSpacing: '0.5px' }}>{config?.recordTime}</span>
        <span style={{ display: config?.recordSpeed ? 'flex' : 'none', flexDirection: 'column', alignItems: 'flex-end', minWidth: `${78 * size}px` }}>
          <span style={{ fontSize: `${24 * size}px`, fontWeight: 700, lineHeight: 1 }}>{config?.recordSpeed}<span style={{ fontSize: '10px', marginLeft: '2px' }}>km/h</span></span>
          <span style={{ width: `${78 * size}px`, height: '4px', marginTop: '3px', background: `linear-gradient(90deg, ${pal.accent}, ${rgba(pal.accent, 0.1)})` }} />
        </span>
      </div>
      <div style={{ display: config?.recordTime ? 'block' : 'none', fontSize: `${13 * size}px`, fontWeight: 600, color: pal.muted, marginTop: '2px' }}>
        {[config?.recordDate, config?.recordEvent].filter(Boolean).join(' · ')}
      </div>
    </>
  );
}

function DriverName({ data, config, pal, size = 1 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '12px', marginBottom: `${22 * size}px` }}>
      <span style={{ fontSize: `${15 * size}px`, fontWeight: 500, color: pal.muted }}>{data.firstName}</span>
      <span style={{ fontSize: `${20 * size}px`, fontWeight: 700 }}>{data.surname}</span>
      <span style={{ fontSize: `${12 * size}px`, fontWeight: 600, color: pal.muted }}>{config?.recordTeam}</span>
    </div>
  );
}

// Tarjeta de un dato (etiqueta chica + valor grande)
function Stat({ pal, label, value, unit, icon, accent, size = 1, align = 'left' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start', lineHeight: 1 }}>
      <span style={{ fontSize: `${11 * size}px`, fontWeight: 700, color: pal.muted, letterSpacing: '1px', marginBottom: `${5 * size}px` }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', fontSize: `${28 * size}px`, fontWeight: 700, color: accent || pal.text, whiteSpace: 'nowrap' }}>
        {icon && <span style={{ display: 'flex', marginRight: `${6 * size}px`, color: pal.muted }}>{icon}</span>}
        {value}{unit && <span style={{ fontSize: `${12 * size}px`, marginLeft: '3px', alignSelf: 'flex-end', marginBottom: `${3 * size}px` }}>{unit}</span>}
      </span>
    </div>
  );
}

// Lista de datos del circuito que existen (extensión, sentido, curvas, izq/der)
function circuitStats(data) {
  const out = [];
  if (data.hasLength) out.push({ key: 'len', label: 'EXTENSIÓN', value: thousands(data.lengthM), unit: 'm', icon: <IconRuler /> });
  if (data.direction) out.push({ key: 'dir', label: 'SENTIDO', value: data.direction === 'cw' ? 'HORARIO' : 'ANTIHORARIO', icon: <IconDirection cw={data.direction === 'cw'} />, small: true });
  if (data.curveCount) out.push({ key: 'cur', label: 'CURVAS', value: data.curveCount, unit: data.turns.L + data.turns.R ? `${data.turns.L} IZQ · ${data.turns.R} DER` : '' });
  return out;
}

// ---------- CINEMÁTICO: pantalla grande con el circuito protagonista ----------
function Cinematic({ data, pal, config, sc, bRad, fx, running, isVisible }) {
  const W = 1400; const H = 560; const TW = 860; const TH = 480;
  const stats = circuitStats(data);
  const { wd } = data;
  const panel = { backgroundColor: rgba(pal.deep, 0.72), borderLeft: `3px solid ${pal.accent}`, padding: '10px 14px', backdropFilter: 'blur(2px)' };
  return (
    <div className={fx.group} style={{ width: `${W}px`, fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase' }}>
      <div style={boxStyle(pal, bRad)}>
        {data.weatherFx && <WeatherScene category={data.weather.category} code={wd.weathercode} width={W} height={H + 76} running={running} idPrefix="ciWx" />}
        <Header config={config} data={data} pal={pal} fx={fx} height={76} fontSize={44} logoW={250} right={(
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: '0 24px', lineHeight: 1.15, flexShrink: 0 }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: pal.accent, display: data.eventTitle ? 'block' : 'none' }}>{data.eventTitle}</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: pal.muted, display: data.city ? 'block' : 'none' }}><IconPin size={13} /> {data.city}</span>
          </div>
        )} />
        <div style={{ position: 'relative', height: `${H}px`, overflow: 'hidden' }}>
          <Wind data={data} width={W} height={H} running={running} idPrefix="ciWind" count={90} />
          <div style={{ position: 'absolute', left: `${(W - TW) / 2}px`, top: `${(H - TH) / 2 - 10}px`, zIndex: 1 }}>
            <TrackView data={data} width={TW} height={TH} tilt={52} pal={pal} running={running} isVisible={isVisible} config={config} idPrefix="ciCin" />
          </div>
          {/* Columna izquierda: datos del circuito */}
          <div className={fx.group} style={{ position: 'absolute', left: '24px', top: '24px', width: '230px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 3 }}>
            {stats.map(st => (
              <div key={st.key} style={panel}><Stat pal={pal} label={st.label} value={st.value} unit={st.unit} icon={st.icon} size={st.small ? 0.75 : 1} /></div>
            ))}
            {data.sectorLens.length > 1 && <div style={panel}><span style={{ fontSize: '11px', fontWeight: 700, color: pal.muted, letterSpacing: '1px' }}>SECTORES</span><SectorChips data={data} /></div>}
          </div>
          {/* Columna derecha: récord */}
          <div className={fx.group} style={{ position: 'absolute', right: '24px', top: '24px', width: '250px', display: config?.recordTime ? 'flex' : 'none', flexDirection: 'column', zIndex: 3 }}>
            <div style={{ ...panel, borderLeft: 'none', borderRight: `3px solid ${pal.red}`, textAlign: 'right' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: pal.muted, letterSpacing: '1px' }}>RÉCORD DEL CIRCUITO</span>
              <div style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.1 }}>{config?.recordTime}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, display: config?.recordSpeed ? 'block' : 'none' }}>{config?.recordSpeed} <span style={{ fontSize: '10px' }}>KM/H</span></div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: pal.muted, marginTop: '2px' }}>{[config?.recordDate, config?.recordEvent].filter(Boolean).join(' · ')}</div>
            </div>
            <div style={{ display: data.recordName ? 'flex' : 'none', alignItems: 'flex-end', justifyContent: 'flex-end', marginTop: '6px' }}>
              <DriverName data={data} config={config} pal={pal} />
              <RecordPhoto config={config} sc={sc} pal={pal} height={130} />
            </div>
          </div>
          {/* Franja inferior: clima + rosa de los vientos */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '84px', display: wd ? 'flex' : 'none', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: `linear-gradient(0deg, ${rgba(pal.deep, 0.92)}, ${rgba(pal.deep, 0)})`, zIndex: 3 }}>
            <WeatherRow data={data} pal={pal} scale={1} />
            <Compass data={data} pal={pal} size={60} running={running} idPrefix="ciCmp" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- BANDA INFERIOR: zócalo ancho ----------
function Band({ data, pal, config, bRad, fx, running, isVisible }) {
  const W = 1500; const H = 230; const TW = 380; const TH = 220;
  const stats = circuitStats(data);
  const { wd } = data;
  const sep = { width: '1px', alignSelf: 'stretch', margin: '22px 0', backgroundColor: rgba('#ffffff', 0.16) };
  return (
    <div className={fx.group} style={{ width: `${W}px`, fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase' }}>
      <div style={{ ...boxStyle(pal, bRad), height: `${H}px`, display: 'flex', alignItems: 'stretch', borderTop: `3px solid ${pal.accent}` }}>
        {data.weatherFx && <WeatherScene category={data.weather.category} code={wd.weathercode} width={W} height={H} running={running} idPrefix="ciWx" />}
        {/* Nombre */}
        <div className={fx.group} style={{ position: 'relative', isolation: 'isolate', width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', backgroundColor: rgba(pal.deep, 0.6) }}>
          <FlagFade code={data.country} fadeTo="right" opacity={0.6} dim={0.45} style={{ zIndex: -1 }} />
          {config?.categoryLogo && <img src={config.categoryLogo} alt="" style={{ maxHeight: '46px', maxWidth: '200px', objectFit: 'contain', alignSelf: 'flex-start', marginBottom: '10px' }} />}
          <span style={{ fontSize: '13px', fontWeight: 700, color: pal.accent, letterSpacing: '1px', display: data.eventTitle ? 'block' : 'none' }}>{data.eventTitle}</span>
          <span style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.05, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}><FlagChip code={data.country} height={24} style={{ marginRight: '10px', marginTop: '-6px' }} />{data.circuitName}</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: pal.muted, marginTop: '4px', display: data.city ? 'block' : 'none' }}><IconPin /> {data.city}</span>
        </div>
        {/* Circuito */}
        <div style={{ position: 'relative', width: `${TW}px`, flexShrink: 0, overflow: 'hidden' }}>
          <Wind data={data} width={TW} height={H} running={running} idPrefix="ciWind" count={22} />
          <div style={{ position: 'relative', zIndex: 1, marginTop: `${(H - TH) / 2}px` }}>
            <TrackView data={data} width={TW} height={TH} tilt={40} pal={pal} running={running} isVisible={isVisible} config={config} idPrefix="ciBand" />
          </div>
        </div>
        {/* Datos */}
        <div className={fx.group} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px', padding: '0 22px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '26px' }}>
            {stats.map(st => <Stat key={st.key} pal={pal} label={st.label} value={st.value} unit={st.key === 'cur' ? '' : st.unit} icon={st.icon} size={st.small ? 0.7 : 0.9} />)}
          </div>
          <div style={{ display: config?.recordTime ? 'flex' : 'none', alignItems: 'baseline', gap: '10px' }}>
            <span style={chipStyle(pal, 11)}>RÉCORD</span>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>{config?.recordTime}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: pal.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[data.recordName, config?.recordDate].filter(Boolean).join(' · ')}</span>
          </div>
          {data.sectorLens.length > 1 && <SectorChips data={data} size={0.9} />}
        </div>
        <div style={{ ...sep, display: wd ? 'block' : 'none' }} />
        {/* Clima */}
        <div style={{ position: 'relative', display: wd ? 'flex' : 'none', alignItems: 'center', gap: '18px', padding: '0 22px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <WeatherRow data={data} pal={pal} scale={0.8} items={[]} />
            <WeatherRow data={data} pal={pal} scale={0.62} items={['hum', 'rain']} temp={false} />
          </div>
          <Compass data={data} pal={pal} size={78} running={running} idPrefix="ciCmp" />
        </div>
      </div>
    </div>
  );
}

// ---------- VERTICAL: columna lateral ----------
function Vertical({ data, pal, config, sc, bRad, fx, running, isVisible }) {
  const W = 440; const TH = 300;
  const stats = circuitStats(data);
  const { wd } = data;
  return (
    <div className={fx.group} style={{ width: `${W}px`, fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase' }}>
      <div style={boxStyle(pal, bRad)}>
        {data.weatherFx && <WeatherScene category={data.weather.category} code={wd.weathercode} width={W} height={900} running={running} idPrefix="ciWx" />}
        <div className={fx.group} style={{ position: 'relative', isolation: 'isolate', padding: '14px 18px 10px', backgroundColor: rgba(pal.deep, 0.6), borderBottom: `2px solid ${pal.line}` }}>
          <FlagFade code={data.country} fadeTo="left" opacity={0.6} dim={0.4} style={{ left: 'auto', width: '75%', zIndex: -1 }} />
          {config?.categoryLogo && <img src={config.categoryLogo} alt="" style={{ maxHeight: '40px', maxWidth: '180px', objectFit: 'contain', display: 'block', marginBottom: '8px' }} />}
          <span style={{ fontSize: '12px', fontWeight: 700, color: pal.accent, letterSpacing: '1px', display: data.eventTitle ? 'block' : 'none' }}>{data.eventTitle}</span>
          <div style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1.05 }}><FlagChip code={data.country} height={20} style={{ marginRight: '8px', marginTop: '-5px' }} />{data.circuitName}</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: pal.muted, marginTop: '3px', display: data.city ? 'block' : 'none' }}><IconPin /> {data.city}</div>
        </div>
        <div style={{ position: 'relative', height: `${TH + 10}px`, overflow: 'hidden' }}>
          <Wind data={data} width={W} height={TH + 10} running={running} idPrefix="ciWind" count={28} />
          <div style={{ position: 'relative', zIndex: 1, marginTop: '5px' }}>
            <TrackView data={data} width={W} height={TH} tilt={46} pal={pal} running={running} isVisible={isVisible} config={config} idPrefix="ciVert" />
          </div>
        </div>
        <div className={fx.group} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: rgba('#ffffff', 0.1), borderTop: `1px solid ${rgba('#ffffff', 0.1)}` }}>
          {stats.map(st => (
            <div key={st.key} style={{ backgroundColor: rgba(pal.deep, 0.55), padding: '10px 14px', gridColumn: st.key === 'cur' && stats.length === 3 ? 'span 2' : undefined }}>
              <Stat pal={pal} label={st.label} value={st.value} unit={st.unit} icon={st.icon} size={st.small ? 0.62 : 0.85} />
            </div>
          ))}
        </div>
        {data.sectorLens.length > 1 && <div style={{ position: 'relative', padding: '8px 14px 2px' }}><SectorChips data={data} size={0.95} /></div>}
        <div style={{ position: 'relative', padding: '0 14px 10px', display: config?.recordTime ? 'block' : 'none' }}>
          <RecordLine config={config} pal={pal} chip={(t) => <span style={chipStyle(pal, 11)}>{t}</span>} size={0.85} />
          <div style={{ display: data.recordName ? 'flex' : 'none', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '4px' }}>
            <DriverName data={data} config={config} pal={pal} size={0.9} />
            <RecordPhoto config={config} sc={sc} pal={pal} height={96} />
          </div>
        </div>
        <div style={{ position: 'relative', display: wd ? 'flex' : 'none', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: pal.panel, borderTop: `2px solid ${pal.line}` }}>
          <WeatherRow data={data} pal={pal} scale={0.62} />
          <Compass data={data} pal={pal} size={50} running={running} idPrefix="ciCmp" label={false} />
        </div>
      </div>
    </div>
  );
}

// ---------- COMPACTO: tarjeta chica ----------
function Compact({ data, pal, config, bRad, fx, running, isVisible }) {
  const W = 560; const TW = 270; const TH = 180;
  const stats = circuitStats(data);
  const { wd, weather } = data;
  return (
    <div className={fx.group} style={{ width: `${W}px`, fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase' }}>
      <div style={boxStyle(pal, bRad)}>
        {data.weatherFx && <WeatherScene category={weather.category} code={wd.weathercode} width={W} height={44 + TH} running={running} idPrefix="ciWx" />}
        <Header config={config} data={data} pal={pal} fx={fx} height={44} fontSize={22} logoW={130} />
        <div style={{ display: 'flex', position: 'relative' }}>
          <div style={{ position: 'relative', width: `${TW}px`, height: `${TH}px`, flexShrink: 0, overflow: 'hidden' }}>
            <Wind data={data} width={TW} height={TH} running={running} idPrefix="ciWind" count={14} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <TrackView data={data} width={TW} height={TH} tilt={0} pal={pal} running={running} isVisible={isVisible} config={config} idPrefix="ciCmpt" />
            </div>
          </div>
          <div className={fx.group} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', padding: '10px 16px 10px 4px', minWidth: 0 }}>
            {stats.map(st => <Stat key={st.key} pal={pal} label={st.label} value={st.value} unit={st.key === 'cur' ? '' : st.unit} size={st.small ? 0.6 : 0.72} />)}
            <div style={{ display: wd ? 'flex' : 'none', alignItems: 'center', gap: '8px', borderTop: `1px solid ${rgba('#ffffff', 0.14)}`, paddingTop: '8px' }}>
              {weather && <WeatherIcon category={weather.category} color="#ffc93c" size={22} />}
              <span style={{ fontSize: '22px', fontWeight: 700 }}>{wd ? Math.round(wd.temp) : '-'}°</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: pal.muted, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{weather?.label}</span>
              <Compass data={data} pal={pal} size={36} running={running} idPrefix="ciCmp" label={false} />
              <span style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{num(wd?.windSpeed)}<span style={{ fontSize: '9px' }}> KM/H</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
