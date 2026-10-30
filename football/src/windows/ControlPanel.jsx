import { useCallback, useEffect, useRef, useState } from 'react';
import Stage from '../graphics/Stage';
import LiveTab from './LiveTab';
import MatchTab from './MatchTab';
import TeamsTab from './TeamsTab';
import CustomizeTab from './CustomizeTab';
import { bridge, mode } from '../bridge';
import { normalizeState, CANVAS } from '../state';

const TABS = [
  { id: 'live', label: 'EN VIVO' },
  { id: 'match', label: 'PARTIDO' },
  { id: 'teams', label: 'EQUIPOS' },
  { id: 'custom', label: 'PERSONALIZAR' }
];

const PREVIEWS = [
  { id: 'live', label: 'Al aire' },
  { id: 'scorebug', label: 'Marcador' },
  { id: 'lineup-home', label: 'Alineación local' },
  { id: 'lineup-away', label: 'Alineación visitante' },
  { id: 'intro', label: 'Presentación' },
  { id: 'alert', label: 'Último evento' }
];

const PREVIEW_WIDTH = 620;
const SCALE = PREVIEW_WIDTH / CANVAS.width;

// Lo que muestra la vista previa: lo que está al aire, o una gráfica elegida aunque no esté al aire
function previewLive(state, id) {
  if (id === 'live') return state.live;
  const off = { scorebug: false, intro: false, lineup: { visible: false, side: 'home' }, alert: null };
  if (id === 'scorebug') return { ...off, scorebug: true };
  if (id === 'intro') return { ...off, intro: true };
  if (id === 'lineup-home') return { ...off, lineup: { visible: true, side: 'home' } };
  if (id === 'lineup-away') return { ...off, lineup: { visible: true, side: 'away' } };
  const last = state.match.events[state.match.events.length - 1];
  return { ...off, alert: last ? { ...last, shownAt: Date.now(), duration: 3600 } : null };
}

export default function ControlPanel() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState('live');
  const [previewId, setPreviewId] = useState('live');
  const latest = useRef(null);
  const pushTimer = useRef(null);

  useEffect(() => {
    bridge.load().then(saved => {
      const initial = normalizeState(saved);
      latest.current = initial;
      setState(initial);
    });
  }, []);

  // El panel es el dueño del estado: cada cambio se aplica acá y se manda entero al overlay (agrupando cambios seguidos)
  const update = useCallback((fn) => {
    const next = fn(latest.current);
    latest.current = next;
    setState(next);
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => bridge.push(latest.current), 60);
  }, []);

  if (!state) return <div className="loading">Cargando…</div>;

  const api = { state, update };
  return (
    <div className="app">
      <header className="topbar">
        <h1>Overlay Fútbol</h1>
        <nav className="tabs">
          {TABS.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </nav>
        <span className="mode" title={mode === 'local' ? 'Modo desarrollo: el overlay se abre en otra pestaña del navegador (#/overlay)' : 'Overlay conectado'}>
          {mode === 'electron' ? 'Overlay: ventana del programa · OBS/vMix: http://<IP de esta PC>:8080/#/overlay' : `Modo ${mode}`}
        </span>
      </header>

      <div className="body">
        <main className={`content ${tab === 'custom' ? 'flush' : ''}`}>
          {tab === 'live' && <LiveTab {...api} />}
          {tab === 'match' && <MatchTab {...api} />}
          {tab === 'teams' && <TeamsTab {...api} />}
          {tab === 'custom' && <CustomizeTab {...api} />}
        </main>

        {tab !== 'teams' && tab !== 'custom' && (
        <aside className="preview-col">
          <div className="preview-title">Vista previa</div>
          <div className="seg wrap">
            {PREVIEWS.map(p => <button key={p.id} className={`btn small ${previewId === p.id ? 'primary' : ''}`} onClick={() => setPreviewId(p.id)}>{p.label}</button>)}
          </div>
          <div className="preview-frame" style={{ width: PREVIEW_WIDTH, height: CANVAS.height * SCALE }}>
            <div style={{ width: CANVAS.width, height: CANVAS.height, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
              <Stage state={state} live={previewLive(state, previewId)} />
            </div>
          </div>
          <p className="hint">La vista previa no sale al aire: usá los botones de “Gráficas al aire” en la pestaña EN VIVO.</p>
        </aside>
        )}
      </div>
    </div>
  );
}
