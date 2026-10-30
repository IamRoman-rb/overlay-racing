import { useEffect, useState } from 'react';
import Stage from '../graphics/Stage';
import { bridge, inElectron } from '../bridge';
import { defaultState, normalizeState, CANVAS } from '../state';

// Ventana del overlay: lo único que hace es dibujar el estado que le manda el panel.
// Dentro del programa se pinta de verde (croma) para capturarla en vMix/OBS; abierta como navegador queda transparente.
export default function Overlay() {
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    document.body.classList.add('overlay-mode');
    bridge.load().then(saved => { if (saved) setState(normalizeState(saved)); });
    const stop = bridge.subscribe(next => { if (next) setState(normalizeState(next)); });
    return () => { stop(); document.body.classList.remove('overlay-mode'); };
  }, []);

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
