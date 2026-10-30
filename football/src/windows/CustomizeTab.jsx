import { useEffect, useMemo, useRef, useState } from 'react';
import Stage from '../graphics/Stage';
import { Field } from './ui';
import { GRAPHICS, DEFAULT_LAYOUT, DEFAULT_STYLE, CANVAS, teamOfSide } from '../state';
import { FONT_OPTIONS, getLeague } from '../leagues';

// PERSONALIZAR: cada gráfica se arrastra con el mouse sobre una vista previa del lienzo completo (1920x1080),
// se escala, se hace más o menos transparente y se le cambia la tipografía y los colores. Todo se ve al instante en el overlay.
const SAFE_X = Math.round(CANVAS.width * 0.05);
const SAFE_Y = Math.round(CANVAS.height * 0.05);
// Líneas a las que "se pega" la gráfica al arrastrarla: bordes, centro y zona segura (5 %)
const SNAP_X = [0, SAFE_X, CANVAS.width / 2, CANVAS.width - SAFE_X, CANVAS.width];
const SNAP_Y = [0, SAFE_Y, CANVAS.height / 2, CANVAS.height - SAFE_Y, CANVAS.height];
const SNAP_THRESHOLD = 10;

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

export default function CustomizeTab({ state, update }) {
  const [selected, setSelected] = useState('scorebug');
  const [group, setGroup] = useState([]);       // gráficas sumadas con Ctrl + clic para verlas juntas
  const [scale, setScale] = useState(0.5);
  const [boxes, setBoxes] = useState({});       // {id: {x, y, w, h}} medidos de la gráfica real, en px del lienzo
  const [showGuides, setShowGuides] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [snapLines, setSnapLines] = useState({ x: [], y: [] });
  const [stamp] = useState(() => Date.now());

  const areaRef = useRef(null);
  const stageRef = useRef(null);
  const boxesRef = useRef({});
  const lastSig = useRef('');
  const drag = useRef(null);

  const shown = group.length ? group : [selected];
  const pos = state.layout[selected] || DEFAULT_LAYOUT[selected];
  const league = getLeague(state.match.league);

  // Qué mostrar en la vista previa: las gráficas elegidas, siempre en pantalla y sin transiciones
  const demoAlert = useMemo(() => {
    const team = teamOfSide(state, 'home');
    const player = team?.players.find(p => p.id === state.match.home.xi[9]) || team?.players[0];
    return { id: 'demo', kind: 'goal', side: 'home', playerId: player?.id || null, outId: null, minute: '67', ownGoal: false, shownAt: stamp, duration: 86400 };
  }, [state, stamp]);
  const live = {
    scorebug: shown.includes('scorebug'), intro: shown.includes('intro'),
    lineup: { visible: shown.includes('lineup'), side: 'home' },
    alert: shown.includes('alert') ? demoAlert : null
  };

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
  const patchStyle = (patch) => update(s => ({ ...s, style: { ...s.style, ...patch } }));

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

  const num = (v, fallback) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; };
  const resetAll = () => update(s => ({ ...s, layout: { ...DEFAULT_LAYOUT }, style: { ...DEFAULT_STYLE } }));
  const fontValue = FONT_OPTIONS.some(f => f.value === state.style.font) ? state.style.font : '';

  return (
    <div className="custom" onMouseMove={onMove} onMouseUp={endDrag} onMouseLeave={endDrag}>
      <aside className="custom-side">
        <h3>Gráfica</h3>
        <div className="custom-list">
          {GRAPHICS.map(g => (
            <button key={g.id} className={`btn small ${selected === g.id ? 'primary' : ''} ${group.includes(g.id) && selected !== g.id ? 'grouped' : ''}`} onClick={(e) => pick(e, g.id)}>{g.label}</button>
          ))}
        </div>
        <p className="hint">Ctrl + clic para ver varias juntas. Arrastrá la gráfica sobre la vista previa; con las flechas movés 1 px (Shift: 10 px). Alt desactiva el imán.</p>

        <h3>Posición y tamaño</h3>
        <div className="row">
          <Field label="X (px)"><input type="number" value={pos.x} onChange={e => patchLayout(selected, { x: Math.round(num(e.target.value, pos.x)) })} /></Field>
          <Field label="Y (px)"><input type="number" value={pos.y} onChange={e => patchLayout(selected, { y: Math.round(num(e.target.value, pos.y)) })} /></Field>
        </div>
        <Field label={`Escala: ${Math.round(pos.scale * 100)} %`}>
          <input type="range" min="0.3" max="2.5" step="0.05" value={pos.scale} onChange={e => patchLayout(selected, { scale: num(e.target.value, 1) })} />
        </Field>
        <Field label={`Opacidad: ${Math.round(pos.opacity * 100)} %`}>
          <input type="range" min="0.1" max="1" step="0.05" value={pos.opacity} onChange={e => patchLayout(selected, { opacity: num(e.target.value, 1) })} />
        </Field>
        <div className="seg" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => center('x')}>Centrar ↔</button>
          <button className="btn small" onClick={() => center('y')}>Centrar ↕</button>
          <button className="btn small" onClick={() => center('both')}>Centrar</button>
          <button className="btn small ghost" onClick={() => patchLayout(selected, DEFAULT_LAYOUT[selected])}>Restablecer</button>
        </div>

        <h3>Vista previa</h3>
        <label className="check"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Imán a los bordes, centro y zona segura</label>
        <label className="check"><input type="checkbox" checked={showGuides} onChange={e => setShowGuides(e.target.checked)} /> Mostrar zona segura y ejes</label>
        <label className="check"><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Mostrar cuadrícula</label>

        <h3>Estilo</h3>
        <Field label="Tipografía">
          <select value={fontValue} onChange={e => patchStyle({ font: e.target.value })}>
            <option value="">La de la liga ({league.name})</option>
            {FONT_OPTIONS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
          </select>
        </Field>
        <div className="row" style={{ marginTop: 10 }}>
          <Field label="Color principal">
            <div className="inline">
              <input type="color" value={state.style.accent || league.accent} onChange={e => patchStyle({ accent: e.target.value })} />
              {state.style.accent && <button className="btn small ghost" onClick={() => patchStyle({ accent: '' })}>Liga</button>}
            </div>
          </Field>
          <Field label="Color secundario">
            <div className="inline">
              <input type="color" value={state.style.accent2 || league.accent2} onChange={e => patchStyle({ accent2: e.target.value })} />
              {state.style.accent2 && <button className="btn small ghost" onClick={() => patchStyle({ accent2: '' })}>Liga</button>}
            </div>
          </Field>
        </div>
        <button className="btn small danger" style={{ marginTop: 18 }} onClick={resetAll}>Restablecer todo</button>
      </aside>

      <div className="custom-area" ref={areaRef}>
        <div style={{ width: CANVAS.width * scale, height: CANVAS.height * scale, flex: 'none' }}>
          <div
            ref={stageRef} tabIndex={0} onKeyDown={onKeyDown}
            className="custom-stage"
            style={{ width: CANVAS.width, height: CANVAS.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <Stage state={state} live={live} instant />

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

            {shown.map(id => boxes[id] && (
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
