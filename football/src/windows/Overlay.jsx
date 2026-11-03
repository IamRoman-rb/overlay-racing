import { useEffect, useState } from 'react';
import Stage from '../graphics/Stage';
import { bridge, inElectron } from '../bridge';
import { defaultState, normalizeState, CANVAS, GRAPHICS } from '../state';
import { enableDiagnostics, diagInfo } from '../diag';

// Resumen (sin datos ni imágenes) de lo que el overlay recibió del EDITOR y de PERSONALIZAR: cuántos tamaños de texto y objetos
// movidos tiene cada gráfica y con qué logos se tapa. Sirve para ver en el registro si a esta PC le llega la configuración.
function editSummary(state) {
  const parts = [];
  GRAPHICS.forEach(({ id }) => {
    const sizes = Object.keys(state.textSizes[id] || {}).length;
    const moved = Object.keys(state.edits[id] || {}).length;
    const cover = state.layout[id]?.cover || 'none';
    const bits = [];
    if (sizes) bits.push(`${sizes} tamaño(s)`);
    if (moved) bits.push(`${moved} movido(s)`);
    if (cover !== 'none') {
      const league = !!state.match.competitionLogo;
      const producer = !!state.brand.producerLogo;
      const loaded = cover === 'both' ? `${Number(league) + Number(producer)}/2` : (cover === 'league' ? league : producer) ? '1/1' : '0/1';
      bits.push(`tapado ${cover} (logos ${loaded})`);
    }
    if (bits.length) parts.push(`${id}: ${bits.join(', ')}`);
  });
  return parts.length ? parts.join(' · ') : 'sin tamaños, objetos movidos ni tapado';
}

// Ventana del overlay: lo único que hace es dibujar el estado que le manda el panel.
// Dentro del programa se pinta de verde (croma) para capturarla en vMix/OBS; abierta como navegador queda transparente.
export default function Overlay() {
  const [state, setState] = useState(defaultState);
  const [received, setReceived] = useState(false);
  const summary = editSummary(state);

  useEffect(() => {
    document.body.classList.add('overlay-mode');
    enableDiagnostics();
    // Al conectarse por IP queda en el registro del programa qué navegador usa (vMix 23 = Chrome 77, vMix 29 = Chrome 103/115, ...)
    const stopHello = bridge.onConnect(() => bridge.diag(`overlay conectado · ${navigator.userAgent}`));
    const take = (next) => { if (next) { setState(normalizeState(next)); setReceived(true); } };
    bridge.load().then(take);
    const stop = bridge.subscribe(take);
    return () => { stop(); stopHello(); document.body.classList.remove('overlay-mode'); };
  }, []);

  // Sólo cuando cambia el resumen (no en cada cambio de estado ni en cada render), y no con el estado vacío de antes de cargar
  useEffect(() => { if (received) diagInfo(`configuración recibida · ${summary}`); }, [summary, received]);

  return (
    <div style={{ width: CANVAS.width, height: CANVAS.height, background: inElectron ? '#00FF00' : 'transparent', position: 'relative' }}>
      {inElectron && (
        <div className="overlay-bar">
          <button onClick={() => bridge.send('overlay-control', 'minimize')}>–</button>
          <button onClick={() => bridge.send('overlay-control', 'maximize')}>☐</button>
          <button onClick={() => bridge.send('overlay-control', 'close')} style={{ background: 'rgba(231,76,60,0.85)' }}>✕</button>
        </div>
      )}
      <Stage state={state} />
    </div>
  );
}
