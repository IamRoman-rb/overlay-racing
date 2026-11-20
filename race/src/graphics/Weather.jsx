// Movimiento de los íconos (CSS dentro del SVG, en unidades del viewBox de 40x40). Funciona en el Chromium de vMix 23.
const WI_CSS = `
.wi-spin { transform-origin: 20px 20px; animation: wiSpin 14s linear infinite; }
.wi-pulse { transform-origin: 20px 20px; animation: wiPulse 2.4s ease-in-out infinite alternate; }
.wi-sunpeek { transform-origin: 15px 16px; animation: wiPulse 2.6s ease-in-out infinite alternate; }
.wi-drift { animation: wiDrift 3.2s ease-in-out infinite alternate; }
.wi-drift2 { animation: wiDrift 4.1s ease-in-out -1.5s infinite alternate-reverse; }
.wi-bob { animation: wiBob 2.2s ease-in-out infinite alternate; }
.wi-drop { animation: wiDrop 0.9s linear infinite; }
.wi-flake { animation: wiFlake 2.2s ease-in-out infinite; }
.wi-flash { animation: wiFlash 3.2s linear infinite; }
.wi-fog { animation: wiDrift 2.8s ease-in-out infinite alternate; }
@keyframes wiSpin { to { transform: rotate(360deg); } }
@keyframes wiPulse { from { transform: scale(0.94); } to { transform: scale(1.06); } }
@keyframes wiDrift { from { transform: translateX(-2.5px); } to { transform: translateX(2.5px); } }
@keyframes wiBob { from { transform: translateY(0); } to { transform: translateY(-1.5px); } }
@keyframes wiDrop { 0% { transform: translateY(-5px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(7px); opacity: 0; } }
@keyframes wiFlake { 0% { transform: translate(0, -6px); opacity: 0; } 25% { opacity: 1; } 50% { transform: translate(2px, 0); } 100% { transform: translate(-1px, 7px); opacity: 0; } }
@keyframes wiFlash { 0%, 62% { opacity: 0.35; } 64% { opacity: 1; } 67% { opacity: 0.4; } 70% { opacity: 1; } 78%, 100% { opacity: 0.35; } }
`;

// animated (por defecto): sol que gira, nubes que se mueven, gotas y copos que caen, rayo que destella.
export function WeatherIcon({ category, color, size = 40, animated = true }) {
  const s = size;
  // Nubes en gris claro (más oscuras con lluvia / tormenta); el sol y el rayo llevan el color elegido
  const cloud = category === 'storm' || category === 'rain' ? '#b9c3ce' : '#e6ebf0';
  const a = (cls) => (animated ? cls : undefined);
  const css = animated ? <style>{WI_CSS}</style> : null;
  // Retraso de cada gota / copo para que caigan de a una
  const lag = (i, step) => (animated ? { animationDelay: `${(-i * step).toFixed(2)}s` } : undefined);
  switch (category) {
    case 'clear':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
          {css}
          <g className={a('wi-spin')}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
              <line key={deg} x1="20" y1="20" x2="20" y2="4"
                stroke={color} strokeWidth="2.5" strokeLinecap="round"
                transform={`rotate(${deg} 20 20)`} />
            ))}
          </g>
          <circle className={a('wi-pulse')} cx="20" cy="20" r="9" fill={color} />
        </svg>
      );
    case 'partlyCloudy':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
          {css}
          <circle className={a('wi-sunpeek')} cx="15" cy="16" r="7" fill={color} />
          <ellipse className={a('wi-drift')} cx="23" cy="24" rx="13" ry="9" fill={cloud} />
        </svg>
      );
    case 'cloudy':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
          {css}
          <ellipse className={a('wi-drift2')} cx="26" cy="16" rx="10" ry="7" fill={cloud} opacity="0.55" />
          <ellipse className={a('wi-drift')} cx="20" cy="22" rx="15" ry="10" fill={cloud} />
        </svg>
      );
    case 'fog':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
          {css}
          {[10, 18, 26].map((y, i) => (
            <line key={y} className={a('wi-fog')} style={animated ? { animationDelay: `${-i * 0.9}s` } : undefined} x1="5" y1={y} x2="35" y2={y} stroke={color} strokeWidth="3" strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'rain':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
          {css}
          {[12, 20, 28].map((x, i) => (
            <line key={x} className={a('wi-drop')} style={lag(i, 0.3)} x1={x} y1="26" x2={x - 3} y2="36" stroke="#3498db" strokeWidth="2.5" strokeLinecap="round" />
          ))}
          <ellipse className={a('wi-bob')} cx="20" cy="15" rx="13" ry="8" fill={cloud} />
        </svg>
      );
    case 'snow':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
          {css}
          {[12, 20, 28].map((x, i) => (
            <circle key={x} className={a('wi-flake')} style={lag(i, 0.7)} cx={x} cy="30" r="2" fill="#fff" />
          ))}
          <ellipse className={a('wi-bob')} cx="20" cy="14" rx="13" ry="8" fill={cloud} />
        </svg>
      );
    case 'storm':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
          {css}
          <polygon className={a('wi-flash')} points="21,20 14,32 20,32 17,40 27,26 20,26" fill={color} />
          <ellipse className={a('wi-bob')} cx="20" cy="13" rx="13" ry="8" fill={cloud} />
        </svg>
      );
    default:
      return null;
  }
}

import { getSkinStyle } from '../utils/skinStyles';
import { getWeatherVisual, getWindDirLabel, windIntensityColor } from '../utils/weather';
import { WindCompass } from './WindField';
import WeatherScene from './WeatherScene';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import { getElitePalette, ELITE_FONT, rgba } from '../utils/elite';
import { makeFx } from '../utils/contentAnim';
import { rainInfo } from '../utils/weatherMap';

// brand (opcional, gráfica EVENTO): { logo, producer, circuit } -> cada formato suma el logo / nombre de la productora y
// muestra el circuito como lugar.
export default function Weather({ data, isVisible, config, id = 'clima', format, brand = null, defaultPos }) {
  const pos = config?.positions?.[id] || defaultPos || { x: 20, y: 160, scale: 1 };
  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#bdc3c7';
  // Lluvia: mm de las próximas 6 h (MET Norway) o el % de los datos viejos guardados
  const rain = rainInfo(data);
  const rainStr = rain ? String(rain.value).replace('.', ',') : '-';
  const rainUnit = rain ? (rain.unit === 'mm' ? ' mm' : '%') : '';
  const rainWet = !!rain?.wet;
  // Lluvia de cada hora del pronóstico: mm (MET) o % (datos viejos)
  const hourRainMm = data?.source === 'met';

  const customBg = config?.[`design_${id}`];
  const bRad = config?.[`borderRadius_${id}`] || '8px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const climaFormat = format || config?.climaFormat || 'standard';
  const skin = getSkinStyle(climaFormat, { themeMain, themeAccent });

  let transformHidden = `scale(${pos.scale}) translateX(-40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  if (!data) return null;

  const { label, category } = getWeatherVisual(data.weathercode);
  // Íconos con movimiento (PERSONALIZAR > CLIMA), activado por defecto
  const iconsAnimated = config?.climaAnimatedIcons !== false;
  const fx = makeFx(config, id, isVisible);

  // Marca (EVENTO): logo + nombre de la productora; el circuito reemplaza al lugar del clima
  const hasBrand = !!(brand && (brand.logo || brand.producer));
  const brandPlace = brand?.circuit || '';
  const brandLogo = (h) => (brand?.logo ? <img src={brand.logo} alt="" style={{ height: `${h}px`, maxWidth: `${h * 2.6}px`, objectFit: 'contain', flexShrink: 0, display: 'block' }} /> : null);
  const brandName = (style) => (brand?.producer ? <span style={{ fontWeight: '900', textTransform: 'uppercase', whiteSpace: 'nowrap', ...style }}>{brand.producer}</span> : null);

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left', zIndex: 15,
    transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
    opacity: isVisible || animStyle === 'roll' ? 1 : 0, pointerEvents: 'none',
    transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateX(0)` : transformHidden, ...getRollClip(animStyle, isVisible)
  };

  // FORMATOS ELITE (paquete azul de transmisión): caja "EL CLIMA EN ..." o barra horizontal
  if (climaFormat === 'elite' || climaFormat === 'eliteBar') {
    const pal = getElitePalette(config);
    const place = brandPlace || (data.place || config?.circuitCity || config?.circuito || '').split(',')[0];
    const val = (v) => (v === null || v === undefined ? '-' : Math.round(v));
    const stats = [
      { key: 'VIENTO', value: val(data.windSpeed), unit: 'km/h', icon: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7', stroke: true },
      { key: 'HUMEDAD', value: val(data.humidity), unit: '%', icon: 'M12 3C9 8 6 11.5 6 15.5a6 6 0 0 0 12 0C18 11.5 15 8 12 3z' },
      { key: 'LLUVIA', value: rainStr, unit: rainUnit.trim(), icon: 'M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8.5 3.5 3.5 0 0 1 17.5 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3', stroke: true }
    ];
    const statIcon = (s) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill={s.stroke ? 'none' : '#7fd3ff'} stroke={s.stroke ? '#7fd3ff' : 'none'} strokeWidth="2" strokeLinecap="round"><path d={s.icon} /></svg>
    );
    const pin = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7fd3ff" strokeWidth="2"><path d="M12 22s7-7.7 7-13a7 7 0 0 0-14 0c0 5.3 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></svg>);
    const cell = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: `1px solid ${rgba('#ffffff', 0.18)}` };
    const box = { fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase', background: pal.background, borderRadius: bRad, overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.5)', border: `1px solid ${rgba('#ffffff', 0.18)}` };

    if (climaFormat === 'eliteBar') {
      return (
        <div style={wrapperStyle}>
          <div className={fx.group} style={{ ...box, display: 'flex', height: '50px', minWidth: '700px' }}>
            <div style={{ display: hasBrand ? 'flex' : 'none', alignItems: 'center', gap: '10px', padding: '0 16px', backgroundColor: rgba(pal.deep, 0.6), borderRight: `1px solid ${rgba('#ffffff', 0.18)}` }}>
              {brandLogo(34)}
              {brandName({ fontSize: '16px', fontWeight: 700 })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', minWidth: '150px' }}>
              {pin}
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px', lineHeight: 1.05 }}>
                <span style={{ fontSize: '10px', fontStyle: 'italic', color: pal.muted }}>EL CLIMA EN</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{place}</span>
              </div>
            </div>
            <div style={{ ...cell, flexDirection: 'row', padding: '0 16px', minWidth: '170px' }}>
              <WeatherIcon animated={iconsAnimated} category={category} color="#ffc93c" size={22} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '10px', lineHeight: 1 }}>
                <span style={{ fontSize: '28px', fontWeight: 700 }}>{Math.round(data.temp)}°C</span>
                <span style={{ fontSize: '9px', color: pal.muted }}>{label}</span>
              </div>
            </div>
            {stats.map(s => (
              <div key={s.key} style={{ ...cell, flex: 1, minWidth: '86px' }}>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '10px', color: pal.muted }}>{statIcon(s)}<span style={{ marginLeft: '4px' }}>{s.key}</span></span>
                <span style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1 }}>{s.value}<span style={{ fontSize: '10px', marginLeft: '2px' }}>{s.unit}</span></span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{ ...box, width: hasBrand ? '260px' : '230px' }}>
          <div style={{ display: hasBrand ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '8px 12px', backgroundColor: rgba(pal.deep, 0.6), borderBottom: `1px solid ${rgba('#ffffff', 0.18)}` }}>
            {brandLogo(36)}
            {brandName({ fontSize: '16px', fontWeight: 700 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px 0' }}>
            {pin}
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px', lineHeight: 1.05 }}>
              <span style={{ fontSize: '11px', fontStyle: 'italic', color: pal.muted }}>EL CLIMA EN</span>
              <span style={{ fontSize: '22px', fontWeight: 700 }}>{place}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0 8px' }}>
            <WeatherIcon animated={iconsAnimated} category={category} color="#ffc93c" size={26} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '12px', lineHeight: 1 }}>
              <span style={{ fontSize: '40px', fontWeight: 700 }}>{Math.round(data.temp)}°C</span>
              <span style={{ fontSize: '10px', color: pal.muted }}>{label}</span>
            </div>
          </div>
          <div style={{ display: 'flex', borderTop: `1px solid ${rgba('#ffffff', 0.18)}`, height: '56px' }}>
            {stats.map((s, i) => (
              <div key={s.key} style={{ ...cell, flex: 1, borderLeft: i ? cell.borderLeft : 'none' }}>
                {statIcon(s)}
                <span style={{ fontSize: '9px', color: pal.muted }}>{s.key}</span>
                <span style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1 }}>{s.value}<span style={{ fontSize: '9px', marginLeft: '1px' }}>{s.unit}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- FORMATOS NUEVOS: rosa de los vientos, pronóstico, franja y destacado ----
  const place = brandPlace || (data.place || config?.circuitCity || config?.circuito || '').split(',')[0];
  const val = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '-' : Math.round(v));
  const hasDir = Number.isFinite(Number(data.windDir));
  const boxBg = {
    backgroundColor: customBg ? 'transparent' : themeBg,
    backgroundImage: customBg ? `url(${customBg})` : 'none',
    backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
    borderRadius: bRad, overflow: 'hidden', boxShadow: customBg ? 'none' : '0 10px 26px rgba(0,0,0,0.5)', position: 'relative'
  };
  const headBar = (title) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: customBg ? 'transparent' : themeHeaderBg, padding: '6px 14px', borderBottom: `2px solid ${themeMain}` }}>
      {hasBrand
        ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>{brandLogo(24)}{brandName({ color: themeAccent, fontSize: '12px', letterSpacing: '1px' })}</span>
        : <span style={{ color: themeAccent, fontSize: '11px', fontWeight: '900', letterSpacing: '1px' }}>{title}</span>}
      <span style={{ color: themeNumberText, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: '10px' }}>{place}</span>
    </div>
  );
  // Flechita que apunta hacia donde sopla el viento
  const windArrow = (size = 14) => (hasDir ? (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${(Number(data.windDir) + 180).toFixed(0)}deg)`, flexShrink: 0 }}>
      <path d="M12 2 L19 20 L12 15.5 L5 20 Z" fill={windIntensityColor(data.windSpeed)} />
    </svg>
  ) : null);

  // ROSA DE LOS VIENTOS: el viento como protagonista (aguja animada, velocidad, de dónde viene) + el resto del clima
  if (climaFormat === 'compass') {
    return (
      <div style={wrapperStyle}>
        <div style={{ ...boxBg, width: '360px', borderTop: customBg ? 'none' : `4px solid ${themeMain}` }}>
          {headBar('VIENTO Y CLIMA')}
          <div className={fx.group} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px' }}>
            <WindCompass weatherData={data} size={128} color={themeNormalText} muted={'rgba(255,255,255,0.45)'} bg={'rgba(0,0,0,0.35)'} running={!!isVisible && iconsAnimated} idPrefix="clCmp" showLabel={false} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', lineHeight: 1 }}>
                <span style={{ color: windIntensityColor(data.windSpeed), fontSize: '44px', fontWeight: '900' }}>{val(data.windSpeed)}</span>
                <span style={{ color: themeNormalText, fontSize: '13px', fontWeight: 'bold' }}>KM/H</span>
              </div>
              <span style={{ color: themeNumberText, fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{hasDir ? `DESDE EL ${getWindDirLabel(data.windDir)} · ${Math.round(data.windDir)}°` : 'SIN DIRECCIÓN'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', marginTop: '2px' }}>
                <WeatherIcon animated={iconsAnimated} category={category} color={themeAccent} size={28} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
                  <span style={{ color: themeNormalText, fontSize: '22px', fontWeight: '900' }}>{Math.round(data.temp)}°C</span>
                  <span style={{ color: themeNumberText, fontSize: '9px', fontWeight: 'bold' }}>{label}</span>
                </div>
              </div>
              <span style={{ color: themeNumberText, fontSize: '10px', fontWeight: 'bold' }}>
                HUM. <span style={{ color: themeNormalText }}>{val(data.humidity)}%</span> · LLUVIA <span style={{ color: rainWet ? '#3db6ff' : themeNormalText }}>{rainStr}{rainUnit}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PRONÓSTICO: ahora + las próximas horas (ícono, temperatura y probabilidad de lluvia de cada hora)
  if (climaFormat === 'forecast') {
    const hours = (Array.isArray(data.forecast) ? data.forecast : []).slice(0, 5);
    const cellW = 92;
    const cell = (key, top, cat, temp, rain, now) => (
      <div key={key} style={{ width: `${cellW}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px 0', borderLeft: now ? 'none' : '1px solid rgba(255,255,255,0.12)', backgroundColor: now ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
        <span style={{ color: now ? themeAccent : themeNumberText, fontSize: '11px', fontWeight: '900', letterSpacing: '0.5px' }}>{top}</span>
        <WeatherIcon animated={iconsAnimated} category={cat} color={themeAccent} size={now ? 34 : 28} />
        <span style={{ color: themeNormalText, fontSize: now ? '24px' : '20px', fontWeight: '900', lineHeight: 1 }}>{val(temp)}°</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: (hourRainMm ? rain >= 1 : rain >= 50) ? '#3db6ff' : themeNumberText, fontSize: '10px', fontWeight: 'bold' }}>
          <svg width="8" height="10" viewBox="0 0 24 28" fill="currentColor"><path d="M12 2C9 7 5 11.5 5 16.5A7 7 0 0 0 19 16.5C19 11.5 15 7 12 2z" /></svg>{hourRainMm ? `${Number.isFinite(rain) ? String(Math.round(rain * 10) / 10).replace('.', ',') : '-'} mm` : `${val(rain)}%`}
        </span>
      </div>
    );
    return (
      <div style={wrapperStyle}>
        <div style={{ ...boxBg, width: `${cellW * (hours.length + 1)}px`, minWidth: '260px', borderTop: customBg ? 'none' : `4px solid ${themeMain}` }}>
          {headBar('PRONÓSTICO')}
          <div className={fx.group} style={{ display: 'flex' }}>
            {cell('now', 'AHORA', category, data.temp, hourRainMm ? data.precip1h : data.precipProb, true)}
            {hours.map((h, i) => cell(i, h.time, getWeatherVisual(h.code).category, h.temp, h.precip, false))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '5px 10px', borderTop: '1px solid rgba(255,255,255,0.12)', color: themeNumberText, fontSize: '10px', fontWeight: 'bold' }}>
            {windArrow(12)} VIENTO <span style={{ color: themeNormalText }}>{val(data.windSpeed)} KM/H {getWindDirLabel(data.windDir)}</span> · HUM. <span style={{ color: themeNormalText }}>{val(data.humidity)}%</span>
            {hours.length === 0 && <span> · VOLVÉ A PEDIR EL CLIMA PARA VER LAS PRÓXIMAS HORAS</span>}
          </div>
        </div>
      </div>
    );
  }

  // FRANJA: barra fina de una línea con todos los datos (para arriba o abajo de la pantalla)
  if (climaFormat === 'strip') {
    const part = (k, content) => (
      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', borderLeft: '1px solid rgba(255,255,255,0.15)', height: '100%', whiteSpace: 'nowrap' }}>{content}</div>
    );
    const lbl = (t) => <span style={{ color: themeNumberText, fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{t}</span>;
    const v = (t) => <span style={{ color: themeNormalText, fontSize: '15px', fontWeight: '900' }}>{t}</span>;
    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{ ...boxBg, display: 'inline-flex', alignItems: 'center', height: '38px', borderLeft: customBg ? 'none' : `5px solid ${themeMain}` }}>
          <div style={{ display: hasBrand ? 'flex' : 'none', alignItems: 'center', gap: '8px', height: '100%', padding: '0 14px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
            {brandLogo(26)}
            {brandName({ color: themeNormalText, fontSize: '13px', letterSpacing: '0.5px' })}
          </div>
          <div style={{ display: place ? 'flex' : 'none', alignItems: 'center', height: '100%', padding: '0 14px', backgroundColor: customBg ? 'transparent' : themeHeaderBg }}>
            <span style={{ color: themeAccent, fontSize: '12px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>{place}</span>
          </div>
          {part('t', <><WeatherIcon animated={iconsAnimated} category={category} color={themeAccent} size={22} />{v(`${Math.round(data.temp)}°C`)}{lbl(label)}</>)}
          {data.feelsLike !== null && data.feelsLike !== undefined && part('st', <>{lbl('ST')}{v(`${Math.round(data.feelsLike)}°`)}</>)}
          {part('w', <>{lbl('VIENTO')}{windArrow(14)}{v(`${val(data.windSpeed)}`)}{lbl(`KM/H ${getWindDirLabel(data.windDir)}`)}</>)}
          {part('h', <>{lbl('HUM.')}{v(`${val(data.humidity)}%`)}</>)}
          {part('r', <>{lbl('LLUVIA')}<span style={{ color: rainWet ? '#3db6ff' : themeNormalText, fontSize: '15px', fontWeight: '900' }}>{rainStr}{rainUnit}</span></>)}
        </div>
      </div>
    );
  }

  // DESTACADO: temperatura gigante con el clima animado de fondo (lluvia, nubes, nieve...) y un brillo según la condición
  if (climaFormat === 'hero') {
    const W = 440; const H = hasBrand ? 226 : 190;
    const glow = { clear: 'rgba(255,190,60,0.38)', partlyCloudy: 'rgba(255,200,90,0.24)', cloudy: 'rgba(160,175,195,0.22)', fog: 'rgba(200,205,215,0.22)', rain: 'rgba(60,140,230,0.3)', snow: 'rgba(220,235,255,0.3)', storm: 'rgba(130,90,220,0.32)' }[category] || 'rgba(255,255,255,0.15)';
    return (
      <div style={wrapperStyle}>
        <div style={{ ...boxBg, width: `${W}px`, height: `${H}px`, backgroundImage: customBg ? `url(${customBg})` : `radial-gradient(circle at 82% 18%, ${glow}, rgba(0,0,0,0) 62%)`, borderBottom: customBg ? 'none' : `4px solid ${themeMain}` }}>
          {iconsAnimated && <WeatherScene category={category} code={data.weathercode} width={W} height={H} running={!!isVisible} idPrefix="clHero" />}
          <div style={{ position: 'absolute', right: '18px', top: '16px' }}>
            <WeatherIcon animated={iconsAnimated} category={category} color={themeAccent} size={74} />
          </div>
          <div className={fx.group} style={{ position: 'relative', padding: '14px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: hasBrand ? 'flex' : 'none', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              {brandLogo(30)}
              {brandName({ color: themeNormalText, fontSize: '15px', letterSpacing: '0.5px' })}
            </div>
            <span style={{ color: themeAccent, fontSize: '12px', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{place ? `CLIMA EN ${place}` : 'CLIMA'}</span>
            <div style={{ display: 'flex', alignItems: 'flex-start', lineHeight: 0.9, marginTop: '6px' }}>
              <span style={{ color: themeNormalText, fontSize: '84px', fontWeight: '900', letterSpacing: '-3px', textShadow: '0 4px 14px rgba(0,0,0,0.5)' }}>{Math.round(data.temp)}</span>
              <span style={{ color: themeNormalText, fontSize: '32px', fontWeight: '900', marginTop: '6px' }}>°C</span>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '14px', marginTop: '14px', gap: '4px' }}>
                <span style={{ color: themeNormalText, fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>{label}</span>
                {data.feelsLike !== null && data.feelsLike !== undefined && <span style={{ color: themeNumberText, fontSize: '11px', fontWeight: 'bold' }}>SENSACIÓN {Math.round(data.feelsLike)}°</span>}
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', gap: '18px', alignItems: 'center', padding: '8px 20px', backgroundColor: 'rgba(0,0,0,0.35)', fontSize: '11px', fontWeight: 'bold', color: themeNumberText }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>{windArrow(13)} VIENTO <span style={{ color: themeNormalText }}>{val(data.windSpeed)} KM/H {getWindDirLabel(data.windDir)}</span></span>
            <span>HUMEDAD <span style={{ color: themeNormalText }}>{val(data.humidity)}%</span></span>
            <span>LLUVIA <span style={{ color: rainWet ? '#3db6ff' : themeNormalText }}>{rainStr}{rainUnit}</span></span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO COMPACTO: una sola fila, sin encabezado ni estadísticas de viento/humedad/lluvia
  if (climaFormat === 'compact') {
    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{
          minWidth: '220px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px',
          backgroundColor: customBg ? 'transparent' : themeBg,
          backgroundImage: customBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderLeft: customBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad,
          boxShadow: customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)'
        }}>
          {(hasBrand || brandPlace) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '12px', marginRight: '2px', borderRight: `1px solid ${themeMain}` }}>
              {brandLogo(34)}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                {brandName({ color: themeNormalText, fontSize: '15px' })}
                {brandPlace && <span style={{ color: themeNumberText, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{brandPlace}</span>}
              </div>
            </div>
          )}
          <WeatherIcon animated={iconsAnimated} category={category} color={themeAccent} size={32} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: themeNormalText, fontSize: '22px', fontWeight: '900', lineHeight: 1 }}>
              {Math.round(data.temp)}°C
            </span>
            <span style={{ color: themeNumberText, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO VERTICAL: columna angosta, todo centrado, ideal para ubicar apilado con otras gráficas
  if (climaFormat === 'vertical') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          width: hasBrand ? '190px' : '160px', textAlign: 'center', overflow: 'hidden',
          backgroundColor: customBg ? 'transparent' : themeBg,
          backgroundImage: customBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderTop: customBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad,
          boxShadow: customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)'
        }}>
          <div style={{ backgroundColor: customBg ? 'transparent' : themeHeaderBg, padding: '6px 0', borderBottom: customBg ? 'none' : `2px solid ${themeMain}` }}>
            {hasBrand
              ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>{brandLogo(40)}{brandName({ color: themeAccent, fontSize: '12px', letterSpacing: '1px', whiteSpace: 'normal' })}</div>
              : <span style={{ color: themeAccent, fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>CLIMA</span>}
          </div>
          {brandPlace && <div style={{ padding: '8px 8px 0', color: themeNormalText, fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1.1 }}>{brandPlace}</div>}
          <div className={fx.group} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 10px', gap: '4px' }}>
            <WeatherIcon animated={iconsAnimated} category={category} color={themeAccent} size={40} />
            <span style={{ color: themeNormalText, fontSize: '26px', fontWeight: '900', lineHeight: 1 }}>{Math.round(data.temp)}°C</span>
            <span style={{ color: themeNumberText, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</span>
            {data.windSpeed !== undefined && (
              <span style={{ color: themeNumberText, fontSize: '10px', marginTop: '6px', letterSpacing: '0.5px' }}>
                VIENTO {Math.round(data.windSpeed)} km/h {getWindDirLabel(data.windDir)}
              </span>
            )}
            {rain && (
              <span style={{ color: rainWet ? '#3498db' : themeNumberText, fontSize: '10px', letterSpacing: '0.5px' }}>
                LLUVIA {rainStr}{rainUnit}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // FORMATO MINIMALISTA: sin caja, sin fondo, solo ícono + temperatura sobre el video
  if (climaFormat === 'minimal') {
    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(hasBrand || brandPlace) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '8px', paddingRight: '16px', borderRight: `2px solid ${themeAccent}` }}>
              {brandLogo(44)}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
                {brandName({ color: themeNormalText, fontSize: '20px' })}
                {brandPlace && <span style={{ color: themeAccent, fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{brandPlace}</span>}
              </div>
            </div>
          )}
          <WeatherIcon animated={iconsAnimated} category={category} color={themeAccent} size={38} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: themeNormalText, fontSize: '28px', fontWeight: '900', lineHeight: 1, textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
              {Math.round(data.temp)}°C
            </span>
            <span style={{ color: themeAccent, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
              {label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // FORMATO ESTÁNDAR (comportamiento original)
  return (
    <div style={wrapperStyle}>
      <div style={{
        width: '340px',
        backgroundColor: skin ? skin.background : (customBg ? 'transparent' : themeBg),
        backgroundImage: customBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        border: skin ? skin.border : 'none',
        borderLeft: skin ? skin.border : (customBg ? 'none' : `4px solid ${themeMain}`),
        borderRadius: bRad,
        boxShadow: skin ? skin.boxShadow : (customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)'),
        backdropFilter: skin?.backdropFilter,
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: skin ? 'transparent' : (customBg ? 'transparent' : themeHeaderBg),
          padding: '6px 15px', borderBottom: skin ? `1px solid ${themeAccent}44` : (customBg ? 'none' : `2px solid ${themeMain}`)
        }}>
          <span style={{ color: themeAccent, fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
            CLIMA {config?.circuito ? `— ${config.circuito}` : ''}
          </span>
        </div>

        <div className={fx.group} style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', gap: '12px' }}>
          <WeatherIcon animated={iconsAnimated} category={category} color={themeAccent} size={44} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: themeNormalText, fontSize: '30px', fontWeight: '900', lineHeight: 1 }}>
                {Math.round(data.temp)}°C
              </span>
              {data.feelsLike !== undefined && data.feelsLike !== null && (
                <span style={{ color: themeNumberText, fontSize: '11px', fontWeight: 'bold' }}>
                  ST {Math.round(data.feelsLike)}°
                </span>
              )}
            </div>
            <span style={{ color: themeNumberText, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {label}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: 'auto', minWidth: '90px' }}>
            {data.windSpeed !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span style={{ color: themeNumberText }}>VIENTO</span>
                <span style={{ color: themeNormalText, fontWeight: 'bold' }}>
                  {Math.round(data.windSpeed)} km/h {getWindDirLabel(data.windDir)}
                </span>
              </div>
            )}
            {data.humidity !== undefined && data.humidity !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span style={{ color: themeNumberText }}>HUMEDAD</span>
                <span style={{ color: themeNormalText, fontWeight: 'bold' }}>{Math.round(data.humidity)}%</span>
              </div>
            )}
            {rain && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span style={{ color: themeNumberText }}>LLUVIA</span>
                <span style={{
                  color: rainWet ? '#3498db' : themeNormalText,
                  fontWeight: 'bold'
                }}>{rainStr}{rainUnit}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}