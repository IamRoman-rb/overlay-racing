import { useState } from 'react';
import { brandSrc, brandName, brandsEnabled } from '../utils/brands';

// Logo de la marca del auto (driver.brand). No ocupa lugar si no hay marca o si se desactivó en PERSONALIZAR.
export default function BrandLogo({ brand, config, size = 18, style }) {
  const [failed, setFailed] = useState(null);
  const src = brandsEnabled(config) ? brandSrc(brand) : null;
  if (!src || failed === src) return null;
  const white = config?.brandLogoStyle !== 'color';
  return (
    <img
      src={src} alt={brandName(brand)} onError={() => setFailed(src)}
      style={{
        height: `${size}px`, maxWidth: `${Math.round(size * 1.8)}px`, objectFit: 'contain', verticalAlign: 'middle', flexShrink: 0,
        filter: white ? 'brightness(0) invert(1)' : 'none', ...style
      }}
    />
  );
}
