import { useEffect, useRef, useState } from 'react';
import Stage from '../graphics/Stage';
import { GRAPHICS, DEFAULT_LAYOUT, ANIM_STYLES, PANEL_LAYOUTS, CANVAS, demoLive } from '../state';
import { getLeague, COLOR_FIELDS } from '../leagues';
import { FONT_OPTIONS } from '../fonts';
import { fileToDataURL } from '../utils/images';

// PERSONALIZAR (misma distribución que en Carrera): a la izquierda se elige la gráfica y se ajusta su estilo; a la derecha
// se arrastra con el mouse sobre el lienzo completo (1920x1080). Cada gráfica es independiente: tiene su propia posición,
// tamaño, transición (con o sin logo), tipografía, colores, bordes y esquinas. Todo se ve al instante en el overlay.
const SAFE_X = Math.round(CANVAS.width * 0.05);
const SAFE_Y = Math.round(CANVAS.height * 0.05);
// Líneas a las que "se pega" la gráfica al arrastrarla: bordes, centro y zona segura (5 %)
const SNAP_X = [0, SAFE_X, CANVAS.width / 2, CANVAS.width - SAFE_X, CANVAS.width];
const SNAP_Y = [0, SAFE_Y, CANVAS.height / 2, CANVAS.height - SAFE_Y, CANVAS.height];
const SNAP_THRESHOLD = 10;

const PANEL_LAYOUT_LABELS = { right: 'Vista previa a la derecha', left: 'Vista previa a la izquierda', top: 'Vista previa arriba', bottom: 'Vista previa abajo' };
const RADIUS_OPTIONS = [[0, 'Rectas (0 px)'], [8, 'Suaves (8 px)'], [16, 'Redondeadas (16 px)'], [30, 'Muy redondeadas (30 px)'], [60, 'Píldora (60 px)']];

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

// Logo con su miniatura y los botones CARGAR / QUITAR (como "Logos" en Carrera)
function LogoSlot({ label, value, onChange }) {
  const input = useRef(null);
  const [error, setError] = useState('');
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setError(''); onChange(await fileToDataURL(file, 320)); } catch (err) { setError(err.message); }
  };
  return (
    <div className="box-col">
      <span className="small-label" style={{ fontSize: 10 }}>{label}</span>
      <div className="media-thumb">{value ? <img src={value} alt="" /> : <span>VACÍO</span>}</div>
      <button className="btn tiny" onClick={() => input.current.click()}>⬆ Cargar</button>
      {value && <button className="btn tiny danger" onClick={() => onChange(null)}>✕ Quitar</button>}
      {error && <span className="err">{error}</span>}
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}

export default function CustomizeTab({ state, update }) {
  const [selected, setSelected] = useState('scorebug');
  const [group, setGroup] = useState([]);       // gráficas sumadas con Ctrl + clic para verlas juntas
  const [scale, setScale] = useState(0.42);
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
  const label = GRAPHICS.find(g => g.id === selected)?.label || '';

  // Qué mostrar en la vista previa: las gráficas elegidas, siempre en pantalla y sin transiciones (salvo la que se prueba)
  const live = demoLive(state, shown.filter(id => !(test && test.hidden && test.id === id)), stamp);

  useEffect(() => () => testTimers.current.forEach(clearTimeout), []);

  // La escala de la vista previa se ajusta al espacio disponible
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const s = Math.min((el.clientWidth - 48) / CANVAS.width, (el.clientHeight - 48) / CANVAS.height);
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
    if (stageRef.current) stageRef.current.parentElement.focus();
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

  // ---------- Tapado con logo: dos casillas (liga / productora) que se guardan como 'none' | 'league' | 'producer' | 'both' ----------
  const coverLeague = pos.cover === 'league' || pos.cover === 'both';
  const coverProducer = pos.cover === 'producer' || pos.cover === 'both';
  const setCover = (leagueOn, producerOn) => patchLayout(selected, { cover: leagueOn && producerOn ? 'both' : leagueOn ? 'league' : producerOn ? 'producer' : 'none' });
  const applyCoverToAll = () => update(s => ({
    ...s,
    layout: Object.fromEntries(GRAPHICS.map(g => [g.id, { ...(s.layout[g.id] || DEFAULT_LAYOUT[g.id]), cover: pos.cover, coverMs: pos.coverMs }]))
  }));
  const leagueLogo = state.match.competitionLogo;
  const producerLogo = state.brand.producerLogo;

  const copyLookToAll = () => update(s => {
    const next = { ...s.look };
    GRAPHICS.forEach(g => { next[g.id] = { ...(s.look[selected] || {}) }; });
    return { ...s, look: next };
  });
  const resetPosition = () => patchLayout(selected, { x: DEFAULT_LAYOUT[selected].x, y: DEFAULT_LAYOUT[selected].y, scale: 1, opacity: 1, w: 0, h: 0 });
  const resetSelected = () => update(s => ({
    ...s, layout: { ...s.layout, [selected]: { ...DEFAULT_LAYOUT[selected] } }, look: { ...s.look, [selected]: {} }
  }));
  const resetAll = () => update(s => ({ ...s, layout: { ...DEFAULT_LAYOUT }, look: Object.fromEntries(GRAPHICS.map(g => [g.id, {}])) }));

  const fontValue = FONT_OPTIONS.some(f => f.value === look.font) ? look.font : '';
  const colorFields = COLOR_FIELDS.filter(f => f.group === 'base' || f.group === selected);
  const box = boxes[selected];
  const hasRadius = look.radius !== undefined && look.radius !== '';
  const radiusIsPreset = hasRadius && RADIUS_OPTIONS.some(([v]) => v === Number(look.radius));

  return (
    <div className="studio" onMouseMove={onMove} onMouseUp={endDrag} onMouseLeave={endDrag}>
      <aside className="studio-side">
        <h3>SELECCIONAR GRÁFICA</h3>
        <div className="gfx-grid">
          {GRAPHICS.map(g => (
            <button key={g.id} className={`btn ${selected === g.id ? 'primary' : ''} ${group.includes(g.id) && selected !== g.id ? 'grouped' : ''}`} onClick={(e) => pick(e, g.id)}>{g.label}</button>
          ))}
        </div>
        <p className="desc">Ctrl + clic para sumar varias gráficas y verlas juntas en la vista previa. Lo que cambies abajo afecta sólo a la seleccionada (la amarilla).</p>

        <h3 className="tight">DISTRIBUCIÓN DEL PANEL</h3>
        <p className="desc">Dónde queda la vista previa respecto de los botones en las pestañas EN VIVO y PARTIDO.</p>
        <div className="layout-grid">
          {PANEL_LAYOUTS.map(id => (
            <button key={id} className={`btn ${state.ui.panelLayout === id ? 'primary' : ''}`} onClick={() => update(s => ({ ...s, ui: { ...s.ui, panelLayout: id } }))}>
              <span className={`layout-diagram ${id}`}><i /><i /></span>
              <span>{PANEL_LAYOUT_LABELS[id]}</span>
            </button>
          ))}
        </div>

        <h3>COLORES DE {label.toUpperCase()}</h3>
        <div className="box box-grid tight" style={{ marginBottom: 8 }}>
          {colorFields.map(field => {
            const current = look[field.key];
            const value = hexOf(current || leagueDefault(league, field.key), field.key.endsWith('Bg') || field.key === 'bg' ? '#222222' : '#808080');
            return (
              <div className="color-cell" key={field.key}>
                <span>{field.label}</span>
                <div className="color-swatch">
                  <input type="color" value={value} onChange={e => patchLook(selected, { [field.key]: e.target.value })} />
                  <code>{current ? value : 'LIGA'}</code>
                  <button disabled={!current} title="Volver al color de la liga" onClick={() => patchLook(selected, { [field.key]: '' })}>↺</button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="desc gap">“LIGA” = usa el color del estilo de {league.name}. ↺ lo vuelve al de la liga.</p>

        <h3>TEXTO Y TIPOGRAFÍA</h3>
        <div className="box-col gap">
          <label className="small-label">FUENTE DE ESTA GRÁFICA</label>
          <select value={fontValue} onChange={e => patchLook(selected, { font: e.target.value })}>
            <option value="">La de la liga ({league.name})</option>
            {FONT_OPTIONS.map(f => <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
          </select>
        </div>

        <h3>ESTILO DE {label.toUpperCase()}</h3>
        <div className="box box-grid gap">
          <div className="box-col">
            <label className="small-label">ESQUINAS</label>
            <select value={hasRadius ? String(look.radius) : ''} onChange={e => patchLook(selected, { radius: e.target.value === '' ? '' : Number(e.target.value) })}>
              <option value="">Las de la liga</option>
              {RADIUS_OPTIONS.map(([v, text]) => <option key={v} value={String(v)}>{text}</option>)}
              {hasRadius && !radiusIsPreset && <option value={String(look.radius)}>{look.radius} px</option>}
            </select>
          </div>
          <div className="box-col">
            <label className="small-label">ANIMACIÓN</label>
            <select value={pos.anim} onChange={e => patchLayout(selected, { anim: e.target.value })}>
              {ANIM_STYLES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div className="box-col">
            <label className="small-label">ANCHO (PX)</label>
            <CommitNumber value={pos.w} min={1} placeholder="Auto" onCommit={v => patchLayout(selected, { w: Math.max(0, Math.round(num(v, 0))) })} />
          </div>
          <div className="box-col">
            <label className="small-label">ALTO (PX)</label>
            <CommitNumber value={pos.h} min={1} placeholder="Auto" onCommit={v => patchLayout(selected, { h: Math.max(0, Math.round(num(v, 0))) })} />
          </div>
          <span className="full desc" style={{ margin: 0 }}>Vacío = tamaño original{box ? ` (ahora ${Math.round(box.w / pos.scale)} × ${Math.round(box.h / pos.scale)} px sin escala)` : ''}. Se confirma con Enter.</span>
          <div className="box-col">
            <label className="small-label">GROSOR DEL BORDE (PX)</label>
            <CommitNumber value={look.borderWidth} min={0} placeholder="0" onCommit={v => patchLook(selected, { borderWidth: Math.min(40, Math.max(0, Math.round(num(v, 0)))) || '' })} />
          </div>
          <div className="box-col">
            <label className="small-label">OPACIDAD (%)</label>
            <CommitNumber value={Math.round(pos.opacity * 100)} min={10} placeholder="100" onCommit={v => patchLayout(selected, { opacity: Math.min(1, Math.max(0.1, num(v, 100) / 100)) })} />
          </div>
          <div className="box-col">
            <label className="small-label">DURACIÓN (SEG)</label>
            <CommitNumber value={pos.animMs / 1000} min={0} step={0.1} placeholder="0.45" onCommit={v => patchLayout(selected, { animMs: Math.round(Math.min(10, Math.max(0, num(v, 0.45))) * 1000) })} />
          </div>

          {/* Transición con logo: la gráfica aparece tapada por el logo (con sus colores) y después se descubren los datos */}
          <div className="box-sep">
            <label className="small-label">TRANSICIÓN CON LOGO</label>
            <div className="cover-checks">
              <label className={leagueLogo ? '' : 'off'}>
                <input type="checkbox" disabled={!leagueLogo} checked={coverLeague} onChange={e => setCover(e.target.checked, coverProducer)} /> Logo de la liga
              </label>
              <label className={producerLogo ? '' : 'off'}>
                <input type="checkbox" disabled={!producerLogo} checked={coverProducer} onChange={e => setCover(coverLeague, e.target.checked)} /> Logo de la productora
              </label>
            </div>
            <div className="inline-row">
              <label className="small-label">TIEMPO (SEG)</label>
              <CommitNumber value={pos.coverMs / 1000} min={0.3} step={0.1} placeholder="1.4" onCommit={v => patchLayout(selected, { coverMs: Math.round(Math.min(10, Math.max(0.3, num(v, 1.4))) * 1000) })} />
              <button className="btn tiny" onClick={runTest} disabled={!!test}>▶ Probar transición</button>
              <button className="btn tiny" onClick={applyCoverToAll}>Aplicar a todas</button>
            </div>
            <span className="desc" style={{ margin: 0 }}>
              {leagueLogo || producerLogo
                ? 'El tapado cubre la gráfica con el logo (sobre un fondo con sus colores) y luego descubre los datos.'
                : 'Cargá el logo de la liga o de la productora (abajo, en LOGOS) para poder usar el tapado.'}
            </span>
          </div>
        </div>

        <h3>COORDENADAS</h3>
        <div className="box-col gap" style={{ gap: 15 }}>
          <div className="box-grid cols-3">
            <div><label className="small-label">EJE X</label><input type="number" value={pos.x} onChange={e => patchLayout(selected, { x: Math.round(num(e.target.value, pos.x)) })} /></div>
            <div><label className="small-label">EJE Y</label><input type="number" value={pos.y} onChange={e => patchLayout(selected, { y: Math.round(num(e.target.value, pos.y)) })} /></div>
            <div><label className="small-label">ESCALA</label><input type="number" step="0.05" min="0.3" max="2.5" value={pos.scale} onChange={e => patchLayout(selected, { scale: Math.min(2.5, Math.max(0.3, num(e.target.value, 1))) })} /></div>
          </div>
          <button className="btn danger block" onClick={resetPosition}>↺ Restablecer posición</button>
        </div>

        <h3>LOGOS</h3>
        <div className="media-grid">
          <LogoSlot label="LOGO DE LA LIGA" value={leagueLogo} onChange={competitionLogo => update(s => ({ ...s, match: { ...s.match, competitionLogo } }))} />
          <LogoSlot label="LOGO DE LA PRODUCTORA" value={producerLogo} onChange={logo => update(s => ({ ...s, brand: { ...s.brand, producerLogo: logo } }))} />
        </div>

        <div className="box-grid tight">
          <button className="btn small" onClick={copyLookToAll}>Copiar este estilo a todas</button>
          <button className="btn small" onClick={resetSelected}>↺ Restablecer esta gráfica</button>
          <button className="btn small danger full" onClick={resetAll}>↺ Restablecer todas las gráficas</button>
        </div>
      </aside>

      <div className="studio-main">
        {/* BARRA DE HERRAMIENTAS: ejes, cuadrícula, imán y centrado */}
        <div className="studio-toolbar">
          {[
            { key: 'guides', label: 'Ejes y zona segura', checked: showGuides, set: setShowGuides },
            { key: 'grid', label: 'Cuadrícula', checked: showGrid, set: setShowGrid },
            { key: 'snap', label: 'Imán a los ejes', checked: snap, set: setSnap }
          ].map(opt => (
            <label key={opt.key}><input type="checkbox" checked={opt.checked} onChange={e => opt.set(e.target.checked)} />{opt.label}</label>
          ))}
          <span className="spacer" />
          <button className="btn" onClick={() => center('x')}>↔ Centrar horizontal</button>
          <button className="btn" onClick={() => center('y')}>↕ Centrar vertical</button>
          <button className="btn" onClick={() => center('both')}>✛ Centrar</button>
        </div>

        <div className="studio-area" ref={areaRef}>
          <div className="studio-frame" tabIndex={0} onKeyDown={onKeyDown} style={{ width: CANVAS.width * scale, height: CANVAS.height * scale }}>
            <div ref={stageRef} className="studio-stage" style={{ width: CANVAS.width, height: CANVAS.height, transform: `scale(${scale})` }}>
              {showGrid && (
                <div className="stage-layer" style={{
                  inset: 0,
                  backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.22) 2px, transparent 2px), linear-gradient(to bottom, rgba(255,255,255,0.22) 2px, transparent 2px)',
                  backgroundSize: '100px 100px'
                }} />
              )}

              <Stage state={state} live={live} instant instantExcept={test ? test.id : undefined} />

              {showGuides && (
                <>
                  <div className="stage-layer" style={{ left: CANVAS.width / 2 - 1, width: 2, top: 0, bottom: 0, background: 'rgba(0, 229, 255, 0.75)', zIndex: 900 }} />
                  <div className="stage-layer" style={{ top: CANVAS.height / 2 - 1, height: 2, left: 0, right: 0, background: 'rgba(0, 229, 255, 0.75)', zIndex: 900 }} />
                  <div className="stage-layer" style={{ left: SAFE_X, top: SAFE_Y, right: SAFE_X, bottom: SAFE_Y, border: '2px dashed rgba(255,255,255,0.45)', zIndex: 900 }} />
                </>
              )}
              {snapLines.x.map(x => <div key={`x${x}`} className="stage-layer" style={{ left: x - 2, width: 4, top: 0, bottom: 0, background: '#ff2bd6', zIndex: 950 }} />)}
              {snapLines.y.map(y => <div key={`y${y}`} className="stage-layer" style={{ top: y - 2, height: 4, left: 0, right: 0, background: '#ff2bd6', zIndex: 950 }} />)}

              {/* RECUADROS DE SELECCIÓN: se posicionan sobre cada gráfica y sirven para arrastrarla */}
              {!test && shown.map(id => boxes[id] && (
                <div
                  key={id} onMouseDown={(e) => startDrag(e, id)}
                  className={`hit ${id === selected ? 'selected' : ''}`}
                  style={{ left: boxes[id].x, top: boxes[id].y, width: boxes[id].w, height: boxes[id].h, zIndex: id === selected ? 1000 : 960 }}
                >
                  {id === selected && <span className="hit-label">X {pos.x}  Y {pos.y}  ·  {boxes[id].w} × {boxes[id].h}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="studio-foot">
          Hacé clic en la vista y usá las flechas para mover 1 px (Shift + flechas: 10 px). Al arrastrar, mantené Alt para desactivar el imán. Línea celeste = centro, línea punteada = zona segura.
        </div>
      </div>
    </div>
  );
}
