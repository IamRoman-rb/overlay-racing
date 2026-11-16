// Búsqueda de texto sin distinguir mayúsculas ni acentos ("clasificacion" encuentra "CLASIFICACIÓN")
export const normalizeSearch = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ¿Coincide alguno de los textos con todas las palabras buscadas?
export function matchesSearch(query, ...texts) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = texts.map(normalizeSearch).join(' ');
  return words.every(w => haystack.includes(w));
}
