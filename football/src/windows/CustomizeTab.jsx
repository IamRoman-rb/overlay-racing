import { useEffect, useMemo, useRef, useState } from 'react';
import Stage from '../graphics/Stage';
import { Field } from './ui';
import { GRAPHICS, DEFAULT_LAYOUT, ANIM_STYLES, COVER_OPTIONS, PANEL_LAYOUTS, CANVAS, teamOfSide } from '../state';
import { getLeague, COLOR_FIELDS } from '../leagues';
import { FONT_OPTIONS } from '../fonts';

// PERSONALIZAR: cada gráfica es independiente. Se arrastra con el mouse sobre una vista previa del lienzo completo (1920x1080)
// y tiene su propio tamaño (escala, ancho y alto), transición (con o sin logo), tipografía, colores, bordes y esquinas.
// Todo se ve al instante en el overlay.
const SAFE_X = Math.round(CANVAS.width * 0.05);
const SAFE_Y = Math.round(CANVAS.height * 0.05);
// Líneas a las que "se pega" la gráfica al arrastrarla: bordes, centro y zona segura (5 %)
const SNAP_X = [0, SAFE_X, CANVAS.width / 2, CANVAS.width - SAFE_X, CANVAS.width];
const SNAP_Y = [0, SAFE_Y, CANVAS.height / 2, CANVAS.height - SAFE_Y, CANVAS.height];
const SNAP_THRESHOLD = 10;

const PANEL_LAYOUT_LABELS = { right: 'Vista previa a la derecha', left: 'Vista previa a la izquierda', top: 'Vista previa arriba', bottom: 'Vista previa abajo' };

// Cuánto hay que correr la gráfica para que su borde o su centro caiga sobre una línea guía
function snapAxis(start, size, targets) {
  let best = null;
  [start, start + size / 2, start + size].forEach(candidate => {
    targets.forEach(target => {
      const delta = target - candidate;
      if (Math.abs(delta) <= SNAP_THRESHOLD && (best === null || Math.abs(delta) < Math.abs(best.delta))) best = { delta, target };
    });
  });
  return best;
}

// Primer color #rrggbb que aparezca en un valor de CSS (los fondos de la liga son degradés); para mostrarlo en el selector de color
function hexOf(value, fallback = '#808080') {
  const m = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(String(value || ''));
  if (!m) return fallback;
  const h = m[1];
  return `#${h.length === 3 ? h.split('').map(c => c + c).join('') : h}`.toLowerCase();
}

// Valor de la liga para cada color (lo que se ve si la gráfica no lo pisa)
function leagueDefault(league, key) {
  if (key === 'pitchA') return league.pitch.a;
  if (key === 'pitchB') return league.pitch.b;
  if (key === 'pitchLine') return league.pitch.line;
  if (key === 'borderColor') return league.accent;
  return league[key];
}

// Número que se confirma con Enter o al salir del campo (no en cada tecla: evita redimensionar a medio escribir)
function CommitNumber({ value, placeholder, onCommit, min = 0, step = 1, style }) {
  return (
    <input
      key={String(value)} type="number" min={min} step={step} defaultValue={value || ''} placeholder={placeholder} style={style}
      onBlur={(e) => { if (e.target.value !== String(value || '')) onCommit(e.target.value); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

function Section({ title, children, open = true }) {
  return (
    <details className="custom-section" open={open}>
      <summary>{title}</summary>
      <div className="custom-section-body">{children}</div>
    </details>
  );
}

export default function CustomizeTab({ state, update }) {
  const [selected, setSelected] = useState('scorebug');
  const [group, setGroup] = useState([]);       // gráficas sumadas con Ctrl + clic para verlas juntas
  const [scale, setScale] = useState(0.5);
  const [boxes, setBoxes] = useState({});       // {id: {x, y, w, h}} medidos de la gráfica real, en px del lienzo
  const [showGuides, setShowGuides] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [snapLines, setSnapLines] = useState({ x: [], y: [] });
  const [test, setTest] = useState(null);       // prueba de transición: { id, hidden }
  const [stamp] = useState(() => Date.now());

  const areaRef = useRef(null);
  const stageRef = useRef(null);
  const boxesRef = useRef({});
  const lastSig = useRef('');
  const drag = useRef(null);
  const testTimers = useRef([]);

  const shown = group.length ? group : [selected];
  const pos = state.layout[selected] || DEFAULT_LAYOUT[selected];
  const look = state.look[selected] || {};
  const league = getLeague(state.match.league);

  // Qué mostrar en la vista previa: las gráficas elegidas, siempre en pantalla y sin transiciones
  const demoAlert = useMemo(() => {
    const team = teamOfSide(state, 'home');
    const player = team?.players.find(p => p.id === state.match.home.xi[9]) || team?.players[0];
    return { id: 'demo', kind: 'goal', side: 'home', playerId: player?.id || null, outId: null, minute: '67', ownGoal: false, shownAt: stamp, duration: 86400 };
  }, [state, stamp]);
  const on = (id) => shown.includes(id) && !(test && test.hidden && test.id === id);
  const live = {
    scorebug: on('scorebug'), intro: on('intro'),
    lineup: { visible: on('lineup'), side: 'home' },
    branding: { visible: on('branding'), mode: 'both' },
    alert: on('alert') ? demoAlert : null
  };

  useEffect(() => () => testTimers.current.forEach(clearTimeout), []);

  // La escala de la vista previa se ajusta al espacio disponible
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const s = Math.min((el.clientWidth - 32) / CANVAS.width, (el.clientHeight - 32) / CANVAS.height);
      setScale(Math.max(0.2, Math.min(1, s)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mide cada gráfica real en cada cuadro para poner el recuadro de arrastre exactamente encima
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const stage = stageRef.current;
      if (!stage) return;
      const sr = stage.getBoundingClientRect();
      if (!sr.width) return;
      const k = sr.width / CANVAS.width;
      const next = {};
      stage.querySelectorAll('[data-gid]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          next[el.dataset.gid] = { x: Math.round((r.left - sr.left) / k), y: Math.round((r.top - sr.top) / k), w: Math.round(r.width / k), h: Math.round(r.height / k) };
        }
      });
      const sig = JSON.stringify(next);
      if (sig !== lastSig.current) { lastSig.current = sig; boxesRef.current = next; setBoxes(next); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const patchLayout = (id, patch) => update(s => ({ ...s, layout: { ...s.layout, [id]: { ...(s.layout[id] || DEFAULT_LAYOUT[id]), ...patch } } }));
  // Estilo propio: un valor vacío vuelve al de la liga (se borra la clave)
  const patchLook = (id, patch) => update(s => {
    const next = { ...(s.look[id] || {}) };
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v === null || v === undefined) delete next[k]; else next[k] = v; });
    return { ...s, look: { ...s.look, [id]: next } };
  });
  const num = (v, fallback) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; };

  // Clic normal: una sola gráfica. Ctrl + clic: suma (o quita) gráficas para verlas todas juntas.
  const pick = (e, id) => {
    if (!(e.ctrlKey || e.metaKey)) { setGroup([]); setSelected(id); return; }
    const current = group.length ? group : [selected];
    if (!current.includes(id)) { setGroup([...current, id]); setSelected(id); return; }
    if (id !== selected) { setSelected(id); return; }
    const rest = current.filter(g => g !== id);
    if (!rest.length) return;
    setGroup(rest.length > 1 ? rest : []);
    setSelected(rest[rest.length - 1]);
  };

  // ---------- Arrastrar ----------
  const startDrag = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(id);
    const p = state.layout[id] || DEFAULT_LAYOUT[id];
    const b = boxesRef.current[id];
    drag.current = { id, startX: e.clientX, startY: e.clientY, x: p.x, y: p.y, offX: b ? b.x - p.x : 0, offY: b ? b.y - p.y : 0, w: b ? b.w : 0, h: b ? b.h : 0 };
    if (stageRef.current) stageRef.current.focus();
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d || !stageRef.current) return;
    const k = stageRef.current.getBoundingClientRect().width / CANVAS.width;
    let x = Math.round(d.x + (e.clientX - d.startX) / k);
    let y = Math.round(d.y + (e.clientY - d.startY) / k);
    const lines = { x: [], y: [] };
    // Imán a las guías (se desactiva manteniendo Alt)
    if (snap && !e.altKey && d.w > 0) {
      const sx = snapAxis(x + d.offX, d.w, SNAP_X);
      if (sx) { x += sx.delta; lines.x.push(sx.target); }
      const sy = snapAxis(y + d.offY, d.h, SNAP_Y);
      if (sy) { y += sy.delta; lines.y.push(sy.target); }
    }
    setSnapLines(prev => (JSON.stringify(prev) === JSON.stringify(lines) ? prev : lines));
    patchLayout(d.id, { x: Math.round(x), y: Math.round(y) });
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    setSnapLines({ x: [], y: [] });
  };

  // Ajuste fino con el teclado: flechas = 1 px, Shift + flechas = 10 px
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 1;
    const deltas = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    patchLayout(selected, { x: pos.x + d[0], y: pos.y + d[1] });
  };

  // Centra la gráfica seleccionada en el lienzo usando su tamaño real medido
  const center = (axis) => {
    const b = boxes[selected];
    if (!b) return;
    const patch = {};
    if (axis !== 'y') patch.x = Math.round(pos.x + (CANVAS.width / 2 - (b.x + b.w / 2)));
    if (axis !== 'x') patch.y = Math.round(pos.y + (CANVAS.height / 2 - (b.y + b.h / 2)));
    patchLayout(selected, patch);
  };

  // ---------- Prueba de transición ----------
  // La gráfica se oculta, y se vuelve a mostrar con su transición (y su tapado con logo, si lo tiene)
  const runTest = () => {
    testTimers.current.forEach(clearTimeout);
    const id = selected;
    const out = Math.max(400, pos.animMs + 150);
    const total = out + pos.animMs + (pos.cover !== 'none' ? pos.coverMs : 0) + 600;
    setTest({ id, hidden: true });
    testTimers.current = [setTimeout(() => setTest({ id, hidden: false }), out), setTimeout(() => setTest(null), total)];
  };

  const copyLookToAll = () => update(s => {
    const next = { ...s.look };
    GRAPHICS.forEach(g => { next[g.id] = { ...(s.look[selected] || {}) }; });
    return { ...s, look: next };
  });
  const resetSelected = () => update(s => ({
    ...s, layout: { ...s.layout, [selected]: { ...DEFAULT_LAYOUT[selected] } }, look: { ...s.look, [selected]: {} }
  }));
  const resetAll = () => update(s => ({ ...s, layout: { ...DEFAULT_LAYOUT }, look: Object.fromEntries(GRAPHICS.map(g => [g.id, {}])) }));

  const fontValue = FONT_OPTIONS.some(f => f.value === look.font) ? look.font : '';
  const colorFields = COLOR_FIELDS.filter(f => f.group === 'base' || f.group === selected);
  const box = boxes[selected];
  const hasRadius = look.radius !== undefined && look.radius !== '';

  const renderColor = (field) => {
    const current = look[field.key];
    const def = leagueDefault(league, field.key);
    return (
      <div className="color-row" key={field.key}>
        <span>{field.label}</span>
        <input type="color" value={hexOf(current || def, field.key.endsWith('Bg') || field.key === 'bg' ? '#222222' : '#808080')} onChange={e => patchLook(selected, { [field.key]: e.target.value })} />
        <button className="btn small ghost" disabled={!current} title="Volver al color de la liga" onClick={() => patchLook(selected, { [field.key]: '' })}>Liga</button>
      </div>
    );
  };

  return (
    <div className="custom" onMouseMove={onMove} onMouseUp={endDrag} onMouseLeave={endDrag}>
      <aside className="custom-side">
        <h3>Gráfica</h3>
        <div className="custom-list">
          {GRAPHICS.map(g => (
            <button key={g.id} className={`btn small ${selected === g.id ? 'primary' : ''} ${group.includes(g.id) && selected !== g.id ? 'grouped' : ''}`} onClick={(e) => pick(e, g.id)}>{g.label}</button>
          ))}
        </div>
        <p className="hint">Cada gráfica es independiente: lo que cambies acá sólo afecta a la seleccionada. Ctrl + clic para ver varias juntas. Arrastrala sobre la vista previa; con las flechas movés 1 px (Shift: 10 px). Alt desactiva el imán.</p>

        <Section title="Posición y tamaño">
          <div className="row">
            <Field label="X (px)"><input type="number" value={pos.x} onChange={e => patchLayout(selected, { x: Math.round(num(e.target.value, pos.x)) })} /></Field>
            <Field label="Y (px)"><input type="number" value={pos.y} onChange={e => patchLayout(selected, { y: Math.round(num(e.target.value, pos.y)) })} /></Field>
          </div>
          <Field label={`Escala: ${Math.round(pos.scale * 100)} %`}>
            <input type="range" min="0.3" max="2.5" step="0.05" value={pos.scale} onChange={e => patchLayout(selected, { scale: num(e.target.value, 1) })} />
          </Field>
          <div className="row" style={{ marginTop: 10 }}>
            <Field label="Ancho (px)"><CommitNumber value={pos.w} min={1} placeholder="auto" onCommit={v => patchLayout(selected, { w: Math.max(0, Math.round(num(v, 0))) })} /></Field>
            <Field label="Alto (px)"><CommitNumber value={pos.h} min={1} placeholder="auto" onCommit={v => patchLayout(selected, { h: Math.max(0, Math.round(num(v, 0))) })} /></Field>
          </div>
          <p className="hint">Vacío = tamaño original{box ? ` (ahora ${Math.round(box.w / pos.scale)} × ${Math.round(box.h / pos.scale)} px sin escala)` : ''}. Se confirma con Enter.</p>
          <Field label={`Opacidad: ${Math.round(pos.opacity * 100)} %`}>
            <input type="range" min="0.1" max="1" step="0.05" value={pos.opacity} onChange={e => patchLayout(selected, { opacity: num(e.target.value, 1) })} />
          </Field>
          <div className="seg" style={{ marginTop: 12 }}>
            <button className="btn small" onClick={() => center('x')}>Centrar ↔</button>
            <button className="btn small" onClick={() => center('y')}>Centrar ↕</button>
            <button className="btn small" onClick={() => center('both')}>Centrar</button>
            <button className="btn small ghost" onClick={() => patchLayout(selected, { x: DEFAULT_LAYOUT[selected].x, y: DEFAULT_LAYOUT[selected].y, scale: 1, opacity: 1, w: 0, h: 0 })}>Restablecer</button>
          </div>
        </Section>

        <Section title="Transición">
          <Field label="Efecto">
            <select value={pos.anim} onChange={e => patchLayout(selected, { anim: e.target.value })}>
              {ANIM_STYLES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </Field>
          <div className="row" style={{ marginTop: 10 }}>
            <Field label="Duración (seg)"><CommitNumber value={pos.animMs / 1000} min={0} step={0.1} onCommit={v => patchLayout(selected, { animMs: Math.round(Math.min(10, Math.max(0, num(v, 0.45))) * 1000) })} /></Field>
          </div>
          <Field label="Tapado con logo al aparecer">
            <select value={pos.cover} onChange={e => patchLayout(selected, { cover: e.target.value })}>
              {COVER_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          {pos.cover !== 'none' && (
            <div className="row" style={{ marginTop: 10 }}>
              <Field label="Tiempo del tapado (seg)"><CommitNumber value={pos.coverMs / 1000} min={0.3} step={0.1} onCommit={v => patchLayout(selected, { coverMs: Math.round(Math.min(10, Math.max(0.3, num(v, 1.4))) * 1000) })} /></Field>
            </div>
          )}
          <p className="hint">El tapado cubre la gráfica con el logo (sobre un fondo con sus colores) y luego descubre los datos. Los logos se cargan en PARTIDO.</p>
          <button className="btn small primary" onClick={runTest} disabled={!!test}>▶ Probar transición</button>
        </Section>

        <Section title="Tipografía">
          <Field label="Fuente de esta gráfica">
            <select value={fontValue} onChange={e => patchLook(selected, { font: e.target.value })}>
              <option value="">La de la liga ({league.name})</option>
              {FONT_OPTIONS.map(f => <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Colores">
          {colorFields.map(renderColor)}
        </Section>

        <Section title="Bordes y esquinas">
          <Field label={`Grosor del borde: ${look.borderWidth || 0} px`}>
            <input type="range" min="0" max="12" step="1" value={look.borderWidth || 0} onChange={e => patchLook(selected, { borderWidth: num(e.target.value, 0) || '' })} />
          </Field>
          <Field label={hasRadius ? `Esquinas: ${look.radius} px` : 'Esquinas: las de la liga'}>
            <input type="range" min="0" max="60" step="1" value={hasRadius ? look.radius : 12} onChange={e => patchLook(selected, { radius: num(e.target.value, 0) })} />
          </Field>
          <div className="seg" style={{ marginTop: 10 }}>
            <button className="btn small" onClick={() => patchLook(selected, { radius: 0 })}>Rectas</button>
            <button className="btn small" onClick={() => patchLook(selected, { radius: 60 })}>Muy redondeadas</button>
            <button className="btn small ghost" disabled={!hasRadius} onClick={() => patchLook(selected, { radius: '' })}>Liga</button>
          </div>
        </Section>

        <div className="seg" style={{ marginTop: 16 }}>
          <button className="btn small" onClick={copyLookToAll}>Copiar este estilo a todas</button>
          <button className="btn small ghost" onClick={resetSelected}>Restablecer esta gráfica</button>
        </div>

        <h3>Vista previa</h3>
        <label className="check"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Imán a los bordes, centro y zona segura</label>
        <label className="check"><input type="checkbox" checked={showGuides} onChange={e => setShowGuides(e.target.checked)} /> Mostrar zona segura y ejes</label>
        <label className="check"><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Mostrar cuadrícula</label>

        <h3>Distribución del panel</h3>
        <p className="hint">Dónde queda la vista previa respecto de los botones en las pestañas EN VIVO y PARTIDO.</p>
        <div className="layout-grid">
          {PANEL_LAYOUTS.map(id => (
            <button key={id} className={`layout-btn ${state.ui.panelLayout === id ? 'active' : ''}`} onClick={() => update(s => ({ ...s, ui: { ...s.ui, panelLayout: id } }))}>
              <span className={`layout-diagram ${id}`}><i /><i /></span>
              <small>{PANEL_LAYOUT_LABELS[id]}</small>
            </button>
          ))}
        </div>

        <button className="btn small danger" style={{ marginTop: 18 }} onClick={resetAll}>Restablecer todas las gráficas</button>
      </aside>

      <div className="custom-area" ref={areaRef}>
        <div style={{ width: CANVAS.width * scale, height: CANVAS.height * scale, flex: 'none' }}>
          <div
            ref={stageRef} tabIndex={0} onKeyDown={onKeyDown}
            className="custom-stage"
            style={{ width: CANVAS.width, height: CANVAS.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <Stage state={state} live={live} instant instantExcept={test ? test.id : undefined} />

            {showGrid && <div className="stage-layer" style={{ inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />}
            {showGuides && (
              <>
                <div className="stage-layer" style={{ left: SAFE_X, top: SAFE_Y, right: SAFE_X, bottom: SAFE_Y, border: '2px dashed rgba(255, 204, 0, 0.6)' }} />
                <div className="stage-layer" style={{ left: CANVAS.width / 2 - 1, width: 2, top: 0, bottom: 0, background: 'rgba(0, 200, 255, 0.4)' }} />
                <div className="stage-layer" style={{ top: CANVAS.height / 2 - 1, height: 2, left: 0, right: 0, background: 'rgba(0, 200, 255, 0.4)' }} />
              </>
            )}
            {snapLines.x.map(x => <div key={`x${x}`} className="stage-layer" style={{ left: x - 1, width: 3, top: 0, bottom: 0, background: '#ff3b6b' }} />)}
            {snapLines.y.map(y => <div key={`y${y}`} className="stage-layer" style={{ top: y - 1, height: 3, left: 0, right: 0, background: '#ff3b6b' }} />)}

            {!test && shown.map(id => boxes[id] && (
              <div
                key={id} data-hit={id} onMouseDown={(e) => startDrag(e, id)}
                className={`hit ${id === selected ? 'selected' : ''}`}
                style={{ left: boxes[id].x, top: boxes[id].y, width: boxes[id].w, height: boxes[id].h }}
              >
                {id === selected && <span className="hit-label">{GRAPHICS.find(g => g.id === id)?.label} · X {pos.x}  Y {pos.y}  ·  {boxes[id].w} × {boxes[id].h}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
