// Configuración del instalador (launcher). Los módulos del software NO viven acá: se descargan del servidor.

// Servidor con las licencias y los paquetes de los módulos. Para probar contra el backend local:
//   OVERLAY_SERVER_URL=http://localhost:8090
const SERVER_URL = (process.env.OVERLAY_SERVER_URL || 'https://overlayracing.site').replace(/\/+$/, '');

// Versión de la "interfaz" entre el instalador y los módulos (lo que el instalador le pasa a start(ctx)).
// Un módulo publicado con launcherApi mayor al de este instalador pide actualizar el instalador.
const LAUNCHER_API = 1;

// Derechos de autor: el software está inscripto en la Dirección Nacional del Derecho de Autor (Registro de Obra Publicada - Software).
// Se muestra en el panel del launcher; el mismo texto va en "copyright" de package.json (propiedades del .exe).
const COPYRIGHT = {
  year: 2026,
  holder: 'Roman Manuel Borla',
  registry: 'RL-2026-107621619-APN-DNDA#MJ',
};

module.exports = { SERVER_URL, LAUNCHER_API, COPYRIGHT };
