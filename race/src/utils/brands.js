// Marcas de autos: logos en race/public/brands/<slug>.png (se copian a dist/brands) e índice en src/data/brands.json
import BRANDS from '../data/brands.json';

export { BRANDS };
export const brandName = (slug) => (BRANDS.find(b => b.slug === slug) || {}).name || '';
// Ruta relativa: funciona en la ventana del overlay (file://), por IP (servidor del programa) y en desarrollo (Vite)
export const brandSrc = (slug) => (slug ? `brands/${slug}.png` : null);
// Por defecto los logos van en blanco (un solo color, como en las torres de TV); config.brandLogoStyle = 'color' los deja como son
export const brandsEnabled = (config) => config?.showBrandLogos !== false;
