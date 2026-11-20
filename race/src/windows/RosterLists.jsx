// Pestaña PILOTOS: listados guardados (marcas, números, nombres y equipos de cada piloto) para volver a cargarlos cuando
// la categoría corre otra vez, y la memoria automática de la marca de cada piloto por su nombre.
import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import RosterCompare from './RosterCompare';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch { /* fuera de Electron */ }
}

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export default function RosterLists({ roster, drivers, config, colors, inputStyle, btnStyle, t, onConfigChange }) {
  const [lists, setLists] = useState([]);
  const [numberMemory, setNumberMemory] = useState({});
  // Qué se está comparando con lo que corre hoy: 'memory' (lo recordado por número) o el id de un listado guardado
  const [viewing, setViewing] = useState(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [name, setName] = useState('');
  const category = String(config?.categoryName || '').trim();

  useEffect(() => {
    if (!ipcRenderer) return undefined;
    ipcRenderer.invoke('get-roster-lists').then(l => { if (Array.isArray(l)) setLists(l); }).catch(() => {});
    ipcRenderer.invoke('get-brand-memory').then(n => setMemoryCount(Number(n) || 0)).catch(() => {});
    ipcRenderer.invoke('get-number-memory').then(m => { if (m && typeof m === 'object') setNumberMemory(m); }).catch(() => {});
    const onNumbers = (e, m) => { if (m && typeof m === 'object') setNumberMemory(m); };
    ipcRenderer.on('update-number-memory', onNumbers);
    const onLists = (e, l) => { if (Array.isArray(l)) setLists(l); };
    const onMemory = (e, n) => setMemoryCount(Number(n) || 0);
    ipcRenderer.on('update-roster-lists', onLists);
    ipcRenderer.on('update-brand-memory', onMemory);
    return () => { ipcRenderer.removeListener('update-roster-lists', onLists); ipcRenderer.removeListener('update-brand-memory', onMemory); ipcRenderer.removeListener('update-number-memory', onNumbers); };
  }, []);

  const rosterCount = Object.keys(roster || {}).length;
  const listName = name.trim() || category;

  const save = async () => {
    if (!ipcRenderer || !listName) return;
    if (!rosterCount) { alert(t('pilotos.listsNothing')); return; }
    if (lists.some(l => sameName(l.name, listName)) && !window.confirm(t('pilotos.listsConfirmReplace', { name: listName }))) return;
    const next = await ipcRenderer.invoke('save-roster-list', { name: listName });
    if (Array.isArray(next)) setLists(next);
    setName('');
  };
  const load = async (list, mode) => {
    if (!ipcRenderer) return;
    if (mode === 'replace' && rosterCount && !window.confirm(t('pilotos.listsConfirmLoad', { name: list.name }))) return;
    await ipcRenderer.invoke('load-roster-list', { id: list.id, mode });
  };
  const remove = async (list) => {
    if (!ipcRenderer || !window.confirm(t('pilotos.listsConfirmDelete', { name: list.name }))) return;
    const next = await ipcRenderer.invoke('delete-roster-list', list.id);
    if (Array.isArray(next)) setLists(next);
  };
  const forget = async () => {
    if (!ipcRenderer || !window.confirm(t('pilotos.memoryConfirmForget', { n: memoryCount }))) return;
    setMemoryCount(await ipcRenderer.invoke('forget-brand-memory'));
    setNumberMemory({});
  };
  const forgetNumber = async (num) => {
    if (!ipcRenderer || !window.confirm(t('pilotos.compareForgetConfirm', { n: num }))) return;
    const next = await ipcRenderer.invoke('forget-number-memory', num);
    if (next && typeof next === 'object') setNumberMemory(next);
  };
  // Un número con marca o bandera cargada a mano hoy se vuelve a recordar solo: para olvidarlo hay que borrar el dato en la tabla
  const canForget = (num) => !(roster && roster[num] && (roster[num].brand || roster[num].country));
  const toggle = (id) => setViewing(v => (v === id ? null : id));
  // Lo de un listado guardado, en el mismo formato que la memoria: { número: { name, brand, country } }
  const listEntries = (l) => Object.fromEntries(Object.entries(l.roster || {}).map(([num, r]) => [num, { name: r.name || (l.names && l.names[num]) || '', brand: r.brand, country: r.country }]));
  const numberCount = Object.keys(numberMemory).length;

  const box = { backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', maxWidth: '900px' };
  const small = (active = false) => ({ ...btnStyle(active), width: 'auto', padding: '6px 10px', fontSize: '10px' });
  const fmtDate = (ms) => { try { return new Date(ms).toLocaleDateString(); } catch { return ''; } };
  // Listado con el mismo nombre que la categoría actual: se ofrece cargarlo primero
  const sorted = [...lists].sort((a, b) => (sameName(b.name, category) ? 1 : 0) - (sameName(a.name, category) ? 1 : 0));

  return (
    <div style={box}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMain, marginBottom: '6px' }}>{t('pilotos.listsTitle')}</div>
      <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '10px' }}>{t('pilotos.listsHint')}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: colors.textMain, cursor: 'pointer' }}>
          <input type="checkbox" checked={config?.rememberBrands !== false} onChange={(e) => onConfigChange && onConfigChange('rememberBrands', e.target.checked)} style={{ cursor: 'pointer' }} />
          {t('pilotos.memoryLabel')}
        </label>
        <span style={{ fontSize: '11px', color: colors.textMuted }}>{t('pilotos.memoryCount', { n: memoryCount })}</span>
        {memoryCount > 0 && <button onClick={forget} style={{ ...small(), marginLeft: 'auto' }}>{t('pilotos.memoryForget')}</button>}
      </div>
      <div style={{ fontSize: '11px', color: colors.textMuted, margin: '4px 0 8px 22px' }}>{t('pilotos.memoryHint')}</div>
      <div style={{ margin: '0 0 12px 22px' }}>
        <button onClick={() => toggle('memory')} disabled={!numberCount} style={{ ...small(viewing === 'memory'), opacity: numberCount ? 1 : 0.5 }}><Icon name="visibility" />{t(viewing === 'memory' ? 'pilotos.compareHide' : 'pilotos.compareMemory', { n: numberCount })}</button>
        {viewing === 'memory' && <RosterCompare entries={numberMemory} drivers={drivers} colors={colors} t={t} onForget={forgetNumber} canForget={canForget} />}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: lists.length ? '10px' : 0 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          placeholder={category || t('pilotos.listsNamePlaceholder')} style={{ ...inputStyle, width: '260px', padding: '8px', textTransform: 'none' }} />
        <button onClick={save} disabled={!listName} style={{ ...small(), opacity: listName ? 1 : 0.5 }}><Icon name="save" />{t('pilotos.listsSave', { n: rosterCount })}</button>
      </div>

      {sorted.map(l => {
        const n = Object.keys(l.roster || {}).length;
        const current = sameName(l.name, category);
        return (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderTop: `1px solid ${colors.border}`, backgroundColor: current ? 'rgba(255,204,0,0.07)' : 'transparent', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMain }}>{l.name}{current && <span style={{ marginLeft: '8px', fontSize: '9px', color: colors.yellow }}>{t('pilotos.listsCurrent')}</span>}</div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>{t('pilotos.listsInfo', { n, date: fmtDate(l.savedAt) })}</div>
            </div>
            <button onClick={() => toggle(l.id)} title={t('pilotos.compareListTitle')} style={small(viewing === l.id)}><Icon name="visibility" />{t(viewing === l.id ? 'pilotos.compareHideShort' : 'pilotos.compareView')}</button>
            <button onClick={() => load(l, 'replace')} title={t('pilotos.listsLoadTitle')} style={small(current)}>{t('pilotos.listsLoad')}</button>
            <button onClick={() => load(l, 'merge')} title={t('pilotos.listsMergeTitle')} style={small()}>{t('pilotos.listsMerge')}</button>
            <button onClick={() => remove(l)} title={t('pilotos.listsDelete')} style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 8px', cursor: 'pointer' }}><Icon name="close" /></button>
            {viewing === l.id && <div style={{ flexBasis: '100%' }}><RosterCompare entries={listEntries(l)} drivers={drivers} colors={colors} t={t} /></div>}
          </div>
        );
      })}
    </div>
  );
}
