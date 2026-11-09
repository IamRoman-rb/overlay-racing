// Pestaña SPONSORS (reemplaza a DISEÑOS): biblioteca de sponsors (imágenes o videos), sponsor al aire (uno o todos rotando)
// y ubicación de sponsors pegados a cada gráfica, que se arrastran y se agrandan sobre la vista previa.
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import GraphicPreview from './GraphicPreview';
import { SponsorMedia } from '../components/SponsorSlot';
import { DEFAULT_PLACEMENT, placementRect, sponsorList } from '../utils/sponsors';
import { getCanvasSize } from '../utils/canvasSize';
import { GOOGLE_FONTS_URL } from '../utils/fonts';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch { /* fuera de Electron */ }
}

// Gráficas a las que no tiene sentido pegarles sponsors
const SKIP = ['sponsorLive', 'windVectors'];

function NameInput({ value, onCommit, inputStyle }) {
  const [draft, setDraft] = useState(value || '');
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setDraft(value || ''); }
  return (
    <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (draft.trim() !== (value || '')) onCommit(draft.trim()); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      style={{ ...inputStyle, padding: '6px', fontSize: '11px', width: '100%' }} />
  );
}

export default function SponsorsPanel({ config, positions, drivers, sessionInfo, graphicIds, onConfigChange, colors, inputStyle, btnStyle, t }) {
  const sponsors = sponsorList(config);
  const placements = config.sponsorPlacements && typeof config.sponsorPlacements === 'object' ? config.sponsorPlacements : {};
  const [live, setLive] = useState({ isVisible: false, sponsorId: null, rotate: false });
  const ids = useMemo(() => (graphicIds || []).filter(id => !SKIP.includes(id)), [graphicIds]);
  const [selected, setSelected] = useState(() => ids.find(id => placements[id]) || 'tower');
  const [draft, setDraft] = useState(null);
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

  // --- Biblioteca ---
  const addSponsors = async () => {
    if (!ipcRenderer) return;
    const added = await ipcRenderer.invoke('add-sponsor-files');
    if (Array.isArray(added) && added.length) onConfigChange('sponsors', [...sponsors, ...added]);
  };
  const renameSponsor = (id, name) => onConfigChange('sponsors', sponsors.map(s => (s.id === id ? { ...s, name } : s)));
  const removeSponsor = (s) => {
    if (!window.confirm(t('sponsors.confirmRemove', { name: s.name || s.file }))) return;
    const nextPlacements = {};
    Object.entries(placements).forEach(([gid, p]) => { nextPlacements[gid] = { ...p, ids: (p.ids || []).filter(x => x !== s.id) }; });
    onConfigChange({ sponsors: sponsors.filter(x => x.id !== s.id), sponsorPlacements: nextPlacements });
    if (ipcRenderer) ipcRenderer.invoke('delete-sponsor-file', s.file).catch(() => {});
    if (live.isVisible && !live.rotate && live.sponsorId === s.id) sendLive({ isVisible: false, sponsorId: null, rotate: false });
  };

  // --- Al aire ---
  const sendLive = (state) => { if (ipcRenderer) ipcRenderer.send('sponsor-live', state); };
  const toggleOne = (id) => {
    const on = live.isVisible && !live.rotate && live.sponsorId === id;
    sendLive(on ? { isVisible: false, sponsorId: null, rotate: false } : { isVisible: true, sponsorId: id, rotate: false });
  };
  const toggleRotate = () => sendLive(live.isVisible && live.rotate ? { isVisible: false, sponsorId: null, rotate: false } : { isVisible: true, sponsorId: null, rotate: true });

  // --- Ubicación en la gráfica elegida ---
  const saved = placements[selected];
  const current = draft || { ...DEFAULT_PLACEMENT, ...(saved || {}), ids: (saved && Array.isArray(saved.ids)) ? saved.ids : [] };
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

  // Arrastrar (mover) o tirar de la esquina (tamaño)
  const onPointerDown = (e, mode) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode, x: e.clientX, y: e.clientY, start: { ...current } };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const k = previewScale * scale;
    const mx = (e.clientX - d.x) / k; const my = (e.clientY - d.y) / k;
    if (d.mode === 'move') setDraft({ ...d.start, dx: Math.round(d.start.dx + mx), dy: Math.round(d.start.dy + my) });
    else setDraft({ ...d.start, w: Math.max(20, Math.round(d.start.w + mx)), h: Math.max(12, Math.round(d.start.h + my)) });
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{ ...small, fontSize: '12px', color: colors.textMain }}>{t('sponsors.library')}</span>
          <button onClick={addSponsors} style={{ ...btnStyle(false), width: 'auto', padding: '8px 14px', fontSize: '10px' }}><Icon name="image" />{t('sponsors.addBtn')}</button>
          <span style={{ flex: 1 }} />
          <button onClick={toggleRotate} disabled={!sponsors.length} style={{ ...btnStyle(live.isVisible && live.rotate), width: 'auto', padding: '8px 14px', fontSize: '10px' }}>{live.isVisible && live.rotate ? t('sponsors.stopRotate') : t('sponsors.rotateAll')}</button>
          {live.isVisible && <button onClick={() => sendLive({ isVisible: false, sponsorId: null, rotate: false })} style={{ ...btnStyle(false), width: 'auto', padding: '8px 14px', fontSize: '10px', backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('sponsors.offAir')}</button>}
        </div>

        {!sponsors.length ? (
          <div style={{ textAlign: 'center', padding: '24px', color: colors.textMuted, fontStyle: 'italic' }}>{t('sponsors.empty')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
            {sponsors.map(s => {
              const on = live.isVisible && (live.rotate || live.sponsorId === s.id);
              return (
                <div key={s.id} style={{ border: `1px solid ${on ? colors.red : colors.border}`, borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: colors.bgInput }}>
                  <div style={{ height: '84px', backgroundColor: '#1b1b1b', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <SponsorMedia sponsor={s} />
                    {s.type === 'video' && <span style={{ position: 'absolute', top: '4px', left: '4px', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#000a', color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>VIDEO</span>}
                  </div>
                  <NameInput value={s.name} onCommit={(v) => renameSponsor(s.id, v)} inputStyle={inputStyle} />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => toggleOne(s.id)} style={{ ...btnStyle(on && !live.rotate), flex: 1, padding: '6px', fontSize: '10px' }}>{on && !live.rotate ? t('sponsors.offAir') : t('sponsors.onAir')}</button>
                    <button onClick={() => removeSponsor(s)} title={t('common.removeBtn')} style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><Icon name="close" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
              {ids.map(id => <option key={id} value={id}>{t(`graphics.${id}`)}{placements[id]?.ids?.length ? ` (${placements[id].ids.length})` : ''}</option>)}
            </select>
            <div style={small}>{t('sponsors.whichOnes')}</div>
            {!sponsors.length && <span style={{ fontSize: '11px', color: colors.textMuted }}>{t('sponsors.empty')}</span>}
            {sponsors.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMain, cursor: 'pointer' }}>
                <input type="checkbox" checked={current.ids.includes(s.id)} onChange={() => toggleSponsorIn(s.id)} style={{ cursor: 'pointer' }} />
                {s.name || s.file}
              </label>
            ))}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {numInput('dx', 'X')}{numInput('dy', 'Y')}{numInput('w', t('sponsors.width'))}{numInput('h', t('sponsors.height'))}
              {numInput('interval', t('sponsors.everySec'))}
            </div>
            <div style={small}>{t('sponsors.quickPlace')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {['above', 'below', 'left', 'right'].map(w => <button key={w} onClick={() => snapTo(w)} style={{ ...btnStyle(false), padding: '6px', fontSize: '10px' }}>{t(`sponsors.place_${w}`)}</button>)}
            </div>
            {saved && <button onClick={clearGraphic} style={{ ...btnStyle(false), padding: '7px', fontSize: '10px', backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('sponsors.clearGraphic')}</button>}
            <span style={{ fontSize: '10px', color: colors.textMuted }}>{t('sponsors.dragHint')}</span>
          </div>

          <div ref={areaRef} style={{ flex: 1, minWidth: '320px' }}>
            <div style={{ width: CW * previewScale, height: CH * previewScale, position: 'relative', overflow: 'hidden', boxShadow: '0 0 0 2px #555' }}>
              <div ref={stageRef} className="sp-stage" style={{ width: `${CW}px`, height: `${CH}px`, position: 'absolute', left: 0, top: 0, transform: `scale(${previewScale})`, transformOrigin: 'top left', backgroundColor: config.chromaColor || '#00FF00', fontFamily: config.fontFamily || 'Arial, sans-serif' }}>
                <style>{`@import url('${GOOGLE_FONTS_URL}'); .sp-stage * { transition: none !important; }`}</style>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <GraphicPreview noCover id={selected} config={previewConfig} positions={positions} drivers={drivers} sessionInfo={sessionInfo} />
                </div>
                <div
                  onPointerDown={(e) => onPointerDown(e, 'move')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                  style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height, boxSizing: 'border-box', border: `${Math.max(2, 2 / previewScale)}px dashed #ffcc00`, backgroundColor: current.ids.length ? 'transparent' : 'rgba(255,204,0,0.18)', cursor: 'grab', touchAction: 'none', zIndex: 500 }}
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
