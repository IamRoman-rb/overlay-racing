// src/windows/VoteHistory.jsx
// Guardado de las votaciones por categoría y gráfica del piloto más votado de cada una.
import { useState, useEffect, useMemo } from 'react';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch (e) {}
}

const ALL_DAYS = 'all';

export default function VoteHistory({ votes, drivers, sessionInfo, language, colors, inputStyle, btnStyle, t }) {
  const [history, setHistory] = useState([]);
  const [categoryEdit, setCategoryEdit] = useState(null); // null = todavía sin tocar a mano
  const [resetAfter, setResetAfter] = useState(true);
  const [selectedDay, setSelectedDay] = useState(ALL_DAYS);
  const [selectedId, setSelectedId] = useState(null);
  const [flash, setFlash] = useState(null); // { ok, text }

  useEffect(() => {
    if (!ipcRenderer) return;
    ipcRenderer.invoke('get-vote-history').then(list => {
      if (Array.isArray(list)) {
        setHistory(list);
        const days = [...new Set(list.map(r => r.day))].sort();
        if (days.length > 0) setSelectedDay(days[days.length - 1]);
      }
    }).catch(() => { });
  }, []);

  // Mientras no lo toquen a mano, el nombre de la categoría sigue al nombre de la sesión que se está viendo.
  const category = categoryEdit ?? (sessionInfo?.name || '');

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  const days = useMemo(() => [...new Set(history.map(r => r.day))].sort().reverse(), [history]);
  const formatDay = (day) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(language || 'es', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const visibleRecords = useMemo(() => {
    const list = selectedDay === ALL_DAYS ? history : history.filter(r => r.day === selectedDay);
    return [...list].sort((a, b) => (a.day === b.day ? a.category.localeCompare(b.category) : (a.day < b.day ? 1 : -1)));
  }, [history, selectedDay]);

  const selectedRecord = history.find(r => r.id === selectedId) || null;

  const showFlash = (ok, text) => {
    setFlash({ ok, text });
    setTimeout(() => setFlash(null), 4000);
  };

  const handleSave = async () => {
    if (!ipcRenderer) return;
    const name = category.trim();
    if (!name) return showFlash(false, t('votaciones.saveNoCategory'));
    if (totalVotes === 0) return showFlash(false, t('votaciones.saveNoVotes'));

    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const exists = history.some(r => r.day === todayStr && r.category.trim().toLowerCase() === name.toLowerCase());
    if (exists && !window.confirm(t('votaciones.confirmReplace', { category: name }))) return;

    const res = await ipcRenderer.invoke('save-vote-record', {
      category: name,
      drivers: drivers.map(d => ({ number: d.number, name: d.name })),
      resetAfter
    });
    if (res?.ok) {
      setHistory(res.history);
      setSelectedDay(res.record.day);
      setSelectedId(res.record.id);
      setCategoryEdit(null); // la próxima categoría vuelve a tomar el nombre de la sesión
      showFlash(true, t('votaciones.saveOk', { category: name }));
    } else {
      showFlash(false, t(res?.reason === 'NO_VOTES' ? 'votaciones.saveNoVotes' : 'votaciones.saveError'));
    }
  };

  const handleDelete = async (record) => {
    if (!ipcRenderer) return;
    if (!window.confirm(t('votaciones.confirmDelete', { category: record.category }))) return;
    const list = await ipcRenderer.invoke('delete-vote-record', record.id);
    setHistory(Array.isArray(list) ? list : []);
    if (selectedId === record.id) setSelectedId(null);
  };

  const driverLabel = (r) => `#${r.number}${r.name ? ` ${r.name}` : ''}`;
  const pct = (votesCount, total) => (total > 0 ? Math.round((votesCount / total) * 100) : 0);

  const boxStyle = { backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '18px 20px', marginBottom: '25px' };
  const labelStyle = { fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'block' };

  return (
    <div>
      {/* GUARDAR LA VOTACIÓN ACTUAL */}
      <div style={boxStyle}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: colors.yellow, marginBottom: '6px' }}>{t('votaciones.saveTitle')}</div>
        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '14px' }}>{t('votaciones.saveDescription')}</div>
        <label style={labelStyle}>{t('votaciones.categoryLabel')}</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={category}
            onChange={(e) => setCategoryEdit(e.target.value)}
            placeholder={t('votaciones.categoryPlaceholder')}
            style={{ ...inputStyle, flex: '1 1 260px', width: 'auto', padding: '11px 10px' }}
          />
          <button
            onClick={handleSave}
            disabled={totalVotes === 0}
            style={{ ...btnStyle(totalVotes > 0), width: 'auto', padding: '12px 22px', opacity: totalVotes > 0 ? 1 : 0.5, cursor: totalVotes > 0 ? 'pointer' : 'not-allowed' }}
          >
            {t('votaciones.saveBtn')}
          </button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: colors.textMain, cursor: 'pointer' }}>
          <input type="checkbox" checked={resetAfter} onChange={(e) => setResetAfter(e.target.checked)} />
          {t('votaciones.resetAfterSave')}
        </label>
        {flash && (
          <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 'bold', color: flash.ok ? colors.green : colors.red }}>{flash.text}</div>
        )}
      </div>

      {/* GRÁFICA: PILOTO MÁS VOTADO POR CATEGORÍA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: colors.yellow }}>{t('votaciones.savedTitle')}</div>
        {history.length > 0 && (
          <select
            value={selectedDay}
            onChange={(e) => { setSelectedDay(e.target.value); setSelectedId(null); }}
            style={{ ...inputStyle, width: 'auto', minWidth: '220px' }}
          >
            <option value={ALL_DAYS}>{t('votaciones.allDays')}</option>
            {days.map(day => <option key={day} value={day}>{formatDay(day)}</option>)}
          </select>
        )}
      </div>

      {visibleRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: colors.textMuted, fontStyle: 'italic', border: `1px dashed ${colors.border}`, borderRadius: '8px' }}>
          {t('votaciones.savedEmpty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: colors.textMuted }}>{t('votaciones.chartHint')}</div>
          {visibleRecords.map(record => {
            const winner = record.results[0];
            const share = pct(winner.votes, record.totalVotes);
            const isSelected = record.id === selectedId;
            return (
              <div
                key={record.id}
                onClick={() => setSelectedId(isSelected ? null : record.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
                  backgroundColor: colors.bgPanel, padding: '12px 16px', borderRadius: '8px',
                  border: `1px solid ${isSelected ? colors.yellow : colors.border}`
                }}
              >
                <div style={{ width: '200px', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.category}>{record.category}</div>
                  {selectedDay === ALL_DAYS && <div style={{ fontSize: '10px', color: colors.textMuted }}>{formatDay(record.day)}</div>}
                </div>
                <div style={{ flex: 1, position: 'relative', height: '28px', backgroundColor: colors.bgInput, borderRadius: '14px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                  <div style={{ width: `${share}%`, height: '100%', backgroundColor: colors.yellow, opacity: 0.85 }} />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: '900', color: colors.textMain, textShadow: '1px 1px 2px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 24px)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    🏆 {driverLabel(winner)}
                  </span>
                </div>
                <div style={{ width: '120px', flexShrink: 0, textAlign: 'right', fontSize: '12px', color: colors.textMuted, fontWeight: 'bold' }}>
                  <span style={{ color: colors.textMain }}>{winner.votes}</span> / {record.totalVotes} · {share}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETALLE DE LA CATEGORÍA ELEGIDA */}
      {selectedRecord && (
        <div style={{ ...boxStyle, marginTop: '20px', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: colors.yellow }}>{selectedRecord.category}</div>
              <div style={{ fontSize: '11px', color: colors.textMuted }}>
                {formatDay(selectedRecord.day)} · {t('votaciones.totalVotes')} {selectedRecord.totalVotes}
              </div>
            </div>
            <button
              onClick={() => handleDelete(selectedRecord)}
              style={{ ...btnStyle(), width: 'auto', backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c' }}
            >
              {t('votaciones.deleteBtn')}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedRecord.results.map((r, idx) => {
              const share = pct(r.votes, selectedRecord.totalVotes);
              const isFirst = idx === 0;
              return (
                <div key={r.number} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '24px', textAlign: 'center', fontWeight: '900', color: isFirst ? colors.yellow : colors.textMuted }}>{idx + 1}</div>
                  <div style={{ width: '240px', flexShrink: 0, fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{driverLabel(r)}</div>
                  <div style={{ flex: 1, height: '16px', backgroundColor: colors.bgInput, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                    <div style={{ width: `${share}%`, height: '100%', backgroundColor: isFirst ? colors.yellow : colors.red }} />
                  </div>
                  <div style={{ width: '110px', textAlign: 'right', fontSize: '12px', color: colors.textMuted, fontWeight: 'bold' }}>
                    {r.votes} {t('votaciones.votesSuffix')} · {share}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
