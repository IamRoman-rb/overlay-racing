import { useState } from 'react';
import { photoUrl } from '../utils/elite';
import { driverCountry } from '../utils/countries';
import { FlagFade } from './CountryFlag';

// Foto de un piloto (carpeta de fotos de PERSONALIZAR, archivo con su número). Si no hay foto no ocupa lugar.
// Si el piloto tiene país (PILOTOS o el cronometraje) y está activado PERSONALIZAR > "Bandera detrás de las fotos"
// (config.flagsBehindPhotos, por defecto sí), detrás de la foto va su bandera desvaneciéndose (fotos de 50 px o más).
export default function DriverPhoto({ number, config, height = 80, maxWidth, style, fade = false }) {
  const [failed, setFailed] = useState(null);
  const src = number && config?.photosPath ? photoUrl(number) : null;
  if (!src || failed === src) return null;
  const code = config?.flagsBehindPhotos !== false && height >= 50 ? driverCountry(null, config, number) : '';
  const img = (extra) => (
    <img
      src={src} alt="" onError={() => setFailed(src)}
      style={{
        height: `${height}px`, maxWidth: maxWidth ? `${maxWidth}px` : undefined, objectFit: 'contain', objectPosition: 'bottom', display: 'block',
        // Difuminado hacia abajo para que la foto "salga" de la caja
        WebkitMaskImage: fade ? 'linear-gradient(to bottom, #000 70%, transparent 100%)' : undefined,
        ...extra
      }}
    />
  );
  if (!code) return img(style);
  // Con bandera: el estilo de ubicación (márgenes, flex, animación de entrada) va en el envoltorio
  return (
    <span style={{ position: 'relative', display: 'block', ...style }}>
      <FlagFade code={code} fadeTo="photo" opacity={0.85} dim={0.1} animated={height >= 90} style={{ inset: '12% -14% 0 -14%' }} />
      {img({ position: 'relative' })}
    </span>
  );
}
