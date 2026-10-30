// Comunicación entre el panel y el overlay. Hay tres formas según dónde corre la página:
//   electron : dentro de las ventanas del programa (IPC con main.cjs)
//   socket   : abierta desde OBS / vMix / otra PC en http://<ip>:8080 (Socket.IO contra main.cjs)
//   local    : abierta en un navegador común durante el desarrollo (localStorage + BroadcastChannel entre pestañas)
let ipc = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipc = window.require('electron').ipcRenderer; } catch (e) { console.warn('No se pudo cargar ipcRenderer', e); }
}

export const mode = ipc ? 'electron' : (typeof window !== 'undefined' && window.location.port === '8080' ? 'socket' : 'local');
export const inElectron = !!ipc;

const STORAGE_KEY = 'football-overlay-state';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(STORAGE_KEY) : null;

let socketPromise = null;
function getSocket() {
  if (!socketPromise) {
    // Mismo host desde el que se cargó la página, siempre puerto 8080 (donde vive main.cjs)
    const url = `${window.location.protocol}//${window.location.hostname}:8080`;
    socketPromise = import('socket.io-client').then(({ io }) => io(url, { reconnection: true, reconnectionDelay: 1000, transports: ['websocket', 'polling'] }));
  }
  return socketPromise;
}

export const bridge = {
  // Estado guardado (o null si todavía no hay nada)
  async load() {
    if (mode === 'electron') return ipc.invoke('fb-get-state');
    if (mode === 'socket') {
      const socket = await getSocket();
      return new Promise(resolve => {
        socket.once('fb-state', resolve);
        setTimeout(() => resolve(null), 4000);
      });
    }
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  },

  push(state) {
    if (mode === 'electron') ipc.send('fb-push-state', state);
    else if (mode === 'socket') getSocket().then(s => s.emit('fb-push-state', state));
    else {
      // El estado "al aire" no se guarda (igual que en main.cjs): sólo viaja entre pestañas
      const persistent = { ...state };
      delete persistent.live;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persistent)); } catch { /* cuota llena: se sigue sin guardar */ }
      if (channel) channel.postMessage(state);
    }
  },

  // Recibe cada cambio de estado. Devuelve la función para dejar de escuchar.
  subscribe(callback) {
    if (mode === 'electron') {
      const handler = (_e, state) => callback(state);
      ipc.on('fb-state', handler);
      return () => ipc.removeListener('fb-state', handler);
    }
    if (mode === 'socket') {
      let socket = null;
      getSocket().then(s => { socket = s; s.on('fb-state', callback); });
      return () => { if (socket) socket.off('fb-state', callback); };
    }
    if (!channel) return () => {};
    const handler = (e) => callback(e.data);
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
  },

  send(channelName, ...args) { if (ipc) ipc.send(channelName, ...args); },
  invoke(channelName, ...args) { return ipc ? ipc.invoke(channelName, ...args) : Promise.resolve(null); }
};
