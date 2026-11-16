// Pestaña SPONSORS (reemplaza a DISEÑOS): biblioteca de sponsors (imágenes o videos), sponsor al aire (uno o todos rotando)
// y ubicación de sponsors pegados a cada gráfica, que se arrastran y se agrandan sobre la vista previa.
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import GraphicPreview from './GraphicPreview';
import SponsorEditor from './SponsorEditor';
import SponsorLibrary from './SponsorLibrary';
import { DEFAULT_PLACEMENT, placementRect, snapBox, sponsorGroups, sponsorList } from '../utils/sponsors';
import { getCanvasSize } from '../utils/canvasSize';
import { GOOGLE_FONTS_URL } from '../utils/fonts';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch { /* fuera de Electron */ }
}

// Gráficas a las que no tiene sentido pegarles sponsors
const SKIP = ['sponsorLive', 'windVectors'];

export default function SponsorsPanel({ config, positions, drivers, sessionInfo, graphicIds, onConfigChange, colors, inputStyle, btnStyle, t }) {
  const sponsors = sponsorList(config);
  const groups = sponsorGroups(config);
  const placements = config.sponsorPlacements && typeof config.sponsorPlacements === 'object' ? config.sponsorPlacements : {};
  const [live, setLive] = useState({ isVisible: false, sponsorId: null, rotate: false });
  const ids = useMemo(() => (graphicIds || []).filter(id => !SKIP.includes(id)), [graphicIds]);
  const [selected, setSelected] = useState(() => ids.find(id => placements[id]) || 'tower');
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null); // sponsor abierto en el editor (recorte / quitar fondo)
  const [magnet, setMagnet] = useState(true);        // imán a los bordes y centro de la gráfica y de la pantalla
  const [guides, setGuides] = useState({ x: [], y: [] });
  const [previewScale, setPreviewScale] = useState(0.4);
  const areaRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const { width: CW, height: CH } = getCanvasSize(config);

  useEffect(() => {
    if (!ipcRenderer) return undefined;
    ipcRenderer.invoke('get-sponsor-live').then(s => { if (s) setLive(s); }).catch(() => {});
    const onLive = (e, s) => { if (s) setLive(s); };
    ipcRenderer.on('update-sponsor-live', onLive);
    return () => ipcRenderer.removeListener('update-sponsor-live', onLive);
  }, []);

  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setPreviewScale(Math.max(0.15, Math.min(1, (el.clientWidth - 8) / CW))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [CW]);

  // --- Al aire ---
  const sendLive = (state) => { if (ipcRenderer) ipcRenderer.send('sponsor-live', state); };

  // --- Biblioteca ---
  const removeSponsor = (s) => {
    if (!window.confirm(t('sponsors.confirmRemove', { name: s.name || s.file }))) return;
    const nextPlacements = {};
    Object.entries(placements).forEach(([gid, p]) => { nextPlacements[gid] = { ...p, ids: (p.ids || []).filter(x => x !== s.id) }; });
    onConfigChange({ sponsors: sponsors.filter(x => x.id !== s.id), sponsorPlacements: nextPlacements });
    if (ipcRenderer) [s.file, s.originalFile].filter(Boolean).forEach(f => ipcRenderer.invoke('delete-sponsor-file', f).catch(() => {}));
    if (live.isVisible && !live.rotate && live.sponsorId === s.id) sendLive({ isVisible: false, sponsorId: null, rotate: false });
  };


  // --- Ubicación en la gráfica elegida ---
  const saved = placements[selected];
  const current = draft || { ...DEFAULT_PLACEMENT, ...(saved || {}), ids: (saved && Array.isArray(saved.ids)) ? saved.ids : [], groups: (saved && Array.isArray(saved.groups)) ? saved.groups : [] };
  const savePlacement = (p) => { setDraft(null); onConfigChange('sponsorPlacements', { ...placements, [selected]: p }); };
  const setField = (field, value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    savePlacement({ ...current, [field]: n });
  };
  const toggleSponsorIn = (id) => {
    const has = current.ids.includes(id);
    savePlacement({ ...current, ids: has ? current.ids.filter(x => x !== id) : [...current.ids, id] });
  };
  const toggleGroupIn = (gid) => {
    const has = current.groups.includes(gid);
    savePlacement({ ...current, groups: has ? current.groups.filter(x => x !== gid) : [...current.groups, gid] });
  };
  const clearGraphic = () => {
    const next = { ...placements };
    delete next[selected];
    setDraft(null);
    onConfigChange('sponsorPlacements', next);
  };

  const pos = positions?.[selected] || { x: 0, y: 0, scale: 1 };
  const scale = Number.isFinite(pos.scale) && pos.scale > 0 ? pos.scale : 1;
  const rect = placementRect(current, pos);

  // Caja de la gráfica (en px de la gráfica sin escalar) medida sobre la vista previa, para las ubicaciones rápidas
  const graphicBox = () => {
    const stage = stageRef.current;
    const wrap = stage && stage.querySelector('[data-le-wrap]');
    if (!wrap) return null;
    const sr = stage.getBoundingClientRect();
    let box = null;
    Array.from(wrap.children).forEach(c => {
      if (c.hasAttribute('data-sponsor-slot') || ['STYLE', 'SCRIPT', 'LINK'].includes(c.tagName)) return;
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const b = { l: (r.left - sr.left) / previewScale, t: (r.top - sr.top) / previewScale, r: (r.right - sr.left) / previewScale, b: (r.bottom - sr.top) / previewScale };
      box = box ? { l: Math.min(box.l, b.l), t: Math.min(box.t, b.t), r: Math.max(box.r, b.r), b: Math.max(box.b, b.b) } : b;
    });
    if (!box) return null;
    return { x: (box.l - pos.x) / scale, y: (box.t - pos.y) / scale, w: (box.r - box.l) / scale, h: (box.b - box.t) / scale };
  };
  const snapTo = (where) => {
    const g = graphicBox();
    if (!g) return;
    const gap = 8;
    const p = { ...current };
    if (where === 'above') { p.dx = Math.round(g.x + (g.w - p.w) / 2); p.dy = Math.round(g.y - p.h - gap); }
    if (where === 'below') { p.dx = Math.round(g.x + (g.w - p.w) / 2); p.dy = Math.round(g.y + g.h + gap); }
    if (where === 'left') { p.dx = Math.round(g.x - p.w - gap); p.dy = Math.round(g.y + (g.h - p.h) / 2); }
    if (where === 'right') { p.dx = Math.round(g.x + g.w + gap); p.dy = Math.round(g.y + (g.h - p.h) / 2); }
    savePlacement(p);
  };

  // Guías del imán (en px de la gráfica sin escalar): bordes y centro de la gráfica, y bordes y centro de la pantalla
  const magnetTargets = () => {
    const g = graphicBox();
    const toG = (v, o) => (v - o) / scale;
    const xs = [toG(0, pos.x), toG(CW / 2, pos.x), toG(CW, pos.x)];
    const ys = [toG(0, pos.y), toG(CH / 2, pos.y), toG(CH, pos.y)];
    if (g) { xs.push(g.x, g.x + g.w / 2, g.x + g.w); ys.push(g.y, g.y + g.h / 2, g.y + g.h); }
    return { xs, ys };
  };

  // Arrastrar (mover) o tirar de la esquina (tamaño). Con el imán activo se pega a las guías; Alt lo desactiva al vuelo.
  const onPointerDown = (e, mode) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode, x: e.clientX, y: e.clientY, start: { ...current }, targets: magnet ? magnetTargets() : null };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const k = previewScale * scale;
    const mx = (e.clientX - d.x) / k; const my = (e.clientY - d.y) / k;
    let box = d.mode === 'move'
      ? { x: d.start.dx + mx, y: d.start.dy + my, w: d.start.w, h: d.start.h }
      : { x: d.start.dx, y: d.start.dy, w: Math.max(20, d.start.w + mx), h: Math.max(12, d.start.h + my) };
    let lines = { x: [], y: [] };
    if (d.targets && !e.altKey) {
      const snapped = snapBox(box, d.targets.xs, d.targets.ys, 10 / k, d.mode);
      box = snapped.box; lines = snapped.lines;
    }
    setGuides(lines);
    setDraft({ ...d.start, dx: Math.round(box.x), dy: Math.round(box.y), w: Math.max(20, Math.round(box.w)), h: Math.max(12, Math.round(box.h)) });
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setGuides({ x: [], y: [] });
    if (draft) savePlacement(draft);
  };

  const previewConfig = { ...config, sponsorPlacements: { ...placements, [selected]: current } };
  const designKeys = Object.keys(config).filter(k => /^design_/.test(k) && config[k]);

  const box = { backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '16px' };
  const small = { fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const numInput = (field, label) => (
    <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '3px', ...small }}>
      {label}
      <input type="number" value={current[field]} onChange={(e) => setField(field, e.target.value)} style={{ ...inputStyle, padding: '6px', width: '70px' }} />
    </label>
  );

  return (
    <div style={{ padding: '30px', flex: 1, backgroundColor: colors.bgApp, overflowY: 'auto' }}>
      <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>{t('sponsors.title')}</h2>
      <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '20px', maxWidth: '980px' }}>{t('sponsors.description')}</p>

      {/* BIBLIOTECA + AL AIRE */}
      <div style={{ ...box, marginBottom: '20px' }}>
        <SponsorLibrary config={config} sponsors={sponsors} groups={groups} live={live} sendLive={sendLive} onConfigChange={onConfigChange}
          onEdit={setEditingId} onRemove={removeSponsor} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} t={t} />

        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', ...small }}>
            {t('sponsors.liveFormat')}
            <select value={config.sponsorLiveFormat || 'card'} onChange={(e) => onConfigChange('sponsorLiveFormat', e.target.value)} style={{ ...inputStyle, padding: '6px', cursor: 'pointer' }}>
              <option value="card">{t('sponsors.formatCard')}</option>
              <option value="clean">{t('sponsors.formatClean')}</option>
              <option value="fullscreen">{t('sponsors.formatFull')}</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', ...small }}>
            {t('sponsors.liveWidth')}
            <input type="number" min="80" max="1920" value={config.sponsorLiveWidth || 320} onChange={(e) => onConfigChange('sponsorLiveWidth', Math.min(1920, Math.max(80, parseInt(e.target.value, 10) || 320)))} style={{ ...inputStyle, padding: '6px', width: '80px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', ...small }}>
            {t('sponsors.rotateSec')}
            <input type="number" min="2" max="120" value={config.sponsorRotateSec || 8} onChange={(e) => onConfigChange('sponsorRotateSec', Math.min(120, Math.max(2, parseInt(e.target.value, 10) || 8)))} style={{ ...inputStyle, padding: '6px', width: '70px' }} />
          </label>
          <span style={{ fontSize: '10px', color: colors.textMuted, flex: 1, minWidth: '200px' }}>{t('sponsors.liveHint')}</span>
        </div>
      </div>

      {/* SPONSORS EN LAS GRÁFICAS */}
      <div style={{ ...box, marginBottom: '20px' }}>
        <div style={{ ...small, fontSize: '12px', color: colors.textMain, marginBottom: '10px' }}>{t('sponsors.inGraphics')}</div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
            <select value={selected} onChange={(e) => { setDraft(null); setSelected(e.target.value); }} style={{ ...inputStyle, padding: '8px', cursor: 'pointer' }}>
              {ids.map(id => <option key={id} value={id}>{t(`graphics.${id}`)}{(placements[id]?.ids?.length || 0) + (placements[id]?.groups?.length || 0) ? ' •' : ''}</option>)}
            </select>
            <div style={small}>{t('sponsors.whichOnes')}</div>
            {!sponsors.length && <span style={{ fontSize: '11px', color: colors.textMuted }}>{t('sponsors.empty')}</span>}
            {groups.map(g => (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 'bold', color: colors.yellow, cursor: 'pointer' }}>
                <input type="checkbox" checked={current.groups.includes(g.id)} onChange={() => toggleGroupIn(g.id)} style={{ cursor: 'pointer' }} />
                <Icon name="folder" />{t('sponsors.wholeGroup', { name: g.name })}
              </label>
            ))}
            {sponsors.map(s => {
              const viaGroup = !!s.groupId && current.groups.includes(s.groupId);
              return (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: s.active === false ? colors.textMuted : colors.textMain, cursor: 'pointer' }}>
                  <input type="checkbox" checked={viaGroup || current.ids.includes(s.id)} disabled={viaGroup} onChange={() => toggleSponsorIn(s.id)} style={{ cursor: 'pointer' }} />
                  {s.name || s.file}{s.active === false ? ` (${t('sponsors.paused').toLowerCase()})` : ''}
                </label>
              );
            })}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {numInput('dx', 'X')}{numInput('dy', 'Y')}{numInput('w', t('sponsors.width'))}{numInput('h', t('sponsors.height'))}
              {numInput('interval', t('sponsors.everySec'))}
            </div>
            <div style={small}>{t('sponsors.quickPlace')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {['above', 'below', 'left', 'right'].map(w => <button key={w} onClick={() => snapTo(w)} style={{ ...btnStyle(false), padding: '6px', fontSize: '10px' }}>{t(`sponsors.place_${w}`)}</button>)}
            </div>
            {saved && <button onClick={clearGraphic} style={{ ...btnStyle(false), padding: '7px', fontSize: '10px', backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('sponsors.clearGraphic')}</button>}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 'bold', color: colors.textMain, cursor: 'pointer' }}>
              <input type="checkbox" checked={magnet} onChange={(e) => setMagnet(e.target.checked)} style={{ cursor: 'pointer' }} />
              {t('sponsors.magnet')}
            </label>
            <span style={{ fontSize: '10px', color: colors.textMuted }}>{t('sponsors.dragHint')}</span>
          </div>

          <div ref={areaRef} style={{ flex: 1, minWidth: '320px' }}>
            <div style={{ width: CW * previewScale, height: CH * previewScale, position: 'relative', overflow: 'hidden', boxShadow: '0 0 0 2px #555' }}>
              <div ref={stageRef} className="sp-stage" style={{ width: `${CW}px`, height: `${CH}px`, position: 'absolute', left: 0, top: 0, transform: `scale(${previewScale})`, transformOrigin: 'top left', backgroundColor: config.chromaColor || '#00FF00', fontFamily: config.fontFamily || 'Arial, sans-serif' }}>
                <style>{`@import url('${GOOGLE_FONTS_URL}'); .sp-stage * { transition: none !important; }`}</style>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <GraphicPreview noCover id={selected} config={previewConfig} positions={positions} drivers={drivers} sessionInfo={sessionInfo} />
                </div>
                {guides.x.map(v => <div key={`gx${v}`} style={{ position: 'absolute', left: pos.x + v * scale - 2 / previewScale, top: 0, width: 4 / previewScale, height: CH, backgroundColor: '#ff2bd6', pointerEvents: 'none', zIndex: 600 }} />)}
                {guides.y.map(v => <div key={`gy${v}`} style={{ position: 'absolute', top: pos.y + v * scale - 2 / previewScale, left: 0, height: 4 / previewScale, width: CW, backgroundColor: '#ff2bd6', pointerEvents: 'none', zIndex: 600 }} />)}
                <div
                  onPointerDown={(e) => onPointerDown(e, 'move')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                  style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height, boxSizing: 'border-box', border: `${Math.max(2, 2 / previewScale)}px dashed #ffcc00`, backgroundColor: current.ids.length || current.groups.length ? 'transparent' : 'rgba(255,204,0,0.18)', cursor: 'grab', touchAction: 'none', zIndex: 500 }}
                >
                  <div
                    onPointerDown={(e) => onPointerDown(e, 'size')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                    style={{ position: 'absolute', right: -8 / previewScale, bottom: -8 / previewScale, width: 16 / previewScale, height: 16 / previewScale, backgroundColor: '#ffcc00', borderRadius: '3px', cursor: 'nwse-resize' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingId && sponsors.find(s => s.id === editingId) && (
        <SponsorEditor key={editingId} sponsor={sponsors.find(s => s.id === editingId)} colors={colors} btnStyle={btnStyle} t={t}
          onSave={(next) => onConfigChange('sponsors', sponsors.map(s => (s.id === next.id ? next : s)))} onClose={() => setEditingId(null)} />
      )}

      {/* Diseños cargados con la pestaña anterior (DISEÑOS): se pueden quitar desde acá */}
      {designKeys.length > 0 && (
        <div style={box}>
          <div style={{ ...small, marginBottom: '8px' }}>{t('sponsors.oldDesigns')}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {designKeys.map(k => (
              <button key={k} onClick={() => onConfigChange(k, null)} style={{ ...btnStyle(false), width: 'auto', padding: '6px 10px', fontSize: '10px' }}>
                {t(`graphics.${k.slice(7)}`)} <Icon name="close" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
