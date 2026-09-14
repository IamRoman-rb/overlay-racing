// Tres "skins" visuales reutilizables que se pueden sumar como formato extra
// a cualquier gráfica ya existente, sin tener que rediseñar su layout interno.
export const SKIN_FORMATS = ['neon', 'gradient', 'glass'];

export function getSkinStyle(format, { themeMain, themeAccent }) {
  if (format === 'neon') {
    return {
      background: 'rgba(5,5,5,0.92)',
      border: `2px solid ${themeAccent}`,
      boxShadow: `0 0 6px ${themeAccent}, 0 0 22px ${themeAccent}99, 0 0 44px ${themeAccent}44`,
      textShadow: `0 0 8px ${themeAccent}bb`,
      backdropFilter: 'none'
    };
  }
  if (format === 'gradient') {
    return {
      background: `linear-gradient(135deg, ${themeMain}, ${themeAccent})`,
      border: 'none',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      textShadow: '1px 1px 3px rgba(0,0,0,0.6)',
      backdropFilter: 'none'
    };
  }
  if (format === 'glass') {
    return {
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.25)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      textShadow: 'none',
      backdropFilter: 'blur(14px)'
    };
  }
  return null;
}

export const SKIN_OPTIONS = [
  { value: 'neon', label: 'Neón (Brillo + Borde Luminoso)' },
  { value: 'gradient', label: 'Degradé (Fondo con Gradiente)' },
  { value: 'glass', label: 'Cristal (Glassmorphism, Difuminado)' }
];
