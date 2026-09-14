// Tres "skins" visuales reutilizables que se pueden sumar como formato extra
// a cualquier gráfica ya existente, sin tener que rediseñar su layout interno.
export const SKIN_FORMATS = ['pro', 'gradient', 'glass'];

export function getSkinStyle(format, { themeMain, themeAccent }) {
  if (format === 'pro') {
    // Estilo "Broadcast Pro": panel oscuro con degradé sutil, borde de acento
    // nítido (no brillo) y sombra marcada — el lenguaje visual de gráficas de
    // TV de automovilismo profesional (F1, MotoGP, TC/ACTC, Carburando):
    // paneles planos y prolijos, alto contraste, sin efectos "gamer".
    return {
      background: 'linear-gradient(180deg, #1b1f27 0%, #05070a 100%)',
      border: `2px solid ${themeAccent}`,
      boxShadow: '0 14px 30px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)',
      textShadow: '0px 2px 3px rgba(0,0,0,0.85)',
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
  { value: 'pro', label: 'Broadcast Pro (Estilo F1 / MotoGP)' },
  { value: 'gradient', label: 'Degradé (Fondo con Gradiente)' },
  { value: 'glass', label: 'Cristal (Glassmorphism, Difuminado)' }
];
