// Marcas de autos: logos en race/public/brands/<slug>.png (se copian a dist/brands) e índice en src/data/brands.json
import BRANDS from '../data/brands.json';

export { BRANDS };
export const brandName = (slug) => (BRANDS.find(b => b.slug === slug) || {}).name || '';
// Ruta relativa: funciona en la ventana del overlay (file://), por IP (servidor del programa) y en desarrollo (Vite)
export const brandSrc = (slug) => (slug ? `brands/${slug}.png` : null);
// Logos rellenos (escudos, óvalos: Ford, Fiat, Ferrari...): en modo blanco la silueta sería una mancha blanca, así que
// usan una versión monocromática pregenerada que conserva el detalle (brands/mono/<slug>.png, ver scripts/brand-logos.cjs)
const MONO = new Set(BRANDS.filter(b => b.mono).map(b => b.slug));
export const brandMonoSrc = (slug) => (slug && MONO.has(slug) ? `brands/mono/${slug}.png` : null);
// Por defecto los logos van en blanco (un solo color, como en las torres de TV); config.brandLogoStyle = 'color' los deja como son
export const brandsEnabled = (config) => config?.showBrandLogos !== false;
