// Configuración del instalador (launcher). Los módulos del software NO viven acá: se descargan del servidor.

// Servidor con las licencias y los paquetes de los módulos. Para probar contra el backend local:
//   OVERLAY_SERVER_URL=http://localhost:8090
const SERVER_URL = (process.env.OVERLAY_SERVER_URL || 'https://overlayracing.site').replace(/\/+$/, '');

// Versión de la "interfaz" entre el instalador y los módulos (lo que el instalador le pasa a start(ctx)).
// Un módulo publicado con launcherApi mayor al de este instalador pide actualizar el instalador.
const LAUNCHER_API = 1;

module.exports = { SERVER_URL, LAUNCHER_API };
