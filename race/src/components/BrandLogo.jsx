import { useState } from 'react';
import { brandSrc, brandMonoSrc, brandName, brandsEnabled } from '../utils/brands';

// Logo de la marca del auto (driver.brand). No ocupa lugar si no hay marca o si se desactivó en PERSONALIZAR.
// Modo blanco: los logos recortados se pintan con filtro (silueta blanca); los rellenos usan su versión monocromática.
export default function BrandLogo({ brand, config, size = 18, style }) {
  const [failed, setFailed] = useState(null);
  const white = config?.brandLogoStyle !== 'color';
  const mono = white && brandsEnabled(config) ? brandMonoSrc(brand) : null;
  // Si la versión monocromática no carga, se cae al logo original con filtro
  const useMono = mono && failed !== mono;
  const src = brandsEnabled(config) ? (useMono ? mono : brandSrc(brand)) : null;
  if (!src || failed === src) return null;
  return (
    <img
      src={src} alt={brandName(brand)} onError={() => setFailed(src)}
      style={{
        height: `${size}px`, maxWidth: `${Math.round(size * 1.8)}px`, objectFit: 'contain', verticalAlign: 'middle', flexShrink: 0,
        filter: white && !useMono ? 'brightness(0) invert(1)' : 'none', ...style
      }}
    />
  );
}
