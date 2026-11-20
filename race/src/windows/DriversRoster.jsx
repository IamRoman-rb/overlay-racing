// Pestaña PILOTOS: completar o corregir los datos de cada piloto que la fuente no informa (o informa mal):
// número a mostrar, nombre, país (bandera), marca del auto y equipo. Se guarda por el número que informa la fuente y se aplica
// a todas las gráficas. También se pueden cargar pilotos antes de que aparezcan en el cronometraje.
import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { BRANDS, brandName, brandSrc } from '../utils/brands';
import { photoUrl } from '../utils/elite';
import RosterLists from './RosterLists';
import { countryOptions, countryName, countryFromText } from '../utils/countries';
import { FlagChip } from '../components/CountryFlag';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch { /* fuera de Electron */ }
}

function Cell({ value, placeholder, onCommit, inputStyle, width, list }) {
  const [draft, setDraft] = useState(value ?? '');
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setDraft(value ?? ''); }
  const commit = () => { if (String(draft) !== String(value ?? '')) onCommit(String(draft).trim()); };
  return (
    <input value={draft} placeholder={placeholder} list={list} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }}
      style={{ ...inputStyle, padding: '6px', fontSize: '11px', textTransform: 'none', width: width || '100%' }} />
  );
}

const PhotoThumb = ({ number, config }) => {
  const [failed, setFailed] = useState(null);
  const src = number && config?.photosPath ? photoUrl(number) : null;
  if (!src || failed === src) return <span style={{ display: 'inline-block', width: '28px' }} />;
  return <img src={src} alt="" onError={() => setFailed(src)} style={{ height: '30px', width: '28px', objectFit: 'cover', objectPosition: 'top', borderRadius: '3px' }} />;
};

export default function DriversRoster({ drivers, config, colors, inputStyle, btnStyle, t, onConfigChange }) {
  const [roster, setRoster] = useState({});
  const [newNumber, setNewNumber] = useState('');
  const [filter, setFilter] = useState('');
  const [bulkCountry, setBulkCountry] = useState('');
  const [bulkBrand, setBulkBrand] = useState('');
  const countries = useMemo(() => countryOptions(), []);

  useEffect(() => {
    if (!ipcRenderer) return undefined;
    ipcRenderer.invoke('get-roster').then(r => { if (r) setRoster(r); }).catch(() => {});
    const onUpdate = (e, r) => { if (r) setRoster(r); };
    ipcRenderer.on('update-roster', onUpdate);
    return () => ipcRenderer.removeListener('update-roster', onUpdate);
  }, []);

  const setEntry = async (number, patch) => {
    if (!ipcRenderer) return;
    const next = await ipcRenderer.invoke('set-roster-entry', { number, patch });
    if (next) setRoster(next);
  };
  const removeEntry = async (number) => {
    if (!ipcRenderer) return;
    if (!window.confirm(t('pilotos.confirmRemove', { n: number }))) return;
    const next = await ipcRenderer.invoke('delete-roster-entry', number);
    if (next) setRoster(next);
  };
  // Vaciar la tabla: los que no corren hoy, o todo. Lo recordado por número (marca y bandera) se conserva.
  const liveNumbers = useMemo(() => new Set((drivers || []).map(d => String(d.srcNumber || d.number))), [drivers]);
  const loadedCount = Object.keys(roster).length;
  const absentCount = Object.keys(roster).filter(n => !liveNumbers.has(n)).length;
  const clearRoster = async (mode) => {
    if (!ipcRenderer) return;
    const n = mode === 'absent' ? absentCount : loadedCount;
    if (!n || !window.confirm(t(mode === 'absent' ? 'pilotos.clearAbsentConfirm' : 'pilotos.clearAllConfirm', { n }))) return;
    const next = await ipcRenderer.invoke('clear-roster', mode);
    if (next) setRoster(next);
  };
  const addDriver = () => {
    const num = newNumber.trim();
    if (!num) return;
    setEntry(num, { manual: true, number: '' });
    setNewNumber('');
  };

  // Marca escrita (nombre o slug) -> slug; vacío = sin marca elegida a mano
  const toSlug = (text) => {
    const v = String(text || '').trim().toLowerCase();
    if (!v) return '';
    const hit = BRANDS.find(b => b.name.toLowerCase() === v || b.slug === v);
    return hit ? hit.slug : null;
  };

  // Pilotos en vivo (por número de la fuente) + los cargados a mano que todavía no aparecen
  const rows = useMemo(() => {
    const live = (drivers || []).map(d => ({ src: String(d.srcNumber || d.number), d }));
    const liveSet = new Set(live.map(r => r.src));
    const extra = Object.keys(roster).filter(n => !liveSet.has(n)).map(n => ({ src: n, d: null }));
    const all = [...live, ...extra];
    const f = filter.trim().toLowerCase();
    return f ? all.filter(r => `${r.src} ${(r.d && r.d.name) || ''} ${(roster[r.src] && roster[r.src].name) || ''}`.toLowerCase().includes(f)) : all;
  }, [drivers, roster, filter]);

  // Mismo país o misma marca para todos los pilotos de la lista (los que se ven, respetando la búsqueda)
  const applyToAll = async (patch, label) => {
    if (!ipcRenderer || !rows.length) return;
    if (!window.confirm(t('pilotos.applyAllConfirm', { what: label, n: rows.length }))) return;
    const next = await ipcRenderer.invoke('set-roster-all', { numbers: rows.map(r => r.src), patch });
    if (next) setRoster(next);
  };
  const applyCountryAll = () => {
    const code = countryFromText(bulkCountry);
    if (code === null) { alert(t('pilotos.countryUnknown', { name: bulkCountry })); return; }
    applyToAll({ country: code }, code ? countryName(code) : t('pilotos.noCountry'));
  };
  const applyBrandAll = () => {
    const slug = toSlug(bulkBrand);
    if (slug === null) { alert(t('pilotos.brandUnknown', { name: bulkBrand })); return; }
    applyToAll({ brand: slug }, slug ? brandName(slug) : t('pilotos.noBrand'));
  };


  const cell = { padding: '6px 8px', borderBottom: `1px solid ${colors.border}`, verticalAlign: 'middle' };

  return (
    <div style={{ padding: '30px', flex: 1, backgroundColor: colors.bgApp, overflowY: 'auto' }}>
      <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>{t('pilotos.title')}</h2>
      <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '18px', maxWidth: '900px' }}>{t('pilotos.description')}</p>

      {/* Color del número tomado del traje en la foto de cada piloto (todas las gráficas) */}
      <div style={{ backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', maxWidth: '900px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: colors.textMain, cursor: 'pointer' }}>
          <input type="checkbox" checked={config?.numberColorsFromPhotos === true} onChange={(e) => onConfigChange && onConfigChange('numberColorsFromPhotos', e.target.checked)} style={{ cursor: 'pointer' }} />
          {t('pilotos.suitColors')}
        </label>
        <div style={{ fontSize: '11px', color: config?.photosPath ? colors.textMuted : '#e67e22', marginTop: '6px' }}>{config?.photosPath ? t('pilotos.suitColorsHint') : t('pilotos.suitColorsNoFolder')}</div>
      </div>

      <RosterLists roster={roster} drivers={drivers} config={config} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} t={t} onConfigChange={onConfigChange} />

      <datalist id="brandsList">{BRANDS.map(b => <option key={b.slug} value={b.name} />)}</datalist>
      <datalist id="countriesList">{countries.map(c => <option key={c.code} value={c.name} />)}</datalist>

      {/* APLICAR A TODOS: el mismo país (bandera) o la misma marca para todos los pilotos de la lista */}
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', maxWidth: '900px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: colors.textMuted }}>{t('pilotos.applyAllTitle')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FlagChip code={countryFromText(bulkCountry) || ''} height={16} />
          <input value={bulkCountry} onChange={(e) => setBulkCountry(e.target.value)} list="countriesList" placeholder={t('pilotos.countryPlaceholder')} style={{ ...inputStyle, width: '170px', padding: '7px', fontSize: '11px', textTransform: 'none' }} />
          <button onClick={applyCountryAll} style={{ ...btnStyle(false), width: 'auto', padding: '7px 10px', fontSize: '10px' }}><Icon name="flag" />{t('pilotos.applyCountryAll')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '30px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a2a', borderRadius: '3px' }}>
            {toSlug(bulkBrand) && <img src={brandSrc(toSlug(bulkBrand))} alt="" style={{ maxHeight: '18px', maxWidth: '28px', objectFit: 'contain' }} />}
          </span>
          <input value={bulkBrand} onChange={(e) => setBulkBrand(e.target.value)} list="brandsList" placeholder={t('pilotos.brandPlaceholder')} style={{ ...inputStyle, width: '170px', padding: '7px', fontSize: '11px', textTransform: 'none' }} />
          <button onClick={applyBrandAll} style={{ ...btnStyle(false), width: 'auto', padding: '7px 10px', fontSize: '10px' }}><Icon name="directions_car" />{t('pilotos.applyBrandAll')}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
        <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addDriver(); }} placeholder={t('pilotos.newNumber')} style={{ ...inputStyle, width: '120px', padding: '9px' }} />
        <button onClick={addDriver} style={{ ...btnStyle(false), width: 'auto', padding: '9px 14px', fontSize: '10px' }}><Icon name="check" />{t('pilotos.addBtn')}</button>
        <button onClick={() => clearRoster('absent')} disabled={!absentCount} title={t('pilotos.clearAbsentTitle')}
          style={{ ...btnStyle(false), width: 'auto', padding: '9px 12px', fontSize: '10px', opacity: absentCount ? 1 : 0.5 }}><Icon name="close" />{t('pilotos.clearAbsent', { n: absentCount })}</button>
        <button onClick={() => clearRoster('all')} disabled={!loadedCount} title={t('pilotos.clearAllTitle')}
          style={{ ...btnStyle(false), width: 'auto', padding: '9px 12px', fontSize: '10px', backgroundColor: loadedCount ? '#c0392b' : undefined, color: loadedCount ? '#fff' : undefined, opacity: loadedCount ? 1 : 0.5 }}><Icon name="delete" />{t('pilotos.clearAll', { n: loadedCount })}</button>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('common.searchPlaceholder')} style={{ ...inputStyle, width: '220px', padding: '9px', marginLeft: 'auto', textTransform: 'none' }} />
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: colors.textMuted, fontStyle: 'italic', backgroundColor: colors.bgPanel, borderRadius: '6px' }}>{t('pilotos.empty')}</div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: colors.bgPanel, borderRadius: '6px', border: `1px solid ${colors.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: colors.bgInput, color: colors.textMuted, textAlign: 'left' }}>
                <th style={cell}>{t('pilotos.colPhoto')}</th>
                <th style={cell}>{t('pilotos.colSource')}</th>
                <th style={cell}>{t('pilotos.colNumber')}</th>
                <th style={cell}>{t('pilotos.colName')}</th>
                <th style={cell}>{t('pilotos.colCountry')}</th>
                <th style={cell}>{t('pilotos.colBrand')}</th>
                <th style={cell}>{t('pilotos.colTeam')}</th>
                <th style={cell}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ src, d }) => {
                const r = roster[src] || {};
                const sourceName = d ? ((d.src && d.src.name) || d.name) : '';
                const brand = (d && d.brand) || r.brand || '';
                const manualBrand = !!r.brand;
                const country = r.country || (d && d.country) || '';
                return (
                  <tr key={src} style={{ backgroundColor: roster[src] ? 'rgba(255,204,0,0.05)' : 'transparent' }}>
                    <td style={cell}><PhotoThumb number={(d && d.number) || r.number || src} config={config} /></td>
                    <td style={{ ...cell, fontWeight: 'bold', color: d ? colors.textMain : colors.textMuted }}>#{src}{!d && <div style={{ fontSize: '9px', fontWeight: 'normal' }}>{t('pilotos.notInData')}</div>}</td>
                    <td style={cell}><Cell value={r.number || ''} placeholder={src} onCommit={(v) => setEntry(src, { number: v })} inputStyle={inputStyle} width="70px" /></td>
                    <td style={cell}><Cell value={r.name || ''} placeholder={sourceName || t('pilotos.namePlaceholder')} onCommit={(v) => setEntry(src, { name: v })} inputStyle={inputStyle} /></td>
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '28px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{country ? <FlagChip code={country} height={16} /> : null}</span>
                        <Cell value={r.country ? countryName(r.country) : ''} placeholder={country ? `${countryName(country)} (${t(d && d.countryFrom === 'memory' ? 'pilotos.remembered' : 'pilotos.detected')})` : t('pilotos.countryPlaceholder')} list="countriesList" width="150px"
                          onCommit={(v) => { const code = countryFromText(v); if (code === null) { alert(t('pilotos.countryUnknown', { name: v })); return; } setEntry(src, { country: code }); }} inputStyle={inputStyle} />
                      </div>
                    </td>
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '34px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a2a', borderRadius: '3px', flexShrink: 0 }}>
                          {brand && <img src={brandSrc(brand)} alt="" style={{ maxHeight: '20px', maxWidth: '30px', objectFit: 'contain' }} />}
                        </span>
                        <Cell value={manualBrand ? brandName(r.brand) : ''} placeholder={brand ? `${brandName(brand)} (${t(d && d.brandFrom === 'memory' ? 'pilotos.remembered' : 'pilotos.detected')})` : t('pilotos.brandPlaceholder')} list="brandsList"
                          onCommit={(v) => { const slug = toSlug(v); if (slug === null) { alert(t('pilotos.brandUnknown', { name: v })); return; } setEntry(src, { brand: slug }); }} inputStyle={inputStyle} />
                      </div>
                    </td>
                    <td style={cell}><Cell value={r.team || ''} placeholder={(d && d.team) || t('pilotos.teamPlaceholder')} onCommit={(v) => setEntry(src, { team: v })} inputStyle={inputStyle} /></td>
                    <td style={{ ...cell, textAlign: 'right' }}>
                      {roster[src] && (
                        <button onClick={() => removeEntry(src)} title={t('pilotos.removeTitle')} style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><Icon name="close" /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: colors.textMuted, fontSize: '11px', marginTop: '10px', maxWidth: '900px' }}>{t('pilotos.footer')}</p>
    </div>
  );
}
