import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import GraphicPreview from './GraphicPreview';
import Icon from '../components/Icon';
import { getCanvasSize } from '../utils/canvasSize';
import { LAYOUT_EDITS_PREFIX, detectObjects, resolvePath, describeObject } from '../utils/layoutEdit';
import { GOOGLE_FONTS_URL } from '../utils/fonts';

const EDITABLE_GRAPHICS = [
  'relator', 'comentarista', 'notero1', 'notero2', 'circuito', 'clima', 'ticker', 'tower',
  'grid', 'finalResults', 'winner', 'flags', 'fastestLap', 'driverInfo', 'battle', 'customZocalo',
  'votingQR', 'votingResults', 'lapCounter', 'virtualChamp', 'pitStop', 'startingLights',
  'lapTimesHistory', 'trackAlert', 'penaltyAlert', 'branding', 'evento'
];

const SNAP_THRESHOLD = 8; // px del escenario (el lienzo del overlay)

// Descarta los desplazamientos en cero para no ensuciar el archivo de configuración
const cleanEdits = (edits) => {
  const out = {};
  Object.entries(edits || {}).forEach(([key, off]) => {
    if (off && (off.x || off.y)) out[key] = { x: Math.round(off.x || 0), y: Math.round(off.y || 0) };
  });
  return out;
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

export default function GraphicEditor({ config, positions, drivers, sessionInfo, onConfigChange, colors, inputStyle, btnStyle, t }) {
  const [selected, setSelected] = useState('finalResults');
  const [depth, setDepth] = useState(1);
  const [objects, setObjects] = useState([]);            // [{ key, label }] objetos detectados en la gráfica
  const [selectedKey, setSelectedKey] = useState(null);
  const [hoverKey, setHoverKey] = useState(null);
  const [draft, setDraft] = useState(null);              // desplazamientos provisorios mientras se arrastra
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [snapLines, setSnapLines] = useState({ x: [], y: [] });
  const [previewScale, setPreviewScale] = useState(0.42);

  const areaRef = useRef(null);
  const stageRef = useRef(null);
  const boxRefs = useRef({});
  const dragRef = useRef(null);
  const [history, setHistory] = useState({});            // por gráfica: pila de estados anteriores para deshacer

  const editsKey = `${LAYOUT_EDITS_PREFIX}${selected}`;
  const savedEdits = config[editsKey];
  const textSizesKey = `textSizes_${selected}`;
  const textSizes = config[textSizesKey] || {};
  const edits = useMemo(() => draft || savedEdits || {}, [draft, savedEdits]);
  const previewConfig = useMemo(() => ({ ...config, [editsKey]: edits, [textSizesKey]: textSizes }), [config, editsKey, edits, textSizesKey, textSizes]);
  const accent = config.themeAccent || '#ffcc00';
  const { width: CW, height: CH } = getCanvasSize(config); // lienzo del overlay (por defecto 1920x1080)
  const SAFE_X = Math.round(CW * 0.05), SAFE_Y = Math.round(CH * 0.05); // zona segura: 5 % de cada borde

  const getWrapper = useCallback(() => (stageRef.current ? stageRef.current.querySelector('[data-le-wrap]') : null), []);

  // Ajusta la escala del escenario al espacio disponible
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const scale = Math.min((el.clientWidth - 48) / CW, (el.clientHeight - 48) / CH);
      setPreviewScale(Math.max(0.2, Math.min(1, scale)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [CW, CH]);

  // Detecta los objetos de la gráfica ya dibujada (y vuelve a mirar cada tanto: aparecen datos, cambia la página, etc.)
  useEffect(() => {
    const refresh = () => {
      const wrapper = getWrapper();
      if (!wrapper) return;
      const next = detectObjects(wrapper, depth).map(({ el, key }) => {
        const r = el.getBoundingClientRect();
        return { key, label: describeObject(el), area: r.width * r.height };
      });
      setObjects(prev => (prev.length === next.length && prev.every((o, i) => o.key === next[i].key && o.label === next[i].label) ? prev : next));
    };
    refresh();
    const timer = setInterval(refresh, 700);
    return () => clearInterval(timer);
  }, [selected, depth, getWrapper, config, drivers]);

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
      const k = stageRect.width / CW;
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
  }, [objects, getWrapper, CW]);

  const commit = useCallback((next, { remember = true } = {}) => {
    const cleaned = cleanEdits(next);
    if (remember) {
      setHistory(prev => ({ ...prev, [selected]: [...(prev[selected] || []).slice(-29), cleanEdits(savedEdits)] }));
    }
    setDraft(null);
    onConfigChange(editsKey, Object.keys(cleaned).length > 0 ? cleaned : null);
  }, [selected, savedEdits, editsKey, onConfigChange]);

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
    const stageK = stageRect.width / CW;
    const toStage = (r) => ({ left: (r.left - stageRect.left) / stageK, top: (r.top - stageRect.top) / stageK, w: r.width / stageK, h: r.height / stageK });
    const rect = toStage(el.getBoundingClientRect());

    // El desplazamiento se mide en píxeles propios de la gráfica (que puede estar escalada)
    const own = el.offsetWidth > 0 ? el.getBoundingClientRect().width / el.offsetWidth : 0;
    const graphicScale = own > 0 && stageK > 0 ? own / stageK : (positions?.[selected]?.scale || 1);

    // Líneas a las que se "pega": bordes / centro / zona segura del cuadro y de los demás objetos
    const targetsX = [0, CW / 2, CW, SAFE_X, CW - SAFE_X];
    const targetsY = [0, CH / 2, CH, SAFE_Y, CH - SAFE_Y];
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
    commit(previous, { remember: false });
  };

  const resetObject = (key) => {
    const next = { ...edits };
    delete next[key];
    const nextSizes = { ...textSizes };
    delete nextSizes[key];
    setHistory(prev => ({ ...prev, [selected]: [...(prev[selected] || []).slice(-29), cleanEdits(savedEdits)] }));
    setDraft(null);
    onConfigChange({
      [editsKey]: Object.keys(cleanEdits(next)).length ? cleanEdits(next) : null,
      [textSizesKey]: Object.keys(nextSizes).length ? nextSizes : null
    });
  };

  const setTextSize = (key, rawValue) => {
    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value)) return;
    const nextSizes = { ...textSizes, [key]: Math.max(6, Math.min(240, Math.round(value))) };
    onConfigChange(textSizesKey, nextSizes);
  };

  const resetGraphic = () => {
    if (Object.keys(cleanEdits(edits)).length === 0 && Object.keys(textSizes).length === 0) return;
    if (!window.confirm(t('editor.confirmReset'))) return;
    setHistory(prev => ({ ...prev, [selected]: [...(prev[selected] || []).slice(-29), cleanEdits(savedEdits)] }));
    setDraft(null);
    onConfigChange({ [editsKey]: null, [textSizesKey]: null });
  };

  const setOffset = (key, axis, value) => {
    const base = edits[key] || { x: 0, y: 0 };
    commit({ ...edits, [key]: { ...base, [axis]: parseInt(value, 10) || 0 } });
  };

  // Teclado sobre el escenario: flechas = ajuste fino (1 px, con Shift 10 px), Ctrl + Z = deshacer, Supr = restablecer objeto
  const nudgedRef = useRef(false);
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

  const editedCount = Object.keys(cleanEdits(edits)).length + Object.keys(textSizes).length;
  const hasHistory = (history[selected] || []).length > 0;
  const borderW = Math.max(2, 2.5 / previewScale);
  const selectedObj = objects.find(o => o.key === selectedKey);
  const selectedWrapper = selectedKey ? getWrapper() : null;
  const selectedElement = selectedWrapper ? resolvePath(selectedWrapper, selectedKey) : null;
  const selectedHasText = !!(selectedElement && (selectedElement.textContent || '').trim());
  const selectedTextSize = selectedKey && textSizes[selectedKey] ? textSizes[selectedKey] : (selectedHasText ? Math.round(parseFloat(getComputedStyle(selectedElement).fontSize) || 24) : 24);
  const selectedOffset = (selectedKey && edits[selectedKey]) || { x: 0, y: 0 };
  const labelOf = (o, i) => o.label === 'img' ? `${t('editor.objectImage')}` : (o.label || `${t('editor.objectBlock')} ${i + 1}`);

  // Los recuadros más grandes van abajo así los chicos siguen siendo clickeables aunque se superpongan
  const orderedObjects = useMemo(() => [...objects].sort((a, b) => b.area - a.area), [objects]);

  const panelBox = { backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '22px' };
  const smallLabel = { fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase' };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: colors.bgApp }}>
      <div style={{ width: '360px', minWidth: '360px', backgroundColor: colors.bgPanel, padding: '20px', overflowY: 'auto', borderRight: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.yellow, marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="dashboard_customize" size="1.3em" /> {t('editor.title')}
        </h3>
        <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', marginTop: 0, marginBottom: '16px' }}>{t('editor.description')}</p>

        <div style={{ ...smallLabel, marginBottom: '6px' }}>{t('editor.selectGraphic')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '22px' }}>
          {EDITABLE_GRAPHICS.map(id => {
            const edited = !!config[`${LAYOUT_EDITS_PREFIX}${id}`];
            return (
              <button key={id} onClick={() => selectGraphic(id)} style={{ ...btnStyle(selected === id), padding: '8px 5px', fontSize: '9px', position: 'relative' }}>
                {t(`graphics.${id}`)}
                {edited && <Icon name="edit" size="1.1em" title={t('editor.edited')} style={{ position: 'absolute', top: '3px', right: '3px', opacity: 0.85 }} />}
              </button>
            );
          })}
        </div>

        <div style={panelBox}>
          <div style={{ ...smallLabel, marginBottom: '6px' }}>{t('editor.detailTitle')}</div>
          <div style={{ display: 'flex', gap: '5px' }}>
            {[1, 2, 3].map(level => (
              <button key={level} onClick={() => selectDepth(level)} style={{ ...btnStyle(depth === level), flex: 1, padding: '8px 4px', fontSize: '9px' }}>{t(`editor.detail${level}`)}</button>
            ))}
          </div>
          <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', margin: '8px 0 0' }}>{t('editor.detailHint')}</p>
        </div>

        <div style={panelBox}>
          <div style={{ ...smallLabel, marginBottom: '8px' }}>{t('editor.objectsTitle', { n: objects.length })}</div>
          {objects.length === 0 ? (
            <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', margin: 0 }}>{t('editor.noObjects')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
              {objects.map((o, i) => {
                const off = edits[o.key];
                const moved = !!(off && (off.x || off.y));
                const isSel = selectedKey === o.key;
                return (
                  <div
                    key={o.key}
                    onClick={() => setSelectedKey(o.key)}
                    onMouseEnter={() => setHoverKey(o.key)}
                    onMouseLeave={() => setHoverKey(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', backgroundColor: isSel ? 'rgba(255,204,0,0.15)' : colors.bgInput, border: `1px solid ${isSel ? colors.yellow : colors.border}`, fontSize: '10px', fontWeight: 'bold', color: colors.textMain }}
                  >
                    <Icon name="drag_indicator" color={colors.textMuted} />
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{labelOf(o, i)}</span>
                    {moved && <span style={{ color: colors.yellow, fontFamily: 'monospace' }}>{off.x},{off.y}</span>}
                    {moved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resetObject(o.key); }}
                        title={t('editor.resetObjectTitle')}
                        style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                      ><Icon name="restart_alt" /></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedObj && (
          <div style={panelBox}>
            <div style={{ ...smallLabel, marginBottom: '8px' }}>{t('editor.offsetLabel')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={smallLabel}>{t('personalizar.axisX')}</label><input type="number" value={selectedOffset.x} onChange={(e) => setOffset(selectedKey, 'x', e.target.value)} style={inputStyle} /></div>
              <div><label style={smallLabel}>{t('personalizar.axisY')}</label><input type="number" value={selectedOffset.y} onChange={(e) => setOffset(selectedKey, 'y', e.target.value)} style={inputStyle} /></div>
            </div>
            {selectedHasText && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ ...smallLabel, display: 'block', marginBottom: '6px' }}>TAMAÑO DEL TEXTO (PX)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" min="6" max="240" step="1" value={selectedTextSize}
                    onChange={(e) => setTextSize(selectedKey, e.target.value)} style={inputStyle} />
                  <span style={{ color: colors.textMuted, fontSize: '10px', whiteSpace: 'nowrap' }}>Independiente</span>
                </div>
                <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.4', margin: '6px 0 0' }}>
                  Este tamaño se guarda solamente para el texto seleccionado.
                </p>
              </div>
            )}
            <button onClick={() => resetObject(selectedKey)} style={{ ...btnStyle(false), marginTop: '10px', padding: '8px', fontSize: '10px' }}>{t.i('editor.resetObject')}</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
          <button onClick={undo} disabled={!hasHistory} style={{ ...btnStyle(false), flex: 1, padding: '10px 6px', fontSize: '10px' }}>{t.i('editor.undoBtn')}</button>
          <button onClick={resetGraphic} disabled={editedCount === 0} style={{ ...btnStyle(false), flex: 1, padding: '10px 6px', fontSize: '10px', backgroundColor: editedCount ? '#c0392b' : colors.bgInput, color: '#fff', borderColor: editedCount ? '#e74c3c' : colors.border }}>{t.i('editor.resetGraphic')}</button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, backgroundColor: colors.bgApp, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', padding: '10px 16px', backgroundColor: colors.bgPanel, borderBottom: `1px solid ${colors.border}` }}>
          {[
            { key: 'guides', label: t('personalizar.guidesToggle'), checked: showGuides, set: setShowGuides },
            { key: 'snap', label: t('personalizar.snapToggle'), checked: snapEnabled, set: setSnapEnabled },
          ].map(opt => (
            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 'bold', color: colors.textMain, cursor: 'pointer', textTransform: 'uppercase' }}>
              <input type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)} style={{ cursor: 'pointer' }} />
              {opt.label}
            </label>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: colors.yellow, textTransform: 'uppercase' }}>{t(`graphics.${selected}`)}</span>
        </div>

        <div ref={areaRef} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div
            tabIndex={0}
            onKeyDown={handleStageKeyDown}
            onKeyUp={handleStageKeyUp}
            style={{
              width: CW * previewScale, height: CH * previewScale,
              minWidth: CW * previewScale, minHeight: CH * previewScale,
              flexShrink: 0, position: 'relative', outline: 'none',
              boxShadow: '0 0 0 2px #555, 0 0 30px rgba(0,0,0,1)'
            }}
          >
            <div
              ref={stageRef}
              className="ge-stage"
              onPointerDown={() => setSelectedKey(null)}
              style={{
                width: `${CW}px`, height: `${CH}px`, backgroundColor: config.chromaColor || '#00FF00',
                position: 'absolute', top: 0, left: 0, transform: `scale(${previewScale})`, transformOrigin: 'top left',
                overflow: 'hidden', fontFamily: config.fontFamily || 'Arial, sans-serif'
              }}
            >
              <style>
                {`@import url('${GOOGLE_FONTS_URL}');
                  .ge-stage * { transition: none !important; }`}
              </style>

              <div style={{ position: 'absolute', left: 0, top: 0, width: `${CW}px`, height: `${CH}px`, pointerEvents: 'none', zIndex: 10 }}>
                <GraphicPreview noCover id={selected} config={previewConfig} positions={positions} drivers={drivers} sessionInfo={sessionInfo} />
              </div>

              {showGuides && (
                <>
                  <div style={{ position: 'absolute', left: `${CW / 2 - 1}px`, top: 0, width: '2px', height: `${CH}px`, backgroundColor: 'rgba(0, 229, 255, 0.55)', pointerEvents: 'none', zIndex: 20 }} />
                  <div style={{ position: 'absolute', left: 0, top: `${CH / 2 - 1}px`, width: `${CW}px`, height: '2px', backgroundColor: 'rgba(0, 229, 255, 0.55)', pointerEvents: 'none', zIndex: 20 }} />
                  <div style={{ position: 'absolute', left: `${SAFE_X}px`, top: `${SAFE_Y}px`, width: `${CW - 2 * SAFE_X}px`, height: `${CH - 2 * SAFE_Y}px`, border: '2px dashed rgba(255,255,255,0.35)', boxSizing: 'border-box', pointerEvents: 'none', zIndex: 20 }} />
                </>
              )}

              {snapLines.x.map(x => (
                <div key={`sx${x}`} style={{ position: 'absolute', left: `${x - 2}px`, top: 0, width: '4px', height: `${CH}px`, backgroundColor: '#ff2bd6', pointerEvents: 'none', zIndex: 600 }} />
              ))}
              {snapLines.y.map(y => (
                <div key={`sy${y}`} style={{ position: 'absolute', left: 0, top: `${y - 2}px`, width: `${CW}px`, height: '4px', backgroundColor: '#ff2bd6', pointerEvents: 'none', zIndex: 600 }} />
              ))}

              {/* RECUADROS DE LOS OBJETOS: cada uno se arrastra para moverlo */}
              {orderedObjects.map((o) => {
                const isSel = selectedKey === o.key;
                const isHover = hoverKey === o.key;
                const off = edits[o.key];
                return (
                  <div
                    key={o.key}
                    ref={(node) => { if (node) boxRefs.current[o.key] = node; else delete boxRefs.current[o.key]; }}
                    onPointerDown={(e) => handleBoxPointerDown(e, o)}
                    onPointerMove={handleBoxPointerMove}
                    onPointerUp={handleBoxPointerUp}
                    onPointerCancel={handleBoxPointerUp}
                    onMouseEnter={() => setHoverKey(o.key)}
                    onMouseLeave={() => setHoverKey(null)}
                    style={{
                      position: 'absolute', display: 'none', boxSizing: 'border-box', cursor: 'grab', touchAction: 'none',
                      zIndex: isSel ? 520 : 500,
                      border: `${borderW}px ${isSel ? 'solid' : 'dashed'} ${isSel ? accent : 'rgba(255,255,255,0.7)'}`,
                      backgroundColor: isSel ? 'rgba(255,204,0,0.14)' : isHover ? 'rgba(255,255,255,0.14)' : 'transparent'
                    }}
                  >
                    {isSel && (
                      <div style={{ position: 'absolute', left: `${-borderW}px`, top: `${-30 / previewScale * 0.5 - borderW}px`, whiteSpace: 'nowrap', pointerEvents: 'none', backgroundColor: accent, color: '#000', fontSize: `${12 / previewScale}px`, fontWeight: 'bold', padding: '1px 8px', fontFamily: 'monospace' }}>
                        {off ? `X ${off.x}  Y ${off.y}` : 'X 0  Y 0'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ padding: '6px 16px', fontSize: '10px', color: colors.textMuted, borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgPanel }}>
          {t('editor.tips')}
        </div>
      </div>
    </div>
  );
}
