import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Stage from '../graphics/Stage';
import { ConfirmButton } from './ui';
import { GRAPHICS, CANVAS, demoLive } from '../state';
import { detectObjects, resolvePath, describeObject } from '../utils/layoutEdit';

// EDITOR (igual que en Carrera, race/src/windows/GraphicEditor.jsx): se elige una gráfica y se arrastran sus objetos (escudo,
// nombre, marcador, cancha…) de un lugar a otro. También se le puede dar a cada texto su propio tamaño. Se guarda en
// state.edits[idGráfica] = { camino: { x, y } } y state.textSizes[idGráfica] = { camino: px }, y se ve al instante en el overlay.
const SNAP_THRESHOLD = 8; // px del lienzo
const SAFE_X = Math.round(CANVAS.width * 0.05);
const SAFE_Y = Math.round(CANVAS.height * 0.05);
const DETAIL_LEVELS = [[1, 'BLOQUES'], [2, 'ELEMENTOS'], [3, 'DETALLE']];

// Descarta los desplazamientos en cero para no ensuciar el archivo guardado
const cleanEdits = (edits) => {
  const out = {};
  Object.entries(edits || {}).forEach(([key, off]) => {
    if (off && (off.x || off.y)) out[key] = { x: Math.round(off.x || 0), y: Math.round(off.y || 0) };
  });
  return out;
};

// Pone (o saca, si queda vacío) el valor de una gráfica dentro de state.edits / state.textSizes
const withGraphic = (map, id, value) => {
  const next = { ...(map || {}) };
  if (value && Object.keys(value).length) next[id] = value; else delete next[id];
  return next;
};

// Busca la línea guía más cercana para los bordes / el centro del objeto que se arrastra (devuelve cuánto corregir)
const snapAxis = (start, size, targets) => {
  let best = null;
  [start, start + size / 2, start + size].forEach(candidate => {
    targets.forEach(target => {
      const delta = target - candidate;
      if (Math.abs(delta) <= SNAP_THRESHOLD && (best === null || Math.abs(delta) < Math.abs(best.delta))) best = { delta, target };
    });
  });
  return best;
};

export default function EditorTab({ state, update }) {
  const [selected, setSelected] = useState('scorebug');
  const [depth, setDepth] = useState(1);
  const [objects, setObjects] = useState([]);            // [{ key, label, area }] objetos detectados en la gráfica
  const [selectedKey, setSelectedKey] = useState(null);
  const [hoverKey, setHoverKey] = useState(null);
  const [draft, setDraft] = useState(null);              // desplazamientos provisorios mientras se arrastra
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [snapLines, setSnapLines] = useState({ x: [], y: [] });
  const [previewScale, setPreviewScale] = useState(0.42);
  const [history, setHistory] = useState({});            // por gráfica: pila de estados anteriores para deshacer
  const [stamp] = useState(() => Date.now());

  const areaRef = useRef(null);
  const stageRef = useRef(null);
  const boxRefs = useRef({});
  const dragRef = useRef(null);
  const nudgedRef = useRef(false);

  const savedEdits = state.edits?.[selected];
  const textSizes = useMemo(() => state.textSizes?.[selected] || {}, [state.textSizes, selected]);
  const edits = useMemo(() => draft || savedEdits || {}, [draft, savedEdits]);
  const previewState = useMemo(() => ({ ...state, edits: { ...state.edits, [selected]: edits } }), [state, selected, edits]);
  const live = useMemo(() => demoLive(state, [selected], stamp), [state, selected, stamp]);
  const label = GRAPHICS.find(g => g.id === selected)?.label || '';

  const getWrapper = useCallback(
    () => (stageRef.current ? stageRef.current.querySelector(`[data-gid="${selected}"] [data-le-wrap]`) : null),
    [selected]
  );

  // Ajusta la escala del escenario al espacio disponible
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const scale = Math.min((el.clientWidth - 48) / CANVAS.width, (el.clientHeight - 48) / CANVAS.height);
      setPreviewScale(Math.max(0.2, Math.min(1, scale)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Detecta los objetos de la gráfica ya dibujada (y vuelve a mirar cada tanto: aparecen datos, cambia el equipo, etc.)
  useEffect(() => {
    const refresh = () => {
      const wrapper = getWrapper();
      if (!wrapper) { setObjects(prev => (prev.length ? [] : prev)); return; }
      const next = detectObjects(wrapper, depth).map(({ el, key }) => {
        const r = el.getBoundingClientRect();
        const hasText = !!(el.textContent || '').trim();
        const fontSize = hasText ? Math.round(parseFloat(getComputedStyle(el).fontSize) || 24) : 24;
        return { key, label: describeObject(el), area: r.width * r.height, hasText, fontSize };
      });
      const same = (a, b) => a.key === b.key && a.label === b.label && a.fontSize === b.fontSize;
      setObjects(prev => (prev.length === next.length && prev.every((o, i) => same(o, next[i])) ? prev : next));
    };
    refresh();
    const timer = setInterval(refresh, 700);
    return () => clearInterval(timer);
  }, [selected, depth, getWrapper, state]);

  // Cambiar de gráfica o de nivel de detalle: se pierde la selección anterior
  const resetSelection = () => { setSelectedKey(null); setHoverKey(null); setDraft(null); };
  const selectGraphic = (id) => { if (id === selected) return; resetSelection(); setObjects([]); setSelected(id); };
  const selectDepth = (level) => { if (level === depth) return; resetSelection(); setDepth(level); };

  // Los recuadros siguen a los objetos reales (medidos en cada cuadro) para quedar exactos aunque la gráfica se anime
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const stage = stageRef.current;
      const wrapper = getWrapper();
      if (!stage || !wrapper) return;
      const stageRect = stage.getBoundingClientRect();
      if (stageRect.width === 0) return;
      const k = stageRect.width / CANVAS.width;
      objects.forEach(({ key }) => {
        const box = boxRefs.current[key];
        const el = resolvePath(wrapper, key);
        if (!box) return;
        if (!el) { box.style.display = 'none'; return; }
        const r = el.getBoundingClientRect();
        box.style.display = 'block';
        box.style.left = `${(r.left - stageRect.left) / k}px`;
        box.style.top = `${(r.top - stageRect.top) / k}px`;
        box.style.width = `${r.width / k}px`;
        box.style.height = `${r.height / k}px`;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [objects, getWrapper]);

  const remember = useCallback(() => {
    setHistory(prev => ({ ...prev, [selected]: [...(prev[selected] || []).slice(-29), cleanEdits(savedEdits)] }));
  }, [selected, savedEdits]);

  const commit = useCallback((next, { keep = true } = {}) => {
    if (keep) remember();
    setDraft(null);
    const cleaned = cleanEdits(next);
    update(s => ({ ...s, edits: withGraphic(s.edits, selected, cleaned) }));
  }, [selected, remember, update]);

  const handleBoxPointerDown = (e, obj) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const wrapper = getWrapper();
    const el = wrapper && resolvePath(wrapper, obj.key);
    const stage = stageRef.current;
    if (!el || !stage) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setSelectedKey(obj.key);
    stage.parentElement?.focus();

    const stageRect = stage.getBoundingClientRect();
    const stageK = stageRect.width / CANVAS.width;
    const toStage = (r) => ({ left: (r.left - stageRect.left) / stageK, top: (r.top - stageRect.top) / stageK, w: r.width / stageK, h: r.height / stageK });
    const rect = toStage(el.getBoundingClientRect());

    // El desplazamiento se mide en píxeles propios de la gráfica (que puede estar escalada)
    const own = el.offsetWidth > 0 ? el.getBoundingClientRect().width / el.offsetWidth : 0;
    const graphicScale = own > 0 && stageK > 0 ? own / stageK : (state.layout?.[selected]?.scale || 1);

    // Líneas a las que se "pega": bordes / centro / zona segura del lienzo y de los demás objetos
    const targetsX = [0, CANVAS.width / 2, CANVAS.width, SAFE_X, CANVAS.width - SAFE_X];
    const targetsY = [0, CANVAS.height / 2, CANVAS.height, SAFE_Y, CANVAS.height - SAFE_Y];
    objects.forEach(({ key }) => {
      if (key === obj.key) return;
      const other = resolvePath(wrapper, key);
      if (!other) return;
      const o = toStage(other.getBoundingClientRect());
      if (o.w <= 0 || o.h <= 0) return;
      targetsX.push(o.left, o.left + o.w / 2, o.left + o.w);
      targetsY.push(o.top, o.top + o.h / 2, o.top + o.h);
    });

    dragRef.current = {
      key: obj.key, startX: e.clientX, startY: e.clientY, base: edits[obj.key] || { x: 0, y: 0 }, startEdits: edits,
      stageK, graphicScale, rect, targetsX, targetsY, moved: false
    };
  };

  const handleBoxPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    let dx = (e.clientX - d.startX) / d.stageK;
    let dy = (e.clientY - d.startY) / d.stageK;
    if (!d.moved && Math.hypot(dx, dy) < 2) return;
    d.moved = true;
    if (e.shiftKey) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }

    const lines = { x: [], y: [] };
    if (snapEnabled && !e.altKey) {
      // Con Shift el eje bloqueado (en cero) no se toca
      const sx = e.shiftKey && dx === 0 ? null : snapAxis(d.rect.left + dx, d.rect.w, d.targetsX);
      if (sx) { dx += sx.delta; lines.x.push(sx.target); }
      const sy = e.shiftKey && dy === 0 ? null : snapAxis(d.rect.top + dy, d.rect.h, d.targetsY);
      if (sy) { dy += sy.delta; lines.y.push(sy.target); }
    }
    setSnapLines(prev => (JSON.stringify(prev) === JSON.stringify(lines) ? prev : lines));
    d.latest = { ...d.startEdits, [d.key]: { x: Math.round(d.base.x + dx / d.graphicScale), y: Math.round(d.base.y + dy / d.graphicScale) } };
    setDraft(d.latest);
  };

  const handleBoxPointerUp = (e) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setSnapLines({ x: [], y: [] });
    if (d.moved && d.latest) commit(d.latest);
    else setDraft(null);
  };

  const undo = () => {
    const stack = history[selected] || [];
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    setHistory(prev => ({ ...prev, [selected]: stack.slice(0, -1) }));
    commit(previous, { keep: false });
  };

  const resetObject = (key) => {
    const next = { ...edits };
    delete next[key];
    const nextSizes = { ...textSizes };
    delete nextSizes[key];
    remember();
    setDraft(null);
    update(s => ({ ...s, edits: withGraphic(s.edits, selected, cleanEdits(next)), textSizes: withGraphic(s.textSizes, selected, nextSizes) }));
  };

  const setTextSize = (key, rawValue) => {
    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value)) return;
    const nextSizes = { ...textSizes, [key]: Math.max(6, Math.min(240, Math.round(value))) };
    update(s => ({ ...s, textSizes: withGraphic(s.textSizes, selected, nextSizes) }));
  };

  const resetGraphic = () => {
    remember();
    setDraft(null);
    update(s => ({ ...s, edits: withGraphic(s.edits, selected, null), textSizes: withGraphic(s.textSizes, selected, null) }));
  };

  const setOffset = (key, axis, value) => {
    const base = edits[key] || { x: 0, y: 0 };
    commit({ ...edits, [key]: { ...base, [axis]: parseInt(value, 10) || 0 } });
  };

  // Teclado sobre el escenario: flechas = ajuste fino (1 px, con Shift 10 px), Ctrl + Z = deshacer, Supr = restablecer objeto
  const handleStageKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if (!selectedKey) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); resetObject(selectedKey); return; }
    const step = e.shiftKey ? 10 : 1;
    const deltas = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    const base = edits[selectedKey] || { x: 0, y: 0 };
    nudgedRef.current = true;
    setDraft({ ...edits, [selectedKey]: { x: base.x + delta[0], y: base.y + delta[1] } });
  };
  const handleStageKeyUp = (e) => {
    if (e.key.startsWith('Arrow') && nudgedRef.current && draft) {
      nudgedRef.current = false;
      commit(draft);
    }
  };

  const accent = 'var(--accent)';
  const editedCount = Object.keys(cleanEdits(edits)).length + Object.keys(textSizes).length;
  const hasHistory = (history[selected] || []).length > 0;
  const borderW = Math.max(2, 2.5 / previewScale);
  const selectedObj = objects.find(o => o.key === selectedKey);
  const selectedHasText = !!selectedObj?.hasText;
  const selectedTextSize = (selectedKey && textSizes[selectedKey]) || selectedObj?.fontSize || 24;
  const selectedOffset = (selectedKey && edits[selectedKey]) || { x: 0, y: 0 };
  const labelOf = (o, i) => (o.label === 'img' ? 'Imagen' : (o.label || `Bloque ${i + 1}`));

  // Los recuadros más grandes van abajo así los chicos siguen siendo clickeables aunque se superpongan
  const orderedObjects = useMemo(() => [...objects].sort((a, b) => b.area - a.area), [objects]);

  return (
    <div className="studio">
      <aside className="studio-side narrow">
        <h3 className="tight"><span className="ico">✎</span> EDITOR DE GRÁFICAS</h3>
        <p className="desc" style={{ marginBottom: 16 }}>Elegí una gráfica y arrastrá sus objetos (escudo, nombre, marcador, cancha…) de un lugar a otro para personalizarla. Los cambios se guardan solos y se ven al instante en el overlay.</p>

        <div className="small-label" style={{ marginBottom: 6 }}>GRÁFICA</div>
        <div className="gfx-grid" style={{ marginBottom: 22 }}>
          {GRAPHICS.map(g => {
            const edited = !!(state.edits?.[g.id] || state.textSizes?.[g.id]);
            return (
              <button key={g.id} className={`btn ${selected === g.id ? 'primary' : ''}`} onClick={() => selectGraphic(g.id)}>
                {g.label}
                {edited && <span className="edited-mark" title="Con objetos movidos">✎</span>}
              </button>
            );
          })}
        </div>

        <div className="box" style={{ marginBottom: 22 }}>
          <div className="small-label" style={{ marginBottom: 6 }}>NIVEL DE DETALLE</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {DETAIL_LEVELS.map(([level, text]) => (
              <button key={level} className={`btn tiny ${depth === level ? 'primary' : ''}`} style={{ flex: 1 }} onClick={() => selectDepth(level)}>{text}</button>
            ))}
          </div>
          <p className="desc" style={{ margin: '8px 0 0' }}>Bloques mueve las partes grandes; Detalle separa cada texto o imagen.</p>
        </div>

        <div className="box" style={{ marginBottom: 22 }}>
          <div className="small-label" style={{ marginBottom: 8 }}>OBJETOS DE LA GRÁFICA ({objects.length})</div>
          {objects.length === 0 ? (
            <p className="desc" style={{ margin: 0 }}>Esta gráfica no muestra nada por ahora (por ejemplo, faltan equipos, jugadores o logos).</p>
          ) : (
            <div className="obj-list">
              {objects.map((o, i) => {
                const off = edits[o.key];
                const moved = !!(off && (off.x || off.y));
                const sized = !!textSizes[o.key];
                return (
                  <div
                    key={o.key}
                    className={`obj-item ${selectedKey === o.key ? 'selected' : ''}`}
                    onClick={() => setSelectedKey(o.key)}
                    onMouseEnter={() => setHoverKey(o.key)}
                    onMouseLeave={() => setHoverKey(null)}
                  >
                    <span className="grip">⋮⋮</span>
                    <span className="name">{labelOf(o, i)}</span>
                    {moved && <span className="off">{off.x},{off.y}</span>}
                    {(moved || sized) && (
                      <button title="Volver este objeto a su lugar original" onClick={(e) => { e.stopPropagation(); resetObject(o.key); }}>↺</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedObj && (
          <div className="box" style={{ marginBottom: 22 }}>
            <div className="small-label" style={{ marginBottom: 8 }}>DESPLAZAMIENTO DEL OBJETO</div>
            <div className="box-grid tight">
              <div><label className="small-label">EJE X</label><input type="number" value={selectedOffset.x} onChange={(e) => setOffset(selectedKey, 'x', e.target.value)} /></div>
              <div><label className="small-label">EJE Y</label><input type="number" value={selectedOffset.y} onChange={(e) => setOffset(selectedKey, 'y', e.target.value)} /></div>
            </div>
            {selectedHasText && (
              <div style={{ marginTop: 12 }}>
                <label className="small-label" style={{ display: 'block', marginBottom: 6 }}>TAMAÑO DEL TEXTO (PX)</label>
                <div className="inline" style={{ gap: 8 }}>
                  <input type="number" min="6" max="240" step="1" value={selectedTextSize} onChange={(e) => setTextSize(selectedKey, e.target.value)} />
                  <span className="desc" style={{ margin: 0, whiteSpace: 'nowrap' }}>Independiente</span>
                </div>
                <p className="desc" style={{ margin: '6px 0 0' }}>Este tamaño se guarda solamente para el texto seleccionado.</p>
              </div>
            )}
            <button className="btn small block" style={{ marginTop: 10 }} onClick={() => resetObject(selectedKey)}>↺ Restablecer objeto</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          <button className="btn small" style={{ flex: 1 }} onClick={undo} disabled={!hasHistory}>↶ Deshacer</button>
          {editedCount > 0
            ? <ConfirmButton className="btn small danger" style={{ flex: 1 }} onConfirm={resetGraphic}>↺ Restablecer gráfica</ConfirmButton>
            : <button className="btn small" style={{ flex: 1 }} disabled>↺ Restablecer gráfica</button>}
        </div>
      </aside>

      <div className="studio-main">
        <div className="studio-toolbar">
          {[
            { key: 'guides', label: 'Ejes y zona segura', checked: showGuides, set: setShowGuides },
            { key: 'snap', label: 'Imán a los ejes', checked: snapEnabled, set: setSnapEnabled }
          ].map(opt => (
            <label key={opt.key}><input type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)} />{opt.label}</label>
          ))}
          <span className="spacer" />
          <span className="current">{label}</span>
        </div>

        <div ref={areaRef} className="studio-area">
          <div
            className="studio-frame" tabIndex={0} onKeyDown={handleStageKeyDown} onKeyUp={handleStageKeyUp}
            style={{ width: CANVAS.width * previewScale, height: CANVAS.height * previewScale }}
          >
            <div
              ref={stageRef} className="studio-stage no-anim" onPointerDown={() => setSelectedKey(null)}
              style={{ width: CANVAS.width, height: CANVAS.height, transform: `scale(${previewScale})` }}
            >
              <div className="stage-layer" style={{ inset: 0, zIndex: 10 }}>
                <Stage state={previewState} live={live} instant />
              </div>

              {showGuides && (
                <>
                  <div className="stage-layer" style={{ left: CANVAS.width / 2 - 1, width: 2, top: 0, bottom: 0, background: 'rgba(0, 229, 255, 0.55)', zIndex: 20 }} />
                  <div className="stage-layer" style={{ top: CANVAS.height / 2 - 1, height: 2, left: 0, right: 0, background: 'rgba(0, 229, 255, 0.55)', zIndex: 20 }} />
                  <div className="stage-layer" style={{ left: SAFE_X, top: SAFE_Y, right: SAFE_X, bottom: SAFE_Y, border: '2px dashed rgba(255,255,255,0.35)', zIndex: 20 }} />
                </>
              )}

              {snapLines.x.map(x => <div key={`sx${x}`} className="stage-layer" style={{ left: x - 2, width: 4, top: 0, bottom: 0, background: '#ff2bd6', zIndex: 600 }} />)}
              {snapLines.y.map(y => <div key={`sy${y}`} className="stage-layer" style={{ top: y - 2, height: 4, left: 0, right: 0, background: '#ff2bd6', zIndex: 600 }} />)}

              {/* RECUADROS DE LOS OBJETOS: cada uno se arrastra para moverlo */}
              {orderedObjects.map((o) => {
                const isSel = selectedKey === o.key;
                const isHover = hoverKey === o.key;
                const off = edits[o.key];
                return (
                  <div
                    key={o.key}
                    className="obj-box"
                    ref={(node) => { if (node) boxRefs.current[o.key] = node; else delete boxRefs.current[o.key]; }}
                    onPointerDown={(e) => handleBoxPointerDown(e, o)}
                    onPointerMove={handleBoxPointerMove}
                    onPointerUp={handleBoxPointerUp}
                    onPointerCancel={handleBoxPointerUp}
                    onMouseEnter={() => setHoverKey(o.key)}
                    onMouseLeave={() => setHoverKey(null)}
                    style={{
                      zIndex: isSel ? 520 : 500,
                      border: `${borderW}px ${isSel ? 'solid' : 'dashed'} ${isSel ? accent : 'rgba(255,255,255,0.7)'}`,
                      backgroundColor: isSel ? 'rgba(255,204,0,0.14)' : isHover ? 'rgba(255,255,255,0.14)' : 'transparent'
                    }}
                  >
                    {isSel && (
                      <div className="obj-tag" style={{ left: -borderW, top: -30 / previewScale * 0.5 - borderW, background: accent, fontSize: 12 / previewScale }}>
                        {off ? `X ${off.x}  Y ${off.y}` : 'X 0  Y 0'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="studio-foot">
          Arrastrá un recuadro para mover el objeto · Shift: mover en línea recta · Alt: sin imán · Flechas: ajuste fino de 1 px (Shift: 10 px) · Supr: restablecer objeto · Ctrl + Z: deshacer
        </div>
      </div>
    </div>
  );
}
