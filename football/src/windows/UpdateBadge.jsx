import { useEffect, useState } from 'react';

// AVISO DE ACTUALIZACIÓN PENDIENTE (arriba al centro del panel). Le pregunta al módulo (main.cjs -> instalador) si el
// servidor tiene una versión más nueva que la que está abierta. Se revisa al abrir el panel y cada 30 minutos.
// Con un instalador viejo (sin esa consulta) la respuesta es null y no se muestra nada.
const CHECK_MS = 30 * 60 * 1000;

function getIpc() {
  try { return typeof window !== 'undefined' && typeof window.require === 'function' ? window.require('electron').ipcRenderer : null; } catch { return null; }
}

export default function UpdateBadge({ style }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const ipc = getIpc();
    if (!ipc) return undefined;
    let alive = true;
    const check = () => ipc.invoke('get-module-update').then(r => { if (alive) setInfo(r || null); }).catch(() => {});
    check();
    const iv = setInterval(check, CHECK_MS);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  if (!info?.updateAvailable) return null;
  const blocked = !!info.updateBlocked;
  const version = info.latestVersion ? `v${info.latestVersion}` : '';
  const title = [
    `Versión abierta: ${info.runningVersion || '-'} · Nueva: ${info.latestVersion || '-'}`,
    blocked ? 'Esta versión necesita reinstalar el programa con el instalador nuevo.' : 'Hacé clic para volver al menú de módulos y actualizar.',
    info.notes ? `\nNovedades: ${info.notes}` : ''
  ].filter(Boolean).join('\n');

  const onClick = () => {
    const ipc = getIpc();
    if (!ipc) return;
    if (blocked) {
      window.alert(`Hay una versión nueva (${version}), pero necesita la versión más reciente del programa. Descargá e instalá el instalador nuevo para usarla.`);
      return;
    }
    if (window.confirm(`Hay una versión nueva (${version}).\n\nPara instalarla hay que volver al menú de módulos: se cierran el panel y el overlay.\n¿Volver ahora?`)) {
      ipc.send('return-to-launcher');
    }
  };

  return (
    <button type="button" onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', cursor: 'pointer',
      backgroundColor: blocked ? 'rgba(231,76,60,0.15)' : 'rgba(46,204,113,0.15)', color: blocked ? '#ff8a7a' : '#5ff0a0',
      border: `1px solid ${blocked ? '#e74c3c' : '#2ecc71'}`, fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px',
      fontFamily: 'Arial, sans-serif', whiteSpace: 'nowrap', boxShadow: '0 0 12px rgba(46,204,113,0.25)', ...style
    }}>
      <style>{'@keyframes updBadgePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.75); } }'}</style>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: blocked ? '#e74c3c' : '#2ecc71', animation: 'updBadgePulse 1.4s ease-in-out infinite' }} />
      {blocked ? 'NUEVA VERSIÓN · REQUIERE REINSTALAR' : 'ACTUALIZACIÓN DISPONIBLE'} {version}
    </button>
  );
}
