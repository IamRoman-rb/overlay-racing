// Tipografías de Google Fonts disponibles para las gráficas. Se descargan de internet al abrir el programa
// (el overlay ya necesita conexión); sin conexión el navegador usa la tipografía genérica del `fallback`.
// `query` es el pedido a Google Fonts: tiene que usar pesos que la tipografía realmente tenga, si no Google rechaza TODO el pedido.
export const FONTS = [
  // Condensadas / deportivas
  { name: 'Barlow Condensed', query: 'Barlow+Condensed:wght@500;600;700;800;900', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Oswald', query: 'Oswald:wght@400;500;600;700', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Bebas Neue', query: 'Bebas+Neue', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Anton', query: 'Anton', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Teko', query: 'Teko:wght@400;600;700', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Roboto Condensed', query: 'Roboto+Condensed:wght@400;700', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Saira Condensed', query: 'Saira+Condensed:wght@500;600;700;800;900', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Archivo Narrow', query: 'Archivo+Narrow:wght@500;600;700', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Fjalla One', query: 'Fjalla+One', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Big Shoulders Display', query: 'Big+Shoulders+Display:wght@500;700;900', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Staatliches', query: 'Staatliches', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Squada One', query: 'Squada+One', fallback: "'Arial Narrow', sans-serif" },
  { name: 'Passion One', query: 'Passion+One:wght@400;700;900', fallback: "'Arial Black', sans-serif" },
  // Modernas / geométricas
  { name: 'Montserrat', query: 'Montserrat:wght@500;600;700;800;900', fallback: "'Segoe UI', sans-serif" },
  { name: 'Poppins', query: 'Poppins:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Inter', query: 'Inter:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Outfit', query: 'Outfit:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Sora', query: 'Sora:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Lexend', query: 'Lexend:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Space Grotesk', query: 'Space+Grotesk:wght@500;600;700', fallback: "'Segoe UI', sans-serif" },
  { name: 'DM Sans', query: 'DM+Sans:wght@500;700', fallback: "'Segoe UI', sans-serif" },
  { name: 'Work Sans', query: 'Work+Sans:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Nunito', query: 'Nunito:wght@600;700;800;900', fallback: "'Segoe UI', sans-serif" },
  { name: 'Raleway', query: 'Raleway:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Barlow', query: 'Barlow:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Kanit', query: 'Kanit:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Titillium Web', query: 'Titillium+Web:wght@400;600;700;900', fallback: "'Segoe UI', sans-serif" },
  { name: 'Rajdhani', query: 'Rajdhani:wght@500;600;700', fallback: "'Segoe UI', sans-serif" },
  { name: 'Exo 2', query: 'Exo+2:wght@500;600;700;800;900', fallback: "'Segoe UI', sans-serif" },
  { name: 'Roboto', query: 'Roboto:wght@500;700;900', fallback: "'Segoe UI', sans-serif" },
  { name: 'Open Sans', query: 'Open+Sans:wght@500;600;700;800', fallback: "'Segoe UI', sans-serif" },
  { name: 'Lato', query: 'Lato:wght@400;700;900', fallback: "'Segoe UI', sans-serif" },
  { name: 'Ubuntu', query: 'Ubuntu:wght@500;700', fallback: "'Segoe UI', sans-serif" },
  // Con carácter
  { name: 'Orbitron', query: 'Orbitron:wght@500;700;900', fallback: 'sans-serif' },
  { name: 'Russo One', query: 'Russo+One', fallback: 'sans-serif' },
  { name: 'Chakra Petch', query: 'Chakra+Petch:wght@500;600;700', fallback: 'sans-serif' },
  { name: 'Racing Sans One', query: 'Racing+Sans+One', fallback: 'sans-serif' },
  { name: 'Archivo Black', query: 'Archivo+Black', fallback: "'Arial Black', sans-serif" },
  { name: 'Bungee', query: 'Bungee', fallback: "'Arial Black', sans-serif" },
  { name: 'Alfa Slab One', query: 'Alfa+Slab+One', fallback: 'serif' },
  { name: 'Playfair Display', query: 'Playfair+Display:wght@500;700;900', fallback: 'serif' }
];

// Valor para guardar en look.font y usar en `font-family`
export const fontCssValue = (font) => `'${font.name}', ${font.fallback}`;
export const FONT_OPTIONS = [
  ...FONTS.map(f => ({ label: f.name, value: fontCssValue(f) })),
  { label: 'Arial', value: 'Arial, sans-serif' }
];

// Una sola hoja de estilos con todas las tipografías
export const GOOGLE_FONTS_URL = `https://fonts.googleapis.com/css2?${FONTS.map(f => `family=${f.query}`).join('&')}&display=swap`;

// Carga la hoja de tipografías una sola vez
export function installFonts() {
  if (typeof document === 'undefined' || document.getElementById('google-fonts')) return;
  const link = document.createElement('link');
  link.id = 'google-fonts';
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
}
