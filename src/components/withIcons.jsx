import { Fragment } from 'react';
import Icon from './Icon';

// Emojis y símbolos que usaba el programa como "íconos" -> ícono de Google equivalente (y color propio si lo tiene).
const GLYPH_ICONS = {
  '📷': ['photo_camera'], '🗑': ['delete'], '🟢': ['fiber_manual_record', '#2ecc71'], '🔴': ['fiber_manual_record', '#e74c3c'],
  '⚠': ['warning', '#f1c40f'], '❌': ['cancel', '#e74c3c'], '🚨': ['report', '#e74c3c'], '◀': ['chevron_left'], '▶': ['play_arrow'],
  '⏹': ['stop'], '🚦': ['traffic'], '⏱': ['timer'], '💾': ['save'], '📂': ['folder_open'], '✅': ['check_circle', '#2ecc71'],
  '🏆': ['trophy'], '📊': ['bar_chart'], '⏳': ['hourglass_top'], '📄': ['description'], '🚩': ['flag'], '📋': ['content_copy'],
  '🔎': ['search'], '🚫': ['block'], '☁': ['cloud'], '🔄': ['refresh'], '✓': ['check'], '🔍': ['search'], '📁': ['folder'],
  '↔': ['align_horizontal_center'], '↕': ['align_vertical_center'], '✛': ['center_focus_strong'], '🛑': ['stop_circle'],
  '📖': ['menu_book'], '💡': ['lightbulb'], 'ℹ': ['info'], '📍': ['location_on'], '💨': ['air'], '💧': ['water_drop'],
  '🌧': ['rainy'], '🔥': ['local_fire_department'], '✕': ['close'], '🏁': ['sports_score'], '🎬': ['movie'], '📡': ['sensors'],
  '🖼': ['image'], '🗂': ['folder_copy'], '📺': ['tv'], '▲': ['arrow_drop_up'], '▼': ['arrow_drop_down'],
  '↗': ['trending_up'], '↘': ['trending_down']
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Un glifo (con su selector de variante opcional) o un marcador explícito [[nombre]] / [[nombre|#color]]
const TOKEN_RE = new RegExp(`(\\[\\[[a-z_0-9]+(?:\\|#[0-9a-fA-F]{3,8})?\\]\\]|(?:${Object.keys(GLYPH_ICONS).map(escapeRe).join('|')})\\uFE0F?)`, 'u');

// Convierte un texto con emojis (o marcadores [[ícono]]) en texto + íconos de Google. Si no hay nada que reemplazar
// devuelve el mismo string, así se puede usar en cualquier lugar donde antes iba un texto.
export function withIcons(text, iconProps) {
  if (typeof text !== 'string') return text;
  const parts = text.split(TOKEN_RE);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith('[[')) {
          const [name, color] = part.slice(2, -2).split('|');
          return <Icon key={i} name={name} color={color} {...iconProps} />;
        }
        const glyph = GLYPH_ICONS[part.replace(/️$/, '')];
        if (glyph) return <Icon key={i} name={glyph[0]} color={glyph[1]} {...iconProps} />;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
