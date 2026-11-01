// Tipografías de Google Fonts disponibles para los gráficos. Se descargan de internet al abrir el programa
// (el overlay ya necesita conexión). Si falta la conexión, el navegador usa la tipografía genérica del `fallback`.

// Las 4 que ya existían en la lista (Arial va aparte: viene con Windows)
const BASE_FAMILIES = [
  'Exo+2:ital,wght@0,400;0,700;0,900;1,900',
  'Montserrat:ital,wght@0,400;0,700;0,900;1,900',
  'Oswald:wght@400;700',
  'Teko:wght@400;600;700'
];

// Las que se suman. `query` es el pedido a Google Fonts: los pesos pedidos (los que la tipografía realmente tiene) cubren
// el normal, el negrita y el extra negrita que usan los gráficos. Los valores de `wght` tienen que ir en orden creciente.
export const EXTRA_FONTS = [
  { name: 'Bebas Neue', query: 'Bebas+Neue', fallback: 'sans-serif' },
  { name: 'Rajdhani', query: 'Rajdhani:wght@500;600;700', fallback: 'sans-serif' },
  { name: 'Orbitron', query: 'Orbitron:wght@500;700;900', fallback: 'sans-serif' },
  { name: 'Barlow Condensed', query: 'Barlow+Condensed:wght@500;600;700;800;900', fallback: 'sans-serif' },
  { name: 'Russo One', query: 'Russo+One', fallback: 'sans-serif' },
  { name: 'Chakra Petch', query: 'Chakra+Petch:wght@500;600;700', fallback: 'sans-serif' },
  { name: 'Saira Condensed', query: 'Saira+Condensed:wght@500;600;700;800;900', fallback: 'sans-serif' },
  { name: 'Anton', query: 'Anton', fallback: 'sans-serif' },
  { name: 'Racing Sans One', query: 'Racing+Sans+One', fallback: 'sans-serif' },
  { name: 'Titillium Web', query: 'Titillium+Web:wght@400;600;700;900', fallback: 'sans-serif' }
];

// Valor para guardar en config.fontFamily y usar en `font-family`
export const fontCssValue = (font) => `'${font.name}', ${font.fallback}`;

// Una sola hoja de estilos con todas las tipografías. Si se cambia la lista, hay que actualizar también el <link> de index.html.
export const GOOGLE_FONTS_URL = `https://fonts.googleapis.com/css2?${[...BASE_FAMILIES, ...EXTRA_FONTS.map(f => f.query)]
  .map(f => `family=${f}`)
  .join('&')}&display=swap`;
