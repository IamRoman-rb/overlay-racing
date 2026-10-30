// Atajos de teclado del panel de control: una tecla o combinación por acción (casi siempre, "poner / sacar del aire" una gráfica).
// Se guardan en config.hotkeys como { idDeAcción: 'Ctrl+Shift+A' }.

// Acciones agrupadas como se muestran en la pestaña ATAJOS. `label` es una clave de traducción.
export const HOTKEY_GROUPS = [
  {
    id: 'personal',
    actions: ['relator', 'comentarista', 'notero1', 'notero2', 'circuito', 'clima'].map(id => ({ id, label: `graphics.${id}` }))
  },
  {
    id: 'flags',
    actions: [
      { id: 'flagRed', label: 'panel.flagRed' }, { id: 'flagTricolor', label: 'panel.flagTricolor' },
      { id: 'flagBlue', label: 'panel.flagBlue' }, { id: 'flagGreen', label: 'panel.flagGreen' },
      { id: 'flagCheckered', label: 'panel.flagCheckered' }, { id: 'flagBlack', label: 'panel.flagBlack' }
    ]
  },
  {
    id: 'alerts',
    actions: [
      { id: 'trackAlertEmit', label: 'hotkeys.act.trackAlertEmit' }, { id: 'trackAlertHide', label: 'hotkeys.act.trackAlertHide' },
      { id: 'penaltyHide', label: 'hotkeys.act.penaltyHide' }
    ]
  },
  {
    id: 'lights',
    actions: [{ id: 'lightsStart', label: 'hotkeys.act.lightsStart' }, { id: 'lightsHide', label: 'hotkeys.act.lightsHide' }]
  },
  {
    id: 'grid',
    actions: [
      { id: 'grid', label: 'graphics.grid' }, { id: 'gridPrev', label: 'hotkeys.act.gridPrev' }, { id: 'gridNext', label: 'hotkeys.act.gridNext' }
    ]
  },
  {
    id: 'graphics',
    actions: [
      { id: 'ticker', label: 'graphics.ticker' }, { id: 'tower', label: 'graphics.tower' },
      { id: 'lapCounter', label: 'graphics.lapCounter' }, { id: 'fastestLap', label: 'graphics.fastestLap' },
      { id: 'branding', label: 'graphics.branding' }, { id: 'evento', label: 'graphics.evento' }, { id: 'battle', label: 'graphics.battle' },
      { id: 'virtualChamp', label: 'graphics.virtualChamp' }, { id: 'lapTimesHistory', label: 'graphics.lapTimesHistory' },
      { id: 'votingQR', label: 'graphics.votingQR' }, { id: 'votingResults', label: 'graphics.votingResults' }
    ]
  },
  {
    id: 'closing',
    actions: [
      { id: 'finalResults', label: 'graphics.finalResults' }, { id: 'finalPrev', label: 'hotkeys.act.finalPrev' },
      { id: 'finalNext', label: 'hotkeys.act.finalNext' }, { id: 'winner', label: 'graphics.winner' }
    ]
  },
  {
    id: 'zocalos',
    actions: [0, 1, 2, 3, 4, 5].map(i => ({ id: `zocalo${i + 1}`, label: 'hotkeys.act.zocalo', n: i + 1 }))
  }
];

export const HOTKEY_ACTIONS = HOTKEY_GROUPS.flatMap(g => g.actions);

// Nombre legible de las teclas que no son letras ni números (se toman del `code` para que no dependan de la distribución del teclado)
const KEY_NAMES = {
  Space: 'Space', Enter: 'Enter', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
  Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  NumpadAdd: 'Num+', NumpadSubtract: 'Num-', NumpadMultiply: 'Num*', NumpadDivide: 'Num/',
  NumpadDecimal: 'Num.', NumpadEnter: 'NumEnter',
  Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'",
  Backquote: '`', BracketLeft: '[', BracketRight: ']', Backslash: '\\', IntlBackslash: '<'
};

const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'OS'];

// Convierte un evento de teclado en 'Ctrl+Alt+Shift+Meta+Tecla'. Devuelve null si solo se apretó un modificador.
export function comboFromEvent(e) {
  if (MODIFIER_KEYS.includes(e.key)) return null;
  let main;
  if (/^Key[A-Z]$/.test(e.code)) main = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) main = e.code.slice(5);
  else if (/^Numpad\d$/.test(e.code)) main = `Num${e.code.slice(6)}`;
  else if (KEY_NAMES[e.code]) main = KEY_NAMES[e.code];
  else if (/^F\d{1,2}$/.test(e.code)) main = e.code;
  else if (e.key && e.key.length === 1) main = e.key.toUpperCase();
  else main = e.key || e.code;
  if (!main) return null;
  const mods = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Meta');
  return [...mods, main].join('+');
}

// Escribiendo en un campo de texto (o en uno que se está por asignar) las teclas son para el campo, no para las gráficas.
export function shouldIgnoreHotkey(e) {
  if (e.isComposing) return true;
  const el = e.target;
  if (!el || !el.tagName) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return true;
  return typeof el.closest === 'function' && !!el.closest('[data-hotkey-capture]');
}

// Acción a la que corresponde una combinación, o null
export function findHotkeyAction(hotkeys, combo) {
  if (!hotkeys || !combo) return null;
  return Object.keys(hotkeys).find(id => hotkeys[id] === combo) || null;
}
