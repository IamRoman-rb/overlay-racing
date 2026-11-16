// Biblioteca de la pestaña SPONSORS:
//   - Arrastrar archivos desde el Explorador (a la biblioteca o a un grupo) para cargarlos.
//   - Arrastrar las tarjetas para ordenarlas o pasarlas de grupo (el orden es el de la rotación).
//   - Grupos con nombre: se ordenan, se rotan al aire por separado y se pueden elegir enteros en las gráficas.
//   - ACTIVO / PAUSADO: los pausados no salen en las rotaciones ni en las gráficas (se pueden sacar al aire a mano).
import { useState } from 'react';
import Icon from '../components/Icon';
import { SponsorMedia } from '../components/SponsorSlot';
import { moveSponsor, sponsorActive } from '../utils/sponsors';

let electron = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { electron = window.require('electron'); } catch { /* fuera de Electron */ }
}
const ipcRenderer = electron ? electron.ipcRenderer : null;
const DRAG_TYPE = 'application/x-overlay-sponsor';
const CHECKER = 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 14px 14px';

// Ruta en disco de un archivo soltado (Electron 32+ ya no tiene file.path)
const pathOf = (file) => {
  try { if (electron && electron.webUtils) return electron.webUtils.getPathForFile(file); } catch { /* sigue */ }
  return file.path || '';
};
const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
const isCardDrag = (e) => Array.from(e.dataTransfer?.types || []).includes(DRAG_TYPE);

function NameInput({ value, onCommit, inputStyle, style }) {
  const [draft, setDraft] = useState(value || '');
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setDraft(value || ''); }
  return (
    <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (draft.trim() !== (value || '')) onCommit(draft.trim()); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      style={{ ...inputStyle, padding: '6px', fontSize: '11px', width: '100%', ...style }} />
  );
}

// Volumen de un video: se mueve libre y se guarda al soltar (no guarda la config en cada paso del control)
function VolumeControl({ value, onCommit, color }) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setDraft(value); }
  const commit = () => { if (draft !== value) onCommit(draft); };
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
      <input type="range" min="0" max="100" value={draft} onChange={(e) => setDraft(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit}
        style={{ flex: 1, minWidth: 0, width: '40px', cursor: 'pointer' }} />
      <span style={{ width: '30px', textAlign: 'right', fontSize: '10px', color }}>{draft}%</span>
    </span>
  );
}

export default function SponsorLibrary({ config, sponsors, groups, live, sendLive, onConfigChange, onEdit, onRemove, colors, inputStyle, btnStyle, t }) {
  const [dropTarget, setDropTarget] = useState(null);   // { kind: 'card' | 'group', id } donde se va a soltar
  const [fileOver, setFileOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(null);             // tarjeta que se puede arrastrar (se agarra de la manija o la miniatura)

  const saveSponsors = (list) => onConfigChange('sponsors', list);
  const update = (id, patch) => saveSponsors(sponsors.map(x => (x.id === id ? { ...x, ...patch } : x)));
  // Grupo del sponsor (si su grupo ya no existe, cuenta como sin grupo)
  const groupOf = (s) => (s.groupId && groups.some(g => g.id === s.groupId) ? s.groupId : null);

  // --- Carga de archivos (botón o arrastrados) ---
  const addToGroup = (added, groupId) => {
    if (!Array.isArray(added) || !added.length) return;
    const withGroup = added.map(s => (groupId ? { ...s, groupId } : s));
    // Al final del grupo donde se soltaron
    let list = [...sponsors, ...withGroup];
    withGroup.forEach(s => { list = moveSponsor(list, s.id, null, groupId || null); });
    saveSponsors(list);
  };
  const addWithDialog = async () => {
    if (!ipcRenderer) return;
    addToGroup(await ipcRenderer.invoke('add-sponsor-files'), null);
  };
  const dropFiles = async (e, groupId) => {
    const paths = Array.from(e.dataTransfer.files || []).map(pathOf).filter(Boolean);
    if (!paths.length || !ipcRenderer) return;
    setBusy(true);
    try { addToGroup(await ipcRenderer.invoke('add-sponsor-paths', paths), groupId); } finally { setBusy(false); }
  };

  // --- Arrastrar tarjetas / archivos ---
  const allowDrop = (e, target) => {
    if (!isFileDrag(e) && !isCardDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = isFileDrag(e) ? 'copy' : 'move';
    if (isFileDrag(e)) setFileOver(true);
    if (!dropTarget || dropTarget.kind !== target.kind || dropTarget.id !== target.id) setDropTarget(target);
  };
  const onDrop = (e, beforeId, groupId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null); setFileOver(false);
    if (isFileDrag(e) && e.dataTransfer.files?.length) { dropFiles(e, groupId); return; }
    const dragId = e.dataTransfer.getData(DRAG_TYPE);
    if (dragId) saveSponsors(moveSponsor(sponsors, dragId, beforeId, groupId));
  };
  const clearDrag = () => { setDropTarget(null); setFileOver(false); };

  // --- Grupos ---
  const saveGroups = (list) => onConfigChange('sponsorGroups', list);
  const addGroup = () => saveGroups([...groups, { id: `g_${Date.now().toString(36)}`, name: t('sponsors.groupDefault', { n: groups.length + 1 }) }]);
  const renameGroup = (id, name) => saveGroups(groups.map(g => (g.id === id ? { ...g, name: name || g.name } : g)));
  const moveGroup = (id, dir) => {
    const i = groups.findIndex(g => g.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= groups.length) return;
    const next = [...groups]; [next[i], next[j]] = [next[j], next[i]];
    saveGroups(next);
  };
  const deleteGroup = (g) => {
    if (!window.confirm(t('sponsors.confirmDeleteGroup', { name: g.name }))) return;
    const placements = config.sponsorPlacements && typeof config.sponsorPlacements === 'object' ? config.sponsorPlacements : {};
    const nextPlacements = {};
    Object.entries(placements).forEach(([gid, p]) => { nextPlacements[gid] = { ...p, groups: (p.groups || []).filter(x => x !== g.id) }; });
    onConfigChange({
      sponsorGroups: groups.filter(x => x.id !== g.id),
      sponsors: sponsors.map(s => { if (s.groupId !== g.id) return s; const c = { ...s }; delete c.groupId; return c; }),
      sponsorPlacements: nextPlacements
    });
    if (live.isVisible && live.rotate && live.groupId === g.id) sendLive({ isVisible: false, sponsorId: null, rotate: false });
  };

  // --- Al aire ---
  const off = { isVisible: false, sponsorId: null, rotate: false };
  const rotatingAll = live.isVisible && live.rotate && !live.groupId;
  const toggleRotateAll = () => sendLive(rotatingAll ? off : { isVisible: true, rotate: true, sponsorId: null });
  const toggleRotateGroup = (gid) => sendLive(live.isVisible && live.rotate && live.groupId === gid ? off : { isVisible: true, rotate: true, sponsorId: null, groupId: gid });
  const toggleOne = (id) => sendLive(live.isVisible && !live.rotate && live.sponsorId === id ? off : { isVisible: true, sponsorId: id, rotate: false });
  const onAirIn = (s) => live.isVisible && (live.rotate ? sponsorActive(s) && (!live.groupId || live.groupId === s.groupId) : live.sponsorId === s.id);

  const toggleActive = (s) => saveSponsors(sponsors.map(x => (x.id === s.id ? { ...x, active: !sponsorActive(x) } : x)));
  const setGroupActive = (gid, value) => saveSponsors(sponsors.map(x => (groupOf(x) === gid ? { ...x, active: value } : x)));

  const small = { fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const tinyBtn = { ...btnStyle(false), width: 'auto', padding: '4px 8px', fontSize: '10px' };

  const card = (s, n) => {
    const active = sponsorActive(s);
    const air = onAirIn(s);
    const target = dropTarget && dropTarget.kind === 'card' && dropTarget.id === s.id && !fileOver;
    return (
      <div key={s.id} draggable={armed === s.id}
        onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, s.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { clearDrag(); setArmed(null); }}
        onPointerUp={() => setArmed(null)}
        onDragOver={(e) => allowDrop(e, { kind: 'card', id: s.id })}
        onDrop={(e) => onDrop(e, s.id, groupOf(s))}
        style={{
          border: `1px solid ${air ? colors.red : colors.border}`, borderLeft: `4px solid ${target ? '#ffcc00' : (air ? colors.red : colors.border)}`,
          borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: colors.bgInput
        }}>
        <div onPointerDown={() => setArmed(s.id)} title={t('sponsors.dragCard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'grab' }}>
          <Icon name="drag_indicator" style={{ color: colors.textMuted }} />
          <span style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textMuted }}>#{n}</span>
          <span style={{ flex: 1 }} />
          <label title={t('sponsors.activeTitle')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 'bold', color: active ? '#2ecc71' : colors.textMuted, cursor: 'pointer' }}>
            <input type="checkbox" checked={active} onChange={() => toggleActive(s)} style={{ cursor: 'pointer' }} />
            {active ? t('sponsors.active') : t('sponsors.paused')}
          </label>
        </div>
        <div onPointerDown={() => setArmed(s.id)} style={{ height: '84px', background: CHECKER, borderRadius: '4px', overflow: 'hidden', position: 'relative', cursor: 'grab', opacity: active ? 1 : 0.35 }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}><SponsorMedia sponsor={s} /></div>
          {s.type === 'video' && <span style={{ position: 'absolute', top: '4px', left: '4px', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#000a', color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>VIDEO</span>}
          {air && <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '9px', fontWeight: 'bold', backgroundColor: colors.red, color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>{t('sponsors.onAirBadge')}</span>}
        </div>
        <NameInput value={s.name} onCommit={(v) => saveSponsors(sponsors.map(x => (x.id === s.id ? { ...x, name: v } : x)))} inputStyle={inputStyle} />
        {s.type === 'video' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '22px' }}>
            <label title={t('sponsors.soundTitle')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 'bold', color: s.sound ? colors.yellow : colors.textMuted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={s.sound === true} onChange={(e) => update(s.id, { sound: e.target.checked })} style={{ cursor: 'pointer' }} />
              {s.sound ? t('sponsors.withSound') : t('sponsors.muted')}
            </label>
            {s.sound && <VolumeControl value={Number.isFinite(Number(s.volume)) ? Number(s.volume) : 100} onCommit={(v) => update(s.id, { volume: v })} color={colors.textMain} />}
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => toggleOne(s.id)} style={{ ...btnStyle(live.isVisible && !live.rotate && live.sponsorId === s.id), flex: 1, padding: '6px', fontSize: '10px' }}>{live.isVisible && !live.rotate && live.sponsorId === s.id ? t('sponsors.offAir') : t('sponsors.onAir')}</button>
          <button onClick={() => onEdit(s.id)} title={t('sponsors.editBtn')} style={tinyBtn}><Icon name="edit" /></button>
          <button onClick={() => onRemove(s)} title={t('common.removeBtn')} style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><Icon name="close" /></button>
        </div>
      </div>
    );
  };

  // Sección de un grupo (g = null: los que no tienen grupo)
  const section = (g, index) => {
    const gid = g ? g.id : null;
    const items = sponsors.filter(s => groupOf(s) === gid);
    const activeCount = items.filter(sponsorActive).length;
    const target = dropTarget && dropTarget.kind === 'group' && dropTarget.id === (gid || '_none');
    const rotating = live.isVisible && live.rotate && live.groupId === gid && !!gid;
    return (
      <div key={gid || '_none'}
        onDragOver={(e) => allowDrop(e, { kind: 'group', id: gid || '_none' })}
        onDrop={(e) => onDrop(e, null, gid)}
        style={{ border: `1px dashed ${target ? '#ffcc00' : colors.border}`, borderRadius: '8px', padding: '10px', marginBottom: '12px', backgroundColor: target ? 'rgba(255,204,0,0.05)' : 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {g ? <NameInput value={g.name} onCommit={(v) => renameGroup(g.id, v)} inputStyle={inputStyle} style={{ width: '200px', fontWeight: 'bold', fontSize: '12px' }} />
            : <span style={{ ...small, fontSize: '12px', color: colors.textMain }}>{t('sponsors.ungrouped')}</span>}
          <span style={small}>{t('sponsors.groupCount', { n: items.length, a: activeCount })}</span>
          <span style={{ flex: 1 }} />
          {items.length > 0 && (
            <>
              <button onClick={() => setGroupActive(gid, true)} style={tinyBtn}>{t('sponsors.allActive')}</button>
              <button onClick={() => setGroupActive(gid, false)} style={tinyBtn}>{t('sponsors.allPaused')}</button>
            </>
          )}
          {g && <button onClick={() => toggleRotateGroup(gid)} disabled={!activeCount} style={{ ...btnStyle(rotating), width: 'auto', padding: '5px 10px', fontSize: '10px' }}>{rotating ? t('sponsors.stopRotate') : t('sponsors.rotateGroup')}</button>}
          {g && <button onClick={() => moveGroup(gid, -1)} disabled={index === 0} title={t('sponsors.groupUp')} style={tinyBtn}><Icon name="arrow_drop_up" /></button>}
          {g && <button onClick={() => moveGroup(gid, 1)} disabled={index === groups.length - 1} title={t('sponsors.groupDown')} style={tinyBtn}><Icon name="arrow_drop_down" /></button>}
          {g && <button onClick={() => deleteGroup(g)} title={t('sponsors.deleteGroup')} style={{ ...tinyBtn, backgroundColor: '#c0392b', color: '#fff', border: 'none' }}><Icon name="delete" /></button>}
        </div>
        {items.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}>
            {items.map((s, i) => card(s, i + 1))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', color: colors.textMuted, fontSize: '11px', fontStyle: 'italic' }}>{t('sponsors.groupEmpty')}</div>
        )}
      </div>
    );
  };

  const showUngrouped = !groups.length || sponsors.some(s => !groupOf(s));

  return (
    <div
      onDragOver={(e) => { if (isFileDrag(e)) { e.preventDefault(); setFileOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) clearDrag(); }}
      onDrop={(e) => { if (isFileDrag(e)) onDrop(e, null, null); }}
      style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ ...small, fontSize: '12px', color: colors.textMain }}>{t('sponsors.library')}</span>
        <button onClick={addWithDialog} style={{ ...btnStyle(false), width: 'auto', padding: '8px 14px', fontSize: '10px' }}><Icon name="image" />{t('sponsors.addBtn')}</button>
        <button onClick={addGroup} style={{ ...btnStyle(false), width: 'auto', padding: '8px 14px', fontSize: '10px' }}><Icon name="folder" />{t('sponsors.newGroup')}</button>
        <span style={{ flex: 1 }} />
        <button onClick={toggleRotateAll} disabled={!sponsors.some(sponsorActive)} style={{ ...btnStyle(rotatingAll), width: 'auto', padding: '8px 14px', fontSize: '10px' }}>{rotatingAll ? t('sponsors.stopRotate') : t('sponsors.rotateAll')}</button>
        {live.isVisible && <button onClick={() => sendLive(off)} style={{ ...btnStyle(false), width: 'auto', padding: '8px 14px', fontSize: '10px', backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('sponsors.offAir')}</button>}
      </div>
      <p style={{ fontSize: '11px', color: colors.textMuted, margin: '0 0 12px' }}>{t('sponsors.libraryHint')}</p>

      {groups.map((g, i) => section(g, i))}
      {showUngrouped && section(null, -1)}

      {(fileOver || busy) && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '8px', border: '3px dashed #ffcc00', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffcc00' }}>{busy ? t('sponsors.copying') : t('sponsors.dropHere')}</span>
        </div>
      )}
    </div>
  );
}
