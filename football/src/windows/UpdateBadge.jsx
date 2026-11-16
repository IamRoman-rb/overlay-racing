import { useEffect, useState } from 'react';

// AVISO DE ACTUALIZACIÓN PENDIENTE (arriba al centro del panel). Le pregunta al módulo (main.cjs) si el servidor tiene
// una versión más nueva que la que está abierta. Se revisa al abrir el panel y cada 30 minutos.
//  - Instalador nuevo: el módulo responde con lo que le dice el instalador (checkForUpdate).
//  - Instalador viejo: el módulo responde { fallback, moduleId, runningVersion } y acá se usa 'get-launcher-state', la
//    consulta del menú de módulos (el instalador corre en el mismo proceso), comparando con la versión abierta.
// ACTUALIZAR DESDE EL PANEL: se usa 'update-module' del instalador (existe en todas sus versiones): descarga, verifica la
// firma e instala la versión nueva mientras se sigue transmitiendo. Después, "REINICIAR" vuelve al menú de módulos y al
// abrir el módulo arranca la versión nueva. Si la versión abierta no es la más nueva instalada (se eligió una anterior
// del historial), la descarga podría borrar la carpeta que está en uso: en ese caso se actualiza desde el menú.
const CHECK_MS = 30 * 60 * 1000;

const compareVersions = (a, b) => {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
};

async function fetchUpdateInfo(ipc) {
  const r = await ipc.invoke('get-module-update');
  if (!r || !r.fallback) return r || null;
  const state = await ipc.invoke('get-launcher-state');
  const mod = (state?.modules || []).find(m => m.id === r.moduleId);
  if (!mod || !mod.version) return null;
  const updateAvailable = compareVersions(mod.version, r.runningVersion) > 0;
  return {
    moduleId: r.moduleId, runningVersion: r.runningVersion, newestInstalled: mod.installedVersion || null, latestVersion: mod.version,
    updateAvailable, updateBlocked: updateAvailable && !!mod.updateBlocked, notes: mod.notes || null
  };
}

function getIpc() {
  try { return typeof window !== 'undefined' && typeof window.require === 'function' ? window.require('electron').ipcRenderer : null; } catch { return null; }
}

const COLORS = {
  ok: { bg: 'rgba(46,204,113,0.15)', text: '#5ff0a0', line: '#2ecc71' },
  busy: { bg: 'rgba(52,152,219,0.15)', text: '#8fd0ff', line: '#3498db' },
  ready: { bg: 'rgba(241,196,15,0.18)', text: '#ffe066', line: '#f1c40f' },
  bad: { bg: 'rgba(231,76,60,0.15)', text: '#ff8a7a', line: '#e74c3c' }
};

export default function UpdateBadge({ style }) {
  const [info, setInfo] = useState(null);
  const [phase, setPhase] = useState('idle');   // idle | downloading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    const ipc = getIpc();
    if (!ipc) return undefined;
    let alive = true;
    const check = () => fetchUpdateInfo(ipc).then(r => { if (alive) setInfo(r); }).catch(() => {});
    check();
    const iv = setInterval(check, CHECK_MS);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  if (!info?.updateAvailable && phase !== 'ready') return null;
  const blocked = !!info?.updateBlocked;
  const version = info?.latestVersion ? `v${info.latestVersion}` : '';
  // Se puede descargar desde el panel si la versión abierta es la más nueva instalada (no se borra la que está en uso)
  const canDirect = !!info?.moduleId && (!info.newestInstalled || info.newestInstalled === info.runningVersion);

  const backToMenu = () => getIpc()?.send('return-to-launcher');

  const download = async () => {
    const ipc = getIpc();
    if (!ipc) return;
    setPhase('downloading'); setError('');
    try {
      const r = await ipc.invoke('update-module', { id: info.moduleId });
      if (r?.error) { setError(r.error); setPhase('error'); return; }
      setPhase('ready');
    } catch (e) {
      setError(e?.message || 'No se pudo descargar la actualización.'); setPhase('error');
    }
  };

  const onClick = () => {
    if (phase === 'downloading') return;
    if (phase === 'ready') {
      if (window.confirm(`La versión ${version} ya está instalada.\n\nPara usarla hay que reiniciar el módulo: se cierran el panel y el overlay y volvés al menú de módulos, donde la abrís con ABRIR.\n¿Reiniciar ahora?`)) backToMenu();
      return;
    }
    if (blocked) {
      window.alert(`Hay una versión nueva (${version}), pero necesita la versión más reciente del programa. Descargá e instalá el instalador nuevo para usarla.`);
      return;
    }
    if (!canDirect) {
      if (window.confirm(`Hay una versión nueva (${version}).\n\nEstás usando una versión anterior elegida del historial: para actualizar hay que volver al menú de módulos (se cierran el panel y el overlay).\n¿Volver ahora?`)) backToMenu();
      return;
    }
    if (window.confirm(`¿Descargar e instalar la versión ${version}?\n\nSe descarga en segundo plano: el panel y el overlay siguen funcionando. Cuando termine, la usás reiniciando el módulo.`)) download();
  };

  const look = phase === 'downloading' ? COLORS.busy : phase === 'ready' ? COLORS.ready : (phase === 'error' || blocked) ? COLORS.bad : COLORS.ok;
  const text = phase === 'downloading' ? `DESCARGANDO ${version}…`
    : phase === 'ready' ? `${version} LISTA · REINICIAR PARA USARLA`
      : phase === 'error' ? 'NO SE PUDO ACTUALIZAR · REINTENTAR'
        : blocked ? `NUEVA VERSIÓN ${version} · REQUIERE REINSTALAR`
          : `ACTUALIZACIÓN DISPONIBLE ${version} · DESCARGAR`;
  const title = [
    `Versión abierta: ${info?.runningVersion || '-'} · Nueva: ${info?.latestVersion || '-'}`,
    phase === 'error' && error ? `Error: ${error}` : '',
    info?.notes ? `\nNovedades: ${info.notes}` : ''
  ].filter(Boolean).join('\n');

  return (
    <button type="button" onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', cursor: phase === 'downloading' ? 'progress' : 'pointer',
      backgroundColor: look.bg, color: look.text, border: `1px solid ${look.line}`, fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px',
      fontFamily: 'Arial, sans-serif', whiteSpace: 'nowrap', boxShadow: `0 0 12px ${look.bg}`, ...style
    }}>
      <style>{'@keyframes updBadgePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.75); } } @keyframes updBadgeSpin { to { transform: rotate(360deg); } }'}</style>
      {phase === 'downloading'
        ? <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: `2px solid ${look.line}`, borderTopColor: 'transparent', animation: 'updBadgeSpin 0.8s linear infinite' }} />
        : <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: look.line, animation: 'updBadgePulse 1.4s ease-in-out infinite' }} />}
      {text}
    </button>
  );
}
