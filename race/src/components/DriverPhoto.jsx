import { useState } from 'react';
import { photoUrl } from '../utils/elite';

// Foto de un piloto (carpeta de fotos de PERSONALIZAR, archivo con su número). Si no hay foto no ocupa lugar.
export default function DriverPhoto({ number, config, height = 80, maxWidth, style, fade = false }) {
  const [failed, setFailed] = useState(null);
  const src = number && config?.photosPath ? photoUrl(number) : null;
  if (!src || failed === src) return null;
  return (
    <img
      src={src} alt="" onError={() => setFailed(src)}
      style={{
        height: `${height}px`, maxWidth: maxWidth ? `${maxWidth}px` : undefined, objectFit: 'contain', objectPosition: 'bottom', display: 'block',
        // Difuminado hacia abajo para que la foto "salga" de la caja
        WebkitMaskImage: fade ? 'linear-gradient(to bottom, #000 70%, transparent 100%)' : undefined,
        ...style
      }}
    />
  );
}

// ¿La gráfica muestra fotos? (PERSONALIZAR > "Mostrar fotos de los pilotos", config.showPhotos_<id>)
export const photosEnabled = (config, id) => !!config?.photosPath && config?.[`showPhotos_${id}`] === true;
