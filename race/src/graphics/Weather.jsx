// Devuelve { label, Icon } según el weathercode de Open-Meteo
export function getWeatherVisual(code) {
  if (code === 0) return { label: 'DESPEJADO', category: 'clear' };
  if (code >= 1 && code <= 2) return { label: 'ALGO NUBLADO', category: 'partlyCloudy' };
  if (code === 3) return { label: 'NUBLADO', category: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'NIEBLA', category: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'LLOVIZNA', category: 'rain' };
  if (code >= 61 && code <= 67) return { label: 'LLUVIA', category: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'NIEVE', category: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'CHAPARRONES', category: 'rain' };
  if (code >= 95) return { label: 'TORMENTA', category: 'storm' };
  return { label: 'DESPEJADO', category: 'clear' };
}

export function WeatherIcon({ category, color, size = 40 }) {
  const s = size;
  switch (category) {
    case 'clear':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="9" fill={color} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <line key={deg} x1="20" y1="20" x2="20" y2="4"
              stroke={color} strokeWidth="2.5" strokeLinecap="round"
              transform={`rotate(${deg} 20 20)`} />
          ))}
        </svg>
      );
    case 'partlyCloudy':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <circle cx="15" cy="16" r="7" fill="#f1c40f" />
          <ellipse cx="23" cy="24" rx="13" ry="9" fill={color} />
        </svg>
      );
    case 'cloudy':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <ellipse cx="20" cy="22" rx="15" ry="10" fill={color} />
        </svg>
      );
    case 'fog':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          {[10, 18, 26].map(y => (
            <line key={y} x1="5" y1={y} x2="35" y2={y} stroke={color} strokeWidth="3" strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'rain':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <ellipse cx="20" cy="15" rx="13" ry="8" fill={color} />
          {[12, 20, 28].map(x => (
            <line key={x} x1={x} y1="26" x2={x - 3} y2="36" stroke="#3498db" strokeWidth="2.5" strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'snow':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <ellipse cx="20" cy="14" rx="13" ry="8" fill={color} />
          {[12, 20, 28].map(x => (
            <circle key={x} cx={x} cy="30" r="2" fill="#fff" />
          ))}
        </svg>
      );
    case 'storm':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <ellipse cx="20" cy="13" rx="13" ry="8" fill={color} />
          <polygon points="21,20 14,32 20,32 17,40 27,26 20,26" fill="#f1c40f" />
        </svg>
      );
    default:
      return null;
  }
}

export function getWindDirLabel(deg) {
  if (deg === null || deg === undefined) return '';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

import { getSkinStyle } from '../utils/skinStyles';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import { getElitePalette, ELITE_FONT, rgba } from '../utils/elite';

export default function Weather({ data, isVisible, config, id = 'clima' }) {
  const pos = config?.positions?.[id] || { x: 20, y: 160, scale: 1 };
  const themeBg = config?.themeBg || 'rgba(0,0,0,0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#bdc3c7';

  const customBg = config?.[`design_${id}`];
  const bRad = config?.[`borderRadius_${id}`] || '8px';
  const animStyle = config?.[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const climaFormat = config?.climaFormat || 'standard';
  const skin = getSkinStyle(climaFormat, { themeMain, themeAccent });

  let transformHidden = `scale(${pos.scale}) translateX(-40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  if (!data) return null;

  const { label, category } = getWeatherVisual(data.weathercode);

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
    const place = (data.place || config?.circuitCity || config?.circuito || '').split(',')[0];
    const val = (v) => (v === null || v === undefined ? '-' : Math.round(v));
    const stats = [
      { key: 'VIENTO', value: val(data.windSpeed), unit: 'km/h', icon: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7', stroke: true },
      { key: 'HUMEDAD', value: val(data.humidity), unit: '%', icon: 'M12 3C9 8 6 11.5 6 15.5a6 6 0 0 0 12 0C18 11.5 15 8 12 3z' },
      { key: 'LLUVIA', value: val(data.precipProb), unit: '%', icon: 'M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8.5 3.5 3.5 0 0 1 17.5 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3', stroke: true }
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
          <div style={{ ...box, display: 'flex', height: '50px', width: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', minWidth: '150px' }}>
              {pin}
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px', lineHeight: 1.05 }}>
                <span style={{ fontSize: '10px', fontStyle: 'italic', color: pal.muted }}>EL CLIMA EN</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{place}</span>
              </div>
            </div>
            <div style={{ ...cell, flexDirection: 'row', padding: '0 16px', minWidth: '170px' }}>
              <WeatherIcon category={category} color="#ffc93c" size={22} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '10px', lineHeight: 1 }}>
                <span style={{ fontSize: '28px', fontWeight: 700 }}>{Math.round(data.temp)}°C</span>
                <span style={{ fontSize: '9px', color: pal.muted }}>{label}</span>
              </div>
            </div>
            {stats.map(s => (
              <div key={s.key} style={{ ...cell, flex: 1 }}>
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
        <div style={{ ...box, width: '230px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px 0' }}>
            {pin}
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px', lineHeight: 1.05 }}>
              <span style={{ fontSize: '11px', fontStyle: 'italic', color: pal.muted }}>EL CLIMA EN</span>
              <span style={{ fontSize: '22px', fontWeight: 700 }}>{place}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0 8px' }}>
            <WeatherIcon category={category} color="#ffc93c" size={26} />
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

  // FORMATO COMPACTO: una sola fila, sin encabezado ni estadísticas de viento/humedad/lluvia
  if (climaFormat === 'compact') {
    return (
      <div style={wrapperStyle}>
        <div style={{
          width: '220px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px',
          backgroundColor: customBg ? 'transparent' : themeBg,
          backgroundImage: customBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderLeft: customBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad,
          boxShadow: customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)'
        }}>
          <WeatherIcon category={category} color={themeAccent} size={32} />
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
          width: '160px', textAlign: 'center', overflow: 'hidden',
          backgroundColor: customBg ? 'transparent' : themeBg,
          backgroundImage: customBg ? `url(${customBg})` : 'none',
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          borderTop: customBg ? 'none' : `4px solid ${themeMain}`,
          borderRadius: bRad,
          boxShadow: customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)'
        }}>
          <div style={{ backgroundColor: customBg ? 'transparent' : themeHeaderBg, padding: '6px 0', borderBottom: customBg ? 'none' : `2px solid ${themeMain}` }}>
            <span style={{ color: themeAccent, fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>CLIMA</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 10px', gap: '4px' }}>
            <WeatherIcon category={category} color={themeAccent} size={40} />
            <span style={{ color: themeNormalText, fontSize: '26px', fontWeight: '900', lineHeight: 1 }}>{Math.round(data.temp)}°C</span>
            <span style={{ color: themeNumberText, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</span>
            {data.windSpeed !== undefined && (
              <span style={{ color: themeNumberText, fontSize: '10px', marginTop: '6px', letterSpacing: '0.5px' }}>
                VIENTO {Math.round(data.windSpeed)} km/h {getWindDirLabel(data.windDir)}
              </span>
            )}
            {data.precipProb !== undefined && data.precipProb !== null && (
              <span style={{ color: data.precipProb >= 50 ? '#3498db' : themeNumberText, fontSize: '10px', letterSpacing: '0.5px' }}>
                LLUVIA {Math.round(data.precipProb)}%
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <WeatherIcon category={category} color={themeAccent} size={38} />
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

        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', gap: '12px' }}>
          <WeatherIcon category={category} color={themeAccent} size={44} />

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
            {data.precipProb !== undefined && data.precipProb !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span style={{ color: themeNumberText }}>LLUVIA</span>
                <span style={{
                  color: data.precipProb >= 50 ? '#3498db' : themeNormalText,
                  fontWeight: 'bold'
                }}>{Math.round(data.precipProb)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}