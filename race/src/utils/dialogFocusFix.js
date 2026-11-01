// En Electron/Windows, tras un alert()/confirm()/prompt() nativo la ventana queda sin foco de
// teclado: los inputs se pueden vaciar con el mouse pero ya no reciben teclas. Después de cada
// diálogo le pedimos al proceso principal que le devuelva el foco a la ventana.
export function installDialogFocusFix() {
  let ipcRenderer = null;
  try { ipcRenderer = window.require?.('electron')?.ipcRenderer || null; } catch { /* fuera de Electron */ }
  if (!ipcRenderer) return;

  const refocus = () => {
    ipcRenderer.send('refocus-window');
    setTimeout(() => {
      const el = document.activeElement;
      if (el && el !== document.body && typeof el.focus === 'function') el.focus();
    }, 50);
  };

  ['alert', 'confirm', 'prompt'].forEach((name) => {
    const original = window[name]?.bind(window);
    if (!original) return;
    window[name] = (...args) => {
      const result = original(...args);
      refocus();
      return result;
    };
  });
}
