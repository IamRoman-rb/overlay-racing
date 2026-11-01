import { useCallback, useEffect, useRef, useState } from 'react';
import Stage from '../graphics/Stage';
import LiveTab from './LiveTab';
import MatchTab from './MatchTab';
import TeamsTab from './TeamsTab';
import CustomizeTab from './CustomizeTab';
import EditorTab from './EditorTab';
import { bridge, mode } from '../bridge';
import { useNow } from '../useNow';
import { normalizeState, CANVAS, PERIODS, clockText, teamOfSide, teamInfo } from '../state';

const TABS = [
  { id: 'live', label: 'EN VIVO' },
  { id: 'match', label: 'PARTIDO' },
  { id: 'teams', label: 'EQUIPOS' },
  { id: 'custom', label: 'PERSONALIZAR' },
  { id: 'editor', label: 'EDITOR' }
];
// Pestañas de pantalla completa (barra lateral + escenario propio): no llevan la columna de vista previa
const FULL_TABS = ['custom', 'editor'];

// Algo de lo que se ve en el overlay (para marcar la pestaña EN VIVO)
const anythingOnAir = (live, now) => !!(live.scorebug || live.intro || live.lineup?.visible || live.branding?.visible
  || (live.alert && now < live.alert.shownAt + live.alert.duration * 1000));

// Resumen del partido a la derecha de la cabecera (como la mejor vuelta / vueltas en Carrera). Se actualiza solo.
function HeaderInfo({ state }) {
  const now = useNow(1000);
  const { match } = state;
  const home = teamInfo(teamOfSide(state, 'home'), 'Local', 'LOC', '#c8102e');
  const away = teamInfo(teamOfSide(state, 'away'), 'Visitante', 'VIS', '#0b5ed7');
  const period = PERIODS.find(p => p.id === match.clock.period);
  const clock = clockText(match.clock, 'mmss', now);
  const onAir = anythingOnAir(state.live, now);
  return (
    <div className="topbar-info">
      <div className="stat" style={{ borderRight: '1px solid var(--line)', paddingRight: 20 }}>
        <div className="stat-label">MARCADOR</div>
        <div className="stat-value" style={{ color: 'var(--accent)' }}>
          {home.short} {match.score.home} <span style={{ color: 'var(--text)' }}>-</span> {match.score.away} {away.short}
        </div>
      </div>
      <div className="stat">
        <div className="stat-label">{period?.label || 'RELOJ'}</div>
        <div className="stat-value">{clock || '--:--'}{!match.clock.running && ['1T', '2T', 'PR1', 'PR2'].includes(match.clock.period) ? ' ❚❚' : ''}</div>
      </div>
      <div
        className={`mode-pill ${onAir ? 'on' : ''}`}
        title={mode === 'electron' ? 'OBS/vMix: http://<IP de esta PC>:8080/#/overlay' : mode === 'local' ? 'Modo desarrollo: el overlay se abre en otra pestaña del navegador (#/overlay)' : 'Overlay conectado'}
      >
        {onAir ? '● AL AIRE' : mode === 'local' ? 'MODO LOCAL' : 'FUERA DEL AIRE'}
      </div>
    </div>
  );
}

const PREVIEWS = [
  { id: 'live', label: 'Al aire' },
  { id: 'scorebug', label: 'Marcador' },
  { id: 'lineup-home', label: 'Alineación local' },
  { id: 'lineup-away', label: 'Alineación visitante' },
  { id: 'intro', label: 'Presentación' },
  { id: 'branding', label: 'Logos' },
  { id: 'alert', label: 'Último evento' }
];


// Lo que muestra la vista previa: lo que está al aire, o una gráfica elegida aunque no esté al aire
function previewLive(state, id) {
  if (id === 'live') return state.live;
  const off = { scorebug: false, intro: false, branding: { visible: false, mode: 'both' }, lineup: { visible: false, side: 'home' }, alert: null };
  if (id === 'scorebug') return { ...off, scorebug: true };
  if (id === 'intro') return { ...off, intro: true };
  if (id === 'branding') return { ...off, branding: { visible: true, mode: 'both' } };
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
  const full = FULL_TABS.includes(tab);
  // Con la vista previa arriba o abajo se achica para dejar lugar a los botones
  const layout = state.ui.panelLayout;
  const previewWidth = layout === 'top' || layout === 'bottom' ? 440 : 620;
  const scale = previewWidth / CANVAS.width;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <h1>OVERLAY FÚTBOL</h1>
        </div>
        <HeaderInfo state={state} />
        {window.require && <button onClick={() => window.require('electron').ipcRenderer.send('return-to-launcher')} className="btn tiny">Cambiar software</button>}
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'live' && anythingOnAir(state.live, Infinity) /* sin contar el evento, que se va solo */ &&<span className="tab-dot" />}
          </button>
        ))}
      </nav>

      <div className={`body layout-${full ? 'right' : layout}`}>
        <main className={`content ${full ? 'flush' : ''}`}>
          {tab === 'live' && <LiveTab {...api} />}
          {tab === 'match' && <MatchTab {...api} />}
          {tab === 'teams' && <TeamsTab {...api} />}
          {tab === 'custom' && <CustomizeTab {...api} />}
          {tab === 'editor' && <EditorTab {...api} />}
        </main>

        {tab !== 'teams' && !full && (
        <aside className="preview-col">
          <div className="preview-title">Vista previa</div>
          <div className="seg wrap">
            {PREVIEWS.map(p => <button key={p.id} className={`btn tiny ${previewId === p.id ? 'primary' : ''}`} onClick={() => setPreviewId(p.id)}>{p.label}</button>)}
          </div>
          <div className="preview-frame" style={{ width: previewWidth, height: CANVAS.height * scale }}>
            <div style={{ width: CANVAS.width, height: CANVAS.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
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
