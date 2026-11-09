import { useMemo, useState } from 'react';
import { getGraphicFrame, useImageAspect } from '../utils/raceVisuals';
import { buildTrack, pointOnTrack, nearestOnTrack, trackDirection, turnAt, sectorRanges, trackSegment, projectTilt, DEFAULT_ASPECT } from '../utils/trackPath';
import { getElitePalette, ELITE_FONT, SECTOR_PALETTE, photoUrl, rgba } from '../utils/elite';
import { getWeatherVisual, WeatherIcon } from './Weather';
import { WindLayer } from './WindField';
import CircuitTour from './CircuitTour';

const W = 980;          // ancho de la gráfica
const TW = 600;         // ancho de la zona del circuito
const TH = 300;         // alto de la zona del circuito

const thousands = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const polyLen = (pts) => pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
const toPoints = (pts) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

// Iconos simples (SVG en línea, heredan el color)
const IconPin = ({ size = 12 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: '-2px' }}><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>);
const IconRuler = () => (<svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6h24M1 1v10M25 1v10" /></svg>);
const IconDirection = ({ cw }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d={cw ? 'M12 3a9 9 0 1 1-8.5 6' : 'M12 3a9 9 0 1 0 8.5 6'} />
    <path d={cw ? 'M3.5 4v5h5' : 'M20.5 4v5h-5'} />
  </svg>
);
const IconWind = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7" /></svg>);
const IconDrop = () => (<svg width="22" height="26" viewBox="0 0 24 28" fill="currentColor"><path d="M12 2C9 7 5 11.5 5 16.5A7 7 0 0 0 19 16.5C19 11.5 15 7 12 2z" /></svg>);
const IconRain = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8.5 3.5 3.5 0 0 1 17.5 15z" /><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" /></svg>);

// PRESENTACIÓN DEL CIRCUITO (estilo Elite): circuito en perspectiva dibujado con el trazado y coloreado por sectores,
// datos del circuito, récord con su piloto y el clima. Formatos: 'elite' (en perspectiva) | 'flat' (visto desde arriba).
export default function CircuitIntro({ config, isVisible, id = 'circuitIntro' }) {
  const { wrapperStyle, bRad } = getGraphicFrame(config, id, isVisible, { x: 470, y: 230, scale: 1 }, 45);
  const pal = getElitePalette(config);
  const flat = config?.circuitIntroFormat === 'flat';

  const trackImage = config?.trackImage || null;
  const imageAspect = useImageAspect(trackImage);
  const aspect = trackImage ? imageAspect : DEFAULT_ASPECT;
  const trackPath = config?.trackPath;
  const splits = config?.trackSectors;
  const curves = config?.trackCurves;

  // Circuito: trazado suavizado -> perspectiva -> encuadre en la zona del circuito
  const geo = useMemo(() => {
    if (!aspect) return null;
    const track = buildTrack(trackPath, { width: TW, fit: true, pad: 10, minHeight: TH, maxHeight: TH, aspect });
    if (!track) return null;
    const tilt = flat ? 0 : 52;
    const proj = (p) => projectTilt(p, { cx: TW / 2, cy: TH / 2, tilt, distance: 700 });
    const projected = track.samples.map(proj);
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    projected.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const pad = 34;
    const k = Math.min((TW - pad * 2) / Math.max(1, maxX - minX), (TH - pad * 2 - 10) / Math.max(1, maxY - minY));
    const ox = (TW - (maxX - minX) * k) / 2 - minX * k;
    const oy = (TH - (maxY - minY) * k) / 2 - minY * k + 6;
    const f = (p) => { const q = proj(p); return { x: q.x * k + ox, y: q.y * k + oy }; };
    const ranges = sectorRanges(splits);
    const sectors = ranges.map(([a, b], i) => {
      const pts = trackSegment(track, a, b).map(f);
      return { i, a, b, pts, flat: trackSegment(track, a, b), len: polyLen(pts), color: SECTOR_PALETTE[i % SECTOR_PALETTE.length], pin: f(pointOnTrack(track, (a + b) / 2)) };
    });
    const start = f(pointOnTrack(track, 0));
    const outline = track.samples.map(f);
    return { sectors, start, outline, track };
  }, [trackPath, splits, aspect, flat]);

  // Datos que salen del trazado
  const dirSetting = config?.circuitDirection;
  const direction = dirSetting === 'cw' || dirSetting === 'ccw' ? dirSetting : (aspect && Array.isArray(trackPath) && trackPath.length >= 3 ? trackDirection(trackPath, aspect) : null);
  const turns = useMemo(() => {
    const out = { L: 0, R: 0 };
    if (!aspect || !Array.isArray(trackPath) || trackPath.length < 3) return out;
    (curves || []).forEach(c => {
      const t = Number.isFinite(c.t) ? c.t : (nearestOnTrack(trackPath, aspect, c) || {}).t;
      const side = Number.isFinite(t) ? turnAt(trackPath, aspect, t) : null;
      if (side) out[side] += 1;
    });
    return out;
  }, [curves, trackPath, aspect]);
  const curveCount = Array.isArray(curves) ? curves.length : 0;
  // Recorrido (PANEL > modo de la presentación): 'static' | 'tour' (vuelta en primera persona) | 'curves' (curva por curva)
  const tourMode = ['tour', 'curves'].includes(config?.circuitIntroMode) ? config.circuitIntroMode : 'static';
  const curveStops = useMemo(() => {
    if (!aspect || !Array.isArray(trackPath) || trackPath.length < 3) return [];
    return (curves || []).map(c => {
      const t = Number.isFinite(c.t) ? c.t : (nearestOnTrack(trackPath, aspect, c) || {}).t;
      return Number.isFinite(t) ? { id: c.id, name: c.name, t, side: turnAt(trackPath, aspect, t) } : null;
    }).filter(Boolean);
  }, [curves, trackPath, aspect]);
  const lengthM = parseFloat(String(config?.circuitLength || '').replace(',', '.'));
  const hasLength = Number.isFinite(lengthM) && lengthM > 0;
  const sectorLens = sectorRanges(splits).map(([a, b]) => (hasLength ? Math.round(lengthM * (b - a)) : null));

  const circuitName = config?.circuitName || config?.circuito || 'CIRCUITO';
  const eventTitle = config?.eventTitle || config?.campeonato || '';
  const wd = config?.weatherData;
  const weather = wd ? getWeatherVisual(wd.weathercode) : null;
  const [photoOk, setPhotoOk] = useState(true);
  const photo = config?.recordNumber && config?.photosPath ? photoUrl(config.recordNumber) : null;
  const recordName = String(config?.recordDriver || '').trim();
  const [firstName, ...rest] = recordName.split(/\s+/);
  const surname = rest.join(' ');

  const chip = (text) => (
    <span style={{ display: 'inline-block', backgroundColor: pal.deep, color: pal.text, fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '2px', border: `1px solid ${rgba('#ffffff', 0.12)}` }}>{text}</span>
  );
  const row = { display: 'flex', alignItems: 'center', marginTop: '8px' };

  return (
    <div style={wrapperStyle}>
      <style>{`@keyframes ciDraw { to { stroke-dashoffset: 0; } } @keyframes ciPin { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ width: `${W}px`, fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase' }}>
        {/* Franja del evento */}
        <div style={{ display: eventTitle ? 'inline-block' : 'none', backgroundColor: rgba(pal.deep, 0.88), padding: '4px 14px', fontSize: '17px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '2px' }}>{eventTitle}</div>

        <div style={{ background: pal.background, borderRadius: bRad, overflow: 'hidden', boxShadow: '0 18px 40px rgba(0,0,0,0.55)' }}>
          {/* Encabezado: logo de la categoría + nombre del circuito */}
          <div style={{ display: 'flex', alignItems: 'center', height: '58px', backgroundColor: rgba(pal.deep, 0.55), borderBottom: `2px solid ${pal.line}` }}>
            <div style={{ display: config?.categoryLogo ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', height: '100%', minWidth: '210px', backgroundColor: '#0b0b0b', padding: '0 14px', boxSizing: 'border-box' }}>
              {config?.categoryLogo && <img src={config.categoryLogo} alt="" style={{ maxHeight: '42px', maxWidth: '190px', objectFit: 'contain' }} />}
            </div>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '1px', padding: '6px 20px 0', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{circuitName}</span>
          </div>

          <div style={{ display: 'flex', position: 'relative' }}>
            {/* CIRCUITO */}
            <div style={{ width: `${TW}px`, height: `${TH + 90}px`, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
              {/* Viento: flechitas que se mueven en la dirección y con la fuerza del viento del clima cargado */}
              <WindLayer width={TW} height={TH + 90} count={46} variant="arrows" weatherData={wd} running={!!isVisible} idPrefix="ciWind" />
              {tourMode !== 'static' && geo && (
                <div style={{ marginTop: '6px', position: 'relative' }}>
                  <CircuitTour track={geo.track} sectors={geo.sectors} curves={curveStops} mode={tourMode} running={!!isVisible} width={TW} height={TH} pal={pal}
                    tourSec={parseFloat(config?.circuitIntroTourSec) || 16} tilt={flat ? 40 : 56} />
                </div>
              )}
              <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`} style={{ display: tourMode !== 'static' && geo ? 'none' : 'block', marginTop: '6px', overflow: 'visible', position: 'relative' }}>
                <defs>
                  <filter id="ciGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
                </defs>
                {geo && (
                  <g key={isVisible ? 'on' : 'off'}>
                    {/* Grosor de la pista (lado oscuro) para el efecto 3D */}
                    {!flat && <polyline points={toPoints(geo.outline.map(p => ({ x: p.x, y: p.y + 7 })))} fill="none" stroke={rgba(pal.deep, 0.9)} strokeWidth="11" strokeLinejoin="round" />}
                    {geo.sectors.map(s => (
                      <g key={s.i}>
                        <polyline points={toPoints(s.pts)} fill="none" stroke={s.color} strokeOpacity="0.45" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" filter="url(#ciGlow)"
                          style={{ strokeDasharray: s.len, strokeDashoffset: s.len, animation: `ciDraw 0.55s ease-out ${(0.25 + s.i * 0.45).toFixed(2)}s forwards` }} />
                        <polyline points={toPoints(s.pts)} fill="none" stroke={s.color} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round"
                          style={{ strokeDasharray: s.len, strokeDashoffset: s.len, animation: `ciDraw 0.55s ease-out ${(0.25 + s.i * 0.45).toFixed(2)}s forwards` }} />
                        <polyline points={toPoints(s.pts)} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                          style={{ strokeDasharray: s.len, strokeDashoffset: s.len, animation: `ciDraw 0.55s ease-out ${(0.25 + s.i * 0.45).toFixed(2)}s forwards` }} />
                      </g>
                    ))}
                    {/* Pines: largada y cada sector */}
                    {[{ p: geo.start, label: 'S/F', color: '#ffffff', text: '#000', delay: 0.2 }, ...(geo.sectors.length > 1 ? geo.sectors.map(s => ({ p: s.pin, label: `S${s.i + 1}`, color: s.color, text: '#000', delay: 0.5 + s.i * 0.45 })) : [])].map((pin, i) => (
                      <g key={`pin${i}`} style={{ opacity: 0, animation: `ciPin 0.35s ease-out ${pin.delay.toFixed(2)}s forwards` }}>
                        <line x1={pin.p.x} y1={pin.p.y} x2={pin.p.x} y2={pin.p.y - 20} stroke="#fff" strokeWidth="1.5" />
                        <circle cx={pin.p.x} cy={pin.p.y - 30} r="11" fill={pin.color} stroke="#0b0f3a" strokeWidth="2" />
                        <text x={pin.p.x} y={pin.p.y - 26.5} textAnchor="middle" fontSize={pin.label.length > 2 ? 8 : 9.5} fontWeight="800" fill={pin.text} fontFamily="Arial, sans-serif">{pin.label}</text>
                      </g>
                    ))}
                  </g>
                )}
                {!geo && <text x={TW / 2} y={TH / 2} textAnchor="middle" fill={pal.muted} fontSize="16" fontFamily="Arial">DIBUJÁ EL TRAZADO EN LA PESTAÑA CIRCUITO</text>}
              </svg>

              {/* CLIMA */}
              <div style={{ display: wd ? 'flex' : 'none', alignItems: 'center', position: 'absolute', left: '16px', bottom: '14px', height: '62px', padding: '0 18px', borderLeft: `3px solid ${pal.line}`, backgroundColor: pal.panel, borderRadius: '0 6px 6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
                  {weather && <WeatherIcon category={weather.category} color="#ffc93c" size={24} />}
                  <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px', lineHeight: 1 }}>
                    <span style={{ fontSize: '30px', fontWeight: 700 }}>{wd ? Math.round(wd.temp) : '-'}°</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: pal.muted }}>{weather ? weather.label : ''}</span>
                  </div>
                </div>
                {[
                  { icon: <IconWind />, value: wd && wd.windSpeed !== undefined ? Math.round(wd.windSpeed) : '-', unit: 'km/h', label: 'VIENTO' },
                  { icon: <span style={{ color: '#3db6ff' }}><IconDrop /></span>, value: wd && wd.humidity !== null && wd.humidity !== undefined ? Math.round(wd.humidity) : '-', unit: '%', label: 'HUMEDAD' },
                  { icon: <IconRain />, value: wd && wd.precipProb !== null && wd.precipProb !== undefined ? Math.round(wd.precipProb) : '-', unit: '%', label: 'LLUVIA' }
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', marginRight: '22px' }}>
                    <span style={{ color: pal.muted, display: 'flex' }}>{item.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '7px', lineHeight: 1 }}>
                      <span style={{ fontSize: '28px', fontWeight: 700 }}>{item.value}<span style={{ fontSize: '12px', marginLeft: '2px' }}>{item.unit}</span></span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#3db6ff', letterSpacing: '0.5px' }}>{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DATOS DEL CIRCUITO */}
            <div style={{ flex: 1, padding: '14px 22px 0 10px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: config?.circuitCity ? 'block' : 'none', fontSize: '14px', fontWeight: 600, color: pal.muted }}><IconPin /> {config?.circuitCity}</div>

              <div style={{ ...row, justifyContent: 'space-between', borderBottom: `1px solid ${rgba('#ffffff', 0.12)}`, paddingBottom: '6px' }}>
                <div style={{ display: hasLength ? 'block' : 'none' }}>
                  {chip('EXTENSIÓN')}
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <IconRuler />
                    <span style={{ fontSize: '32px', fontWeight: 700, marginLeft: '8px', lineHeight: 1 }}>{hasLength ? thousands(lengthM) : ''}</span>
                    <span style={{ fontSize: '13px', marginLeft: '3px', alignSelf: 'flex-end' }}>m</span>
                  </div>
                </div>
                <div style={{ display: direction ? 'block' : 'none', textAlign: 'right' }}>
                  {chip('SENTIDO')}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '6px', fontSize: '16px', fontWeight: 700 }}>
                    <IconDirection cw={direction === 'cw'} />
                    <span style={{ marginLeft: '6px' }}>{direction === 'cw' ? 'HORARIO' : 'ANTIHORARIO'}</span>
                  </div>
                </div>
              </div>

              <div style={{ ...row, display: curveCount ? 'flex' : 'none', justifyContent: 'space-between' }}>
                <span>{chip('CURVAS')} <span style={{ fontSize: '24px', fontWeight: 700, marginLeft: '8px', verticalAlign: 'middle' }}>{curveCount}</span></span>
                <span style={{ fontSize: '22px', fontWeight: 700, display: turns.L + turns.R ? 'inline' : 'none' }}>
                  <span style={{ color: pal.muted }}>‹‹‹</span> {turns.L} {chip('IZQ')} <span style={{ marginLeft: '8px' }}>{turns.R}</span> {chip('DER')} <span style={{ color: pal.muted }}>›››</span>
                </span>
              </div>

              <div style={{ marginTop: '10px', display: sectorLens.length > 1 ? 'block' : 'none' }}>
                {chip('SECTORES')}
                <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '6px' }}>
                  {sectorLens.map((len, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', marginRight: '10px', marginBottom: '4px', borderBottom: `2px solid ${SECTOR_PALETTE[i % SECTOR_PALETTE.length]}` }}>
                      <span style={{ backgroundColor: SECTOR_PALETTE[i % SECTOR_PALETTE.length], color: '#000', fontSize: '11px', fontWeight: 800, padding: '1px 5px' }}>S{i + 1}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, marginLeft: '4px' }}>{len !== null ? len : ''}<span style={{ fontSize: '9px', marginLeft: '1px' }}>{len !== null ? 'm' : ''}</span></span>
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ ...row, display: config?.recordTime ? 'flex' : 'none', justifyContent: 'space-between', borderTop: `1px solid ${rgba('#ffffff', 0.12)}`, paddingTop: '8px' }}>
                {chip('RÉCORD')}
                <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '0.5px' }}>{config?.recordTime}</span>
                <span style={{ display: config?.recordSpeed ? 'flex' : 'none', flexDirection: 'column', alignItems: 'flex-end', minWidth: '78px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1 }}>{config?.recordSpeed}<span style={{ fontSize: '10px', marginLeft: '2px' }}>km/h</span></span>
                  <span style={{ width: '78px', height: '4px', marginTop: '3px', background: `linear-gradient(90deg, ${pal.accent}, ${rgba(pal.accent, 0.1)})` }} />
                </span>
              </div>
              <div style={{ display: config?.recordTime ? 'block' : 'none', fontSize: '13px', fontWeight: 600, color: pal.muted, marginTop: '2px' }}>
                {[config?.recordDate, config?.recordEvent].filter(Boolean).join(' · ')}
              </div>

              {/* Piloto del récord: fila propia abajo de todo */}
              <div style={{ display: recordName ? 'flex' : 'none', alignItems: 'flex-end', justifyContent: 'flex-end', marginTop: 'auto', height: '118px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '12px', marginBottom: '22px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: pal.muted }}>{firstName}</span>
                  <span style={{ fontSize: '20px', fontWeight: 700 }}>{surname}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: pal.muted }}>{config?.recordTeam}</span>
                </div>
                <div style={{ width: '100px', height: '118px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {photo && photoOk && <img src={photo} alt="" onError={() => setPhotoOk(false)} style={{ maxHeight: '118px', maxWidth: '110px', objectFit: 'contain' }} />}
                  <span style={{ display: photo && photoOk ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '44px', marginBottom: '30px', backgroundColor: pal.deep, fontSize: '26px', fontWeight: 800 }}>{config?.recordNumber || ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
