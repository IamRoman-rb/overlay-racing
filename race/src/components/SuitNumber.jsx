import { useSuitStyle } from '../utils/suitColor';

// Número de piloto escrito como texto ("#7"): si está activado el color del traje (PILOTOS) se dibuja en un recuadro
// de ese color; si no, queda igual que antes (texto con el estilo de la gráfica).
//   chip: el estilo ya es un recuadro (fondo + padding): sólo se cambian el fondo y el color del texto.
export default function SuitNumber({ number, config, prefix = '#', style, chipStyle, chip = false }) {
  const sc = useSuitStyle([number], config);
  const suit = sc(number);
  if (number === undefined || number === null || number === '') return null;
  if (!suit.backgroundColor) return <span style={style}>{prefix}{number}</span>;
  if (chip) return <span style={{ ...style, ...suit }}>{prefix}{number}</span>;
  return (
    <span style={{ ...style, ...suit, display: 'inline-block', padding: '0 0.3em', borderRadius: '3px', lineHeight: 1.2, fontWeight: 900, ...chipStyle }}>{number}</span>
  );
}
