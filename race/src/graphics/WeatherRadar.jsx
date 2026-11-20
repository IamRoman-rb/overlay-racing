// RADAR DEL CLIMA: mapa meteorológico de la zona del circuito, al estilo de los mapas del tiempo de TV.
// Datos: grilla de MET Norway (config.weatherGrid, pedida desde el PANEL). Mapa: Natural Earth (límites, provincias,
// ciudades) o el satélite Blue Marble de la NASA. Todo gratuito y de uso libre citando la fuente (abajo a la derecha).
//
// Opciones (PERSONALIZAR):
//   weatherRadarLayer: temp (por defecto) | rain | wind     weatherRadarBase: map (por defecto) | satellite
//   weatherRadarParticles: partículas de viento animadas (sí)  weatherRadarAnimate: recorrer las próximas horas (sí)
//   Formatos: standard | compact | large | minimal (sin carteles)
import { useEffect, useMemo, useRef, useState } from 'react';
import { getGraphicFrame, getFormatStyles } from '../utils/raceVisuals';
import {
  sampleGrid, windComponents, projector, decodeRings, ringsInBox, pickCities, satelliteUrl, frameLabel,
  tempRgb, windRgb, rainRgb, TEMP_STOPS, WIND_STOPS, RAIN_STOPS, CIRCUIT_SPOT
} from '../utils/weatherMap';
import CategoryTag from '../components/CategoryTag';
import { makeFx } from '../utils/contentAnim';

const FRAME_MS = 1500;
const HOLD_MS = 3000;
const SIZES = { standard: [800, 500], compact: [512, 320], large: [1280, 800], minimal: [800, 500] };
const LAYERS = {
  temp: { title: 'TEMPERATURA', legend: 'Temperatura (°C)', stops: TEMP_STOPS, ticks: [-10, 0, 10, 20, 30, 40] },
  rain: { title: 'LLUVIA', legend: 'Lluvia (mm/h)', stops: RAIN_STOPS, ticks: [0.1, 1, 5, 20] },
  wind: { title: 'VIENTO', legend: 'Viento (km/h)', stops: WIND_STOPS, ticks: [0, 20, 45, 80] }
};

// Mapa (Natural Earth): se carga una sola vez y sólo cuando se usa el radar
let mapPromise = null;
function useMapData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!mapPromise) {
      mapPromise = import('../data/mapa.json').then(m => {
        const d = m.default || m;
        return { countries: decodeRings(d.countries), provinces: decodeRings(d.provinces), cities: d.cities || [] };
      });
    }
    mapPromise.then(d => { if (alive) setData(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return data;
}

// Campo de color: se calcula cada píxel de una imagen chica (1/4) interpolando la grilla y se estira con suavizado
function drawField(canvas, { grid, frame, layer, W, H, alpha }) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (!grid || !frame) return;
  const values = layer === 'rain' ? frame.rain : layer === 'wind' ? frame.wind : frame.temp;
  const color = layer === 'rain' ? rainRgb : layer === 'wind' ? windRgb : tempRgb;
  const w = Math.ceil(W / 4); const h = Math.ceil(H / 4);
  const small = document.createElement('canvas');
  small.width = w; small.height = h;
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const fy = (y / (h - 1)) * (grid.ny - 1);
    for (let x = 0; x < w; x++) {
      const v = sampleGrid(values, grid.nx, grid.ny, (x / (w - 1)) * (grid.nx - 1), fy);
      const o = (y * w + x) * 4;
      // Lluvia: debajo de 0,1 mm se va desvaneciendo (borde suave, sin escalones)
      const rgb = layer === 'rain' ? (Number.isFinite(v) && v >= 0.02 ? color(Math.max(0.1, v)) : null) : color(v);
      if (!rgb) { img.data[o + 3] = 0; continue; }
      img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2];
      img.data[o + 3] = layer === 'rain' ? Math.min(255, 150 + v * 25) * Math.min(1, v / 0.1) * alpha : 255 * alpha;
    }
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // La lluvia corta de golpe entre celdas: un desenfoque de ~1/4 de celda redondea los bordes, como un radar
  if (layer === 'rain' && 'filter' in ctx) ctx.filter = `blur(${Math.round(W / (grid.nx - 1) / 4)}px)`;
  ctx.drawImage(small, 0, 0, W, H);
  if ('filter' in ctx) ctx.filter = 'none';
}

// Límites y costas. Con fillLand se pinta la tierra y el mar (fondo de la capa de lluvia, va debajo del campo de color).
function drawMap(canvas, { map, box, W, H, fillLand = false, lines = true, k }) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (!map || !box) return;
  const pj = projector(box, W, H);
  const pathOf = (rings) => {
    ctx.beginPath();
    rings.forEach(r => {
      for (let i = 0; i < r.length; i += 2) {
        const x = pj.x(r[i]); const y = pj.y(r[i + 1]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    });
  };
  const countries = ringsInBox(map.countries, box);
  const provinces = ringsInBox(map.provinces, box);
  if (fillLand) {
    ctx.fillStyle = '#0d2238'; ctx.fillRect(0, 0, W, H);
    pathOf(countries); ctx.fillStyle = '#26331f'; ctx.fill('evenodd');
  }
  if (!lines) return;
  ctx.lineJoin = 'round';
  pathOf(provinces);
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 0.8 * k; ctx.stroke();
  pathOf(countries);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3 * k; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.3 * k; ctx.stroke();
}

// Partículas de viento: cada una sigue el viento interpolado y deja una estela que se desvanece
function useParticles(canvasRef, { grid, frame, W, H, running, k }) {
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !grid || !frame || !running) { if (cv) cv.getContext('2d').clearRect(0, 0, W, H); return undefined; }
    const ctx = cv.getContext('2d');
    const { u, v } = windComponents(frame);
    const count = Math.round((W * H) / 1100);
    const speed = 0.045 * k;                         // px por cuadro por km/h
    const rnd = () => ({ x: Math.random() * W, y: Math.random() * H, age: Math.floor(Math.random() * 120), life: 70 + Math.random() * 110 });
    const ps = Array.from({ length: count }, rnd);
    let raf = 0;
    const step = () => {
      // Desvanece las estelas
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = 'rgba(0,0,0,0.95)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.2 * k;
      ctx.beginPath();
      ps.forEach((p, i) => {
        const fx = (p.x / W) * (grid.nx - 1); const fy = (p.y / H) * (grid.ny - 1);
        const du = sampleGrid(u, grid.nx, grid.ny, fx, fy); const dv = sampleGrid(v, grid.nx, grid.ny, fx, fy);
        if (du === null || dv === null || p.age > p.life) { ps[i] = { ...rnd(), age: 0 }; return; }
        const nx = p.x + du * speed; const ny = p.y + dv * speed;
        ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny);
        p.x = nx; p.y = ny; p.age += 1;
        if (nx < 0 || nx > W || ny < 0 || ny > H) ps[i] = { ...rnd(), age: 0 };
      });
      ctx.stroke();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, grid, frame, W, H, running, k]);
}

export default function WeatherRadar({ config, isVisible, id = 'weatherRadar' }) {
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 1100, y: 60, scale: 1 });
  const format = SIZES[config?.[`${id}Format`]] ? config[`${id}Format`] : 'standard';
  const f = getFormatStyles(format === 'minimal' || format === 'large' ? 'standard' : format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const [W, H] = SIZES[format];
  const k = W / 800;
  const tk = k * (format === 'compact' ? 1.25 : 1);
  const px = (v) => `${Math.round(v * tk)}px`;
  const layer = LAYERS[config?.weatherRadarLayer] ? config.weatherRadarLayer : 'temp';
  const L = LAYERS[layer];
  const satellite = config?.weatherRadarBase === 'satellite';
  const grid = config?.weatherGrid?.frames?.length && config.weatherGrid.box ? config.weatherGrid : null;
  const box = grid?.box || null;
  const frames = useMemo(() => grid?.frames || [], [grid]);
  const animate = config?.weatherRadarAnimate !== false && frames.length > 1;
  const particles = config?.weatherRadarParticles !== false;
  const map = useMapData();

  // Animación: 0 = ahora, 1.. = próximas horas
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!animate || !isVisible) return undefined;
    let cur = 0; let timer = null;
    const tick = () => {
      cur = cur >= frames.length - 1 ? 0 : cur + 1;
      setFrame(cur);
      timer = setTimeout(tick, cur === 0 || cur === frames.length - 1 ? HOLD_MS : FRAME_MS);
    };
    const reset = setTimeout(() => setFrame(0), 0);
    timer = setTimeout(tick, HOLD_MS);
    return () => { clearTimeout(reset); clearTimeout(timer); };
  }, [animate, isVisible, frames.length]);
  const fi = animate && isVisible ? Math.min(frame, frames.length - 1) : 0;
  const fr = frames[fi] || null;

  const baseRef = useRef(null);
  const mapRef = useRef(null);
  const fieldRef = useRef(null);
  const partRef = useRef(null);
  useEffect(() => { drawMap(baseRef.current, { map, box, W, H, fillLand: !satellite && layer === 'rain', lines: false, k }); }, [map, box, W, H, satellite, layer, k]);
  useEffect(() => { drawMap(mapRef.current, { map, box, W, H, k }); }, [map, box, W, H, k]);
  useEffect(() => { drawField(fieldRef.current, { grid, frame: fr, layer, W, H, alpha: satellite ? 0.6 : (layer === 'rain' ? 0.95 : 1) }); }, [grid, fr, layer, W, H, satellite]);
  useParticles(partRef, { grid, frame: fr, W, H, running: particles && !!isVisible, k });

  // Carteles: el circuito y las ciudades con el valor de la capa
  const pj = box ? projector(box, W, H) : null;
  const circuit = box && pj ? { x: pj.x(box.lon), y: pj.y(box.lat) } : null;
  const valueAt = (lat, lon, name) => {
    if (!grid || !fr) return null;
    const spot = name && (grid.spots || []).find(s => s.name === name);
    const exact = spot ? spot[layer === 'rain' ? 'rain' : layer === 'wind' ? 'wind' : 'temp']?.[fi] : null;
    if (Number.isFinite(exact)) return exact;
    const vals = layer === 'rain' ? fr.rain : layer === 'wind' ? fr.wind : fr.temp;
    return sampleGrid(vals, grid.nx, grid.ny, ((lon - box.west) / (box.east - box.west)) * (grid.nx - 1), ((box.north - lat) / (box.north - box.south)) * (grid.ny - 1));
  };
  const fmt = (v) => {
    if (!Number.isFinite(v)) return '';
    if (layer === 'rain') return v >= 0.1 ? `${(Math.round(v * 10) / 10).toString().replace('.', ',')} mm` : '';
    if (layer === 'wind') return `${Math.round(v)} km/h`;
    return `${Math.round(v)}°`;
  };
  const place = String(config?.circuitName || config?.circuito || grid?.place || '').toUpperCase();
  const fontPx = 12 * tk;
  const cities = useMemo(() => {
    if (!map || !box) return [];
    const p = projector(box, W, H);
    const cx = p.x(box.lon); const cy = p.y(box.lat);
    return pickCities(map.cities, box, W, H, {
      max: format === 'compact' ? 6 : format === 'large' ? 16 : 11, fontPx,
      // Lugar reservado: el circuito, los carteles de arriba a la izquierda y la leyenda de abajo
      avoid: [
        { x0: cx - 100 * tk, x1: cx + 100 * tk, y0: cy - 40 * tk, y1: cy + 48 * tk },
        { x0: 0, x1: 300 * tk, y0: 0, y1: 100 * tk }, { x0: 0, x1: 300 * tk, y0: H - 95 * tk, y1: H }
      ]
    });
  }, [map, box, W, H, format, fontPx, tk]);

  const fx = makeFx(config, id, isVisible);
  const shadow = { paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.85)', strokeWidth: 3 * tk, strokeLinejoin: 'round' };
  const lo = L.stops[0][0]; const hi = L.stops[L.stops.length - 1][0];
  const pos = (v) => (layer === 'rain' ? Math.log(v / lo) / Math.log(hi / lo) : (v - lo) / (hi - lo));
  const credit = `Datos: MET Norway · Mapa: Natural Earth${satellite ? ' · Imagen: NASA' : ''}`;

  return (
    <div style={wrapperStyle}>
      <div className={fx.group} style={{ position: 'relative', width: `${W}px`, height: `${H}px`, borderRadius: bRad, overflow: 'hidden', backgroundColor: '#0d2238', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
        {satellite && box && <img src={satelliteUrl(box, W, H)} alt="" style={{ position: 'absolute', left: 0, top: 0, width: `${W}px`, height: `${H}px` }} />}
        <canvas ref={baseRef} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />
        <canvas ref={fieldRef} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />
        <canvas ref={mapRef} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />
        <canvas ref={partRef} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden' }}>
          {cities.map(c => (
            <g key={c.name} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
              <circle r={2.2 * tk} fill="#fff" stroke="#000" strokeWidth={0.8 * tk} />
              <text y={-5 * tk} textAnchor="middle" fontSize={fontPx} fontWeight="700" fill="#fff" style={shadow}>{c.name}</text>
              <text y={fontPx + 3 * tk} textAnchor="middle" fontSize={fontPx} fontWeight="800" fill="#fff" style={shadow}>{fmt(valueAt(c.lat, c.lon, c.name))}</text>
            </g>
          ))}
          {circuit && (
            <g transform={`translate(${circuit.x.toFixed(1)} ${circuit.y.toFixed(1)})`}>
              <circle r={11 * tk} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth={2 * tk} />
              <circle r={5.5 * tk} fill={theme.main} stroke="#fff" strokeWidth={2 * tk} />
              {place && <text y={-17 * tk} textAnchor="middle" fontSize={fontPx * 1.1} fontWeight="900" fill="#fff" style={shadow}>{place.slice(0, 36)}</text>}
              <text y={30 * tk} textAnchor="middle" fontSize={fontPx * 1.45} fontWeight="900" fill="#fff" style={shadow}>{fmt(valueAt(box.lat, box.lon, CIRCUIT_SPOT))}</text>
            </g>
          )}
          {!grid && <text x={W / 2} y={H / 2} textAnchor="middle" fill="#fff" fontSize={14 * k} style={shadow}>Pedí el radar desde el PANEL (botón junto a RADAR DEL CLIMA)</text>}
        </svg>

        {/* Carteles: título + día y hora (arriba a la izquierda) */}
        {format !== 'minimal' && (
          <div style={{ position: 'absolute', left: px(18), top: px(16), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: px(7) }}>
            <div style={{ backgroundColor: '#fff', color: theme.main, borderRadius: px(30), padding: `${px(7)} ${px(18)}`, fontSize: px(20), fontWeight: 900, letterSpacing: '1px', boxShadow: '0 3px 10px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
              {L.title}<CategoryTag config={config} id={id} />
            </div>
            {fr && (
              <div style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#111', borderRadius: px(8), padding: `${px(4)} ${px(12)}`, fontSize: px(12), fontWeight: 800, whiteSpace: 'nowrap' }}>
                {frameLabel(fr)}{fi === 0 ? ' · AHORA' : ''}
              </div>
            )}
          </div>
        )}

        {/* Leyenda (abajo a la izquierda) */}
        {format !== 'minimal' && (
          <div style={{ position: 'absolute', left: px(14), bottom: px(14), width: px(270), backgroundColor: 'rgba(20,40,60,0.72)', borderRadius: px(6), padding: `${px(7)} ${px(12)} ${px(8)}`, color: '#fff', boxSizing: 'border-box' }}>
            <div style={{ fontSize: px(10), fontWeight: 900, letterSpacing: '1px', marginBottom: px(3) }}>LEYENDA</div>
            <div style={{ fontSize: px(9.5), fontWeight: 700, marginBottom: px(4), opacity: 0.9 }}>{L.legend}</div>
            <div style={{ height: px(10), borderRadius: px(2), background: `linear-gradient(90deg, ${L.stops.map(([v, c]) => `${c} ${(pos(v) * 100).toFixed(1)}%`).join(', ')})` }} />
            <div style={{ position: 'relative', height: px(12), marginTop: px(2) }}>
              {L.ticks.map(v => (
                <span key={v} style={{ position: 'absolute', left: `${(pos(v) * 100).toFixed(1)}%`, transform: 'translateX(-50%)', fontSize: px(9), fontWeight: 700 }}>{String(v).replace('.', ',')}</span>
              ))}
            </div>
          </div>
        )}

        {/* Avance de la animación (abajo al centro) */}
        {animate && format !== 'minimal' && (
          <div style={{ position: 'absolute', left: '50%', bottom: px(14), transform: 'translateX(-50%)', display: 'flex', gap: px(5) }}>
            {frames.map((_, i) => <span key={i} style={{ width: px(16), height: px(5), borderRadius: px(3), backgroundColor: i === fi ? '#fff' : 'rgba(255,255,255,0.35)' }} />)}
          </div>
        )}

        {/* Fuentes: las licencias piden citarlas */}
        <div style={{ position: 'absolute', right: px(8), bottom: px(5), fontSize: px(8.5), color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px #000' }}>{credit}</div>
        {!customBg && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '4px', backgroundColor: theme.main }} />}
      </div>
    </div>
  );
}
