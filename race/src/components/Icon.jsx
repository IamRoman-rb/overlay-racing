import MATERIAL_ICONS from '../utils/materialIcons';

// Ícono de Google (Material Symbols) embebido como SVG: hereda el color y el tamaño del texto que lo rodea.
export default function Icon({ name, size = '1.2em', color, style, title }) {
  const path = MATERIAL_ICONS[name];
  if (!path) return null;
  return (
    <svg
      viewBox="0 -960 960 960" width={size} height={size} fill="currentColor"
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}
      style={{ verticalAlign: '-0.25em', flexShrink: 0, color, ...style }}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} />
    </svg>
  );
}
