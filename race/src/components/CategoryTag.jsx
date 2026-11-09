import { getCategory } from '../utils/raceVisuals';

// Nombre de la categoría dentro del título de una gráfica. Va como hijo del elemento del título (no como un objeto
// nuevo de la gráfica) para no correr los objetos que ya se movieron en el EDITOR.
//   block: en una línea aparte debajo del título; si no, a continuación del título separado por un punto.
//   unlessIn: si ese texto ya incluye la categoría (por ejemplo el nombre de la sesión "GT Series - Final"), no se repite.
export default function CategoryTag({ config, id, block = false, color, size = '0.72em', style, unlessIn }) {
  const name = getCategory(config, id);
  if (!name) return null;
  if (unlessIn && String(unlessIn).toLowerCase().includes(name.toLowerCase())) return null;
  if (block) {
    return (
      <span style={{ display: 'block', fontSize: size, fontStyle: 'normal', letterSpacing: '1px', lineHeight: 1.25, marginTop: '2px', opacity: 0.85, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase', ...style }}>
        {name}
      </span>
    );
  }
  return (
    <span style={{ fontSize: size, fontStyle: 'normal', opacity: 0.85, color, whiteSpace: 'nowrap', textTransform: 'uppercase', ...style }}>
      {' · '}{name}
    </span>
  );
}
