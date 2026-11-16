// Devuelve { label, category } según el weathercode de Open-Meteo
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

// Punto cardinal (8 rumbos, en castellano) para una dirección de viento en grados
export function getWindDirLabel(deg) {
  if (deg === null || deg === undefined) return '';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

// Color según la intensidad (escala tipo meteorológica): calma celeste -> moderado verde -> fuerte ámbar -> muy fuerte rojo
export function windIntensityColor(kmh) {
  const v = Number(kmh) || 0;
  if (v < 8) return '#7fd3ff';
  if (v < 18) return '#5ef0c4';
  if (v < 30) return '#c8f25a';
  if (v < 45) return '#ffc93c';
  return '#ff6b4a';
}

// Formatos de la gráfica del CLIMA que también usa EVENTO (con la productora y el circuito agregados)
export const WEATHER_BRAND_FORMATS = ['compact', 'vertical', 'minimal', 'elite', 'eliteBar', 'compass', 'forecast', 'strip', 'hero'];
