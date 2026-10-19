// Aplica el formato de nombres elegido en PERSONALIZAR (iniciales, solo apellido, mayúsculas...).
export const formatDriverName = (name, format) => {
  if (!name) return '';
  const strName = String(name);
  if (!format || format === 'original') return strName;
  if (format === 'uppercase') return strName.toUpperCase();
  let first = '', last = '';
  if (strName.includes(',')) {
    const parts = strName.split(','); last = parts[0].trim(); first = parts[1].trim();
  } else {
    const parts = strName.trim().split(/\s+/);
    if (parts.length === 1) return format === 'uppercase' ? strName.toUpperCase() : strName;
    first = parts[0]; last = parts.slice(1).join(' ');
  }
  const cleanFirstInitial = first ? first.charAt(0).toUpperCase() : '';
  const cleanLastInitial = last ? last.charAt(0).toUpperCase() : '';
  switch (format) {
    case 'firstInitialLast': return first ? `${cleanFirstInitial}. ${last}` : last;
    case 'firstLastInitial': return last ? `${first} ${cleanLastInitial}.` : first;
    case 'lastOnly': return last || first;
    default: return strName;
  }
};
