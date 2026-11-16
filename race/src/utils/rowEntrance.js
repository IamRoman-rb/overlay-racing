// Aparición de las filas de una lista (torre de posiciones, resultados finales): de a una, con distintos efectos.
// config[`${id}RowAnim`]: efecto (ver ROW_EFFECTS) y config[`${id}RowStep`]: milisegundos entre una fila y la siguiente.
// La animación se arranca cada vez que la gráfica sale al aire (o cambia de página, si el contenedor se vuelve a montar):
// mientras está oculta la animación queda en 'none' y al mostrarla se asigna, lo que la hace empezar de cero.
// Los keyframes sólo definen el punto de partida: la fila termina en su propio estilo (opacidad de DSQ, etc.).

export const ROW_EFFECTS = [
  ['stagger', 'Escalonado (Fundido de Arriba a Abajo)'],
  ['slideLeft', 'Escalonado desde la Izquierda'],
  ['slideRight', 'Escalonado desde la Derecha'],
  ['alternate', 'Alternado (Una de Cada Costado)'],
  ['flip', 'Persiana (Cada Fila Gira)'],
  ['zoom', 'Zoom (Cada Fila Crece)'],
  ['drop', 'Caída con Rebote'],
  ['reverse', 'De Atrás para Adelante (el Primero al Final)'],
  ['none', 'Sin Efecto (Todas Juntas)']
];

export const ROW_DEFAULT_STEP = { tower: 60, finalResults: 110 };

export const ROW_ANIM_CSS = [
  '@keyframes reFade { from { opacity: 0; transform: translateY(14px); } }',
  '@keyframes reLeft { from { opacity: 0; transform: translateX(-60px); } }',
  '@keyframes reRight { from { opacity: 0; transform: translateX(60px); } }',
  '@keyframes reFlip { from { opacity: 0; transform: perspective(600px) rotateX(-90deg); } }',
  '@keyframes reZoom { from { opacity: 0; transform: scale(0.6); } }',
  '@keyframes reDrop { 0% { opacity: 0; transform: translateY(-30px); } 60% { opacity: 1; transform: translateY(5px); } 80% { transform: translateY(-2px); } }'
].join(' ');

const KEYFRAME = { stagger: 'reFade', reverse: 'reFade', slideLeft: 'reLeft', slideRight: 'reRight', flip: 'reFlip', zoom: 'reZoom', drop: 'reDrop' };

export function rowEffect(config, id) {
  const v = config?.[`${id}RowAnim`];
  return ROW_EFFECTS.some(([k]) => k === v) ? v : 'stagger';
}

export function rowStep(config, id) {
  const n = parseInt(config?.[`${id}RowStep`], 10);
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : (ROW_DEFAULT_STEP[id] || 80);
}

// Estilo de la fila `index` de `total`. active: la gráfica está al aire. baseDelay: segundos antes de la primera fila
// (para que arranque cuando ya entró la caja).
export function rowEntranceStyle(config, id, index, total, active, baseDelay = 0.15) {
  const effect = rowEffect(config, id);
  if (effect === 'none') return {};
  if (!active) return { animation: 'none' };
  const order = effect === 'reverse' ? Math.max(0, total - 1 - index) : index;
  const name = effect === 'alternate' ? (index % 2 ? 'reRight' : 'reLeft') : KEYFRAME[effect];
  const dur = effect === 'drop' ? 0.55 : effect === 'flip' ? 0.5 : 0.42;
  const delay = baseDelay + (order * rowStep(config, id)) / 1000;
  return {
    animation: `${name} ${dur}s cubic-bezier(0.22, 0.8, 0.3, 1) ${delay.toFixed(3)}s backwards`,
    transformOrigin: effect === 'flip' ? 'center top' : 'center center'
  };
}

// Torre con más pilotos de los que entran (PERSONALIZAR > TORRE): cuántas de las últimas filas se van reemplazando
// por los pilotos que faltan, y cuántos segundos se ve cada tanda
export const towerPageRows = (config) => {
  const n = parseInt(config?.towerPageRows, 10);
  return Number.isFinite(n) && n >= 1 && n <= 15 ? n : 5;
};
// Torres angostas (Elite / Angosta): crecen a lo alto, así que se elige cuántas filas se ven como máximo
export const towerNarrowRows = (config) => {
  const n = parseInt(config?.towerNarrowRows, 10);
  return Number.isFinite(n) && n >= 5 && n <= 40 ? n : 15;
};
export const towerPageSeconds = (config) => {
  const n = parseInt(config?.towerPageSeconds, 10);
  return Number.isFinite(n) && n >= 3 && n <= 60 ? n : 8;
};
