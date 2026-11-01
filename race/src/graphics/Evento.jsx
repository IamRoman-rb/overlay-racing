import { Fragment } from 'react';
import { getWeatherVisual, WeatherIcon, getWindDirLabel } from './Weather';
import { getSkinStyle } from '../utils/skinStyles';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';

// EVENTO: una sola gráfica con el nombre de la productora (con su logo si está cargado), el nombre del circuito y el clima.
// Cada bloque aparece sólo si tiene datos: config.productora, config.circuito y config.weatherData.
export default function Evento({ isVisible, config, id = 'evento' }) {
  const pos = config?.positions?.[id] || { x: 560, y: 20, scale: 1 };
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
  const skin = getSkinStyle(config?.[`eventoFormat_${id}`] || config?.eventoFormat || 'standard', { themeMain, themeAccent });

  const producer = (config?.productora || '').trim();
  const circuit = (config?.circuito || '').trim();
  const weather = config?.weatherData || null;
  const weatherInfo = weather ? getWeatherVisual(weather.weathercode) : null;

  let transformHidden = `scale(${pos.scale}) translateX(-40px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  const wrapperStyle = {
    position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
    transformOrigin: 'top left', zIndex: 15,
    transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
    opacity: isVisible || animStyle === 'roll' ? 1 : 0, pointerEvents: 'none',
    transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateX(0)` : transformHidden, ...getRollClip(animStyle, isVisible)
  };

  const labelStyle = { color: themeAccent, fontSize: '11px', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase' };
  const valueStyle = { color: themeNormalText, fontSize: '26px', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1.05, whiteSpace: 'nowrap' };
  const divider = <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: themeMain, opacity: 0.8 }} />;

  const blocks = [];
  if (producer || config?.logo) {
    blocks.push(
      <div key="producer" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 24px' }}>
        {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '52px', maxWidth: '120px', objectFit: 'contain' }} />}
        {producer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={labelStyle}>PRODUCTORA</span>
            <span style={valueStyle}>{producer}</span>
          </div>
        )}
      </div>
    );
  }
  if (circuit) {
    blocks.push(
      <div key="circuit" style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '0 24px', justifyContent: 'center' }}>
        <span style={labelStyle}>CIRCUITO</span>
        <span style={valueStyle}>{circuit}</span>
      </div>
    );
  }
  if (weather && weatherInfo) {
    blocks.push(
      <div key="weather" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 24px' }}>
        <WeatherIcon category={weatherInfo.category} color={themeAccent} size={46} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ ...valueStyle, fontSize: '30px' }}>{Math.round(weather.temp)}°C</span>
            <span style={{ color: themeNumberText, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{weatherInfo.label}</span>
          </div>
          <span style={{ color: themeNumberText, fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            {weather.windSpeed !== undefined && `VIENTO ${Math.round(weather.windSpeed)} km/h ${getWindDirLabel(weather.windDir)}`}
            {weather.precipProb !== undefined && weather.precipProb !== null && `  ·  LLUVIA ${Math.round(weather.precipProb)}%`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div style={{
        display: 'flex', alignItems: 'center', minHeight: '86px',
        backgroundColor: skin ? skin.background : (customBg ? 'transparent' : themeBg),
        backgroundImage: customBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        border: skin ? skin.border : 'none',
        borderLeft: skin ? skin.border : (customBg ? 'none' : `4px solid ${themeMain}`),
        borderRadius: bRad,
        boxShadow: skin ? skin.boxShadow : (customBg ? 'none' : '2px 2px 10px rgba(0,0,0,0.5)'),
        backdropFilter: skin?.backdropFilter, overflow: 'hidden'
      }}>
        {blocks.length === 0
          ? <div style={{ padding: '0 24px', backgroundColor: customBg ? 'transparent' : themeHeaderBg }}><span style={{ ...valueStyle, opacity: 0.6 }}>EVENTO</span></div>
          : blocks.map((block, i) => <Fragment key={block.key}>{i > 0 && divider}{block}</Fragment>)}
      </div>
    </div>
  );
}
