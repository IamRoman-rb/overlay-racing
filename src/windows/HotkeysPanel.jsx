import { useState } from 'react';
import { HOTKEY_GROUPS, HOTKEY_ACTIONS, comboFromEvent } from '../utils/hotkeys';

// Pestaña ATAJOS: una tecla o combinación por gráfica / acción. Se hace click en el recuadro y se aprieta la combinación.
export default function HotkeysPanel({ config, onConfigChange, colors, btnStyle, t }) {
  const hotkeys = config.hotkeys || {};
  const [recording, setRecording] = useState(null);
  const [notice, setNotice] = useState('');

  const labelOf = (action) => t(action.label, action.n ? { n: action.n } : undefined);
  const save = (next) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, combo]) => combo));
    onConfigChange('hotkeys', Object.keys(clean).length ? clean : null);
  };

  const assign = (actionId, combo) => {
    const next = { ...hotkeys };
    // Una combinación sirve para una sola acción: si ya la usaba otra, se la quitamos y avisamos
    const taken = Object.keys(next).filter(id => id !== actionId && next[id] === combo);
    taken.forEach(id => { delete next[id]; });
    next[actionId] = combo;
    setNotice(taken.length
      ? t('hotkeys.moved', { combo, name: taken.map(id => labelOf(HOTKEY_ACTIONS.find(a => a.id === id) || { label: id })).join(', ') })
      : '');
    save(next);
  };

  const clear = (actionId) => {
    const next = { ...hotkeys };
    delete next[actionId];
    setNotice('');
    save(next);
  };

  const onCaptureKeyDown = (e, actionId) => {
    e.preventDefault();
    e.stopPropagation();
    // Al terminar se suelta el foco: así Espacio / Enter no vuelven a activar el botón al levantar la tecla
    const finish = () => { setRecording(null); e.currentTarget.blur(); };
    if (e.key === 'Escape') { finish(); return; }
    if (e.key === 'Tab') return;
    if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      clear(actionId);
      finish();
      return;
    }
    const combo = comboFromEvent(e);
    if (!combo) return; // solo un modificador: se espera a la tecla principal
    assign(actionId, combo);
    finish();
  };

  const assignedCount = Object.keys(hotkeys).length;

  return (
    <div style={{ padding: '30px', overflowY: 'auto', flex: 1, backgroundColor: colors.bgApp }}>
      <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('hotkeys.title')}</span>
        <button
          onClick={() => { if (assignedCount && window.confirm(t('hotkeys.confirmClearAll'))) { setNotice(''); save({}); } }}
          disabled={!assignedCount}
          style={{ ...btnStyle(false), padding: '8px 14px', fontSize: '11px', opacity: assignedCount ? 1 : 0.4, cursor: assignedCount ? 'pointer' : 'default' }}
        >
          {t('hotkeys.clearAll')}
        </button>
      </h2>
      <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: 0, lineHeight: 1.5 }}>{t('hotkeys.description')}</p>
      {notice && (
        <div style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)', border: `1px solid ${colors.yellow}`, color: colors.yellow, borderRadius: '6px', padding: '10px 14px', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>
          {notice}
        </div>
      )}

      {HOTKEY_GROUPS.map(group => (
        <div key={group.id} style={{ marginBottom: '26px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: colors.textMuted, marginBottom: '10px' }}>
            {t(`hotkeys.group.${group.id}`)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
            {group.actions.map(action => {
              const combo = hotkeys[action.id];
              const isRecording = recording === action.id;
              return (
                <div key={action.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.bgPanel, border: `1px solid ${isRecording ? colors.yellow : colors.border}`, borderRadius: '6px', padding: '8px 10px' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: '12px', fontWeight: 'bold', color: colors.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={labelOf(action)}>
                    {labelOf(action)}
                  </span>
                  <button
                    {...(isRecording ? { 'data-hotkey-capture': '' } : {})}
                    ref={el => { if (el && isRecording && document.activeElement !== el) el.focus(); }}
                    onClick={() => { setNotice(''); setRecording(action.id); }}
                    onKeyDown={isRecording ? (e) => onCaptureKeyDown(e, action.id) : undefined}
                    onBlur={() => { if (isRecording) setRecording(null); }}
                    title={t('hotkeys.captureTitle')}
                    style={{
                      minWidth: '130px', padding: '7px 10px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer',
                      borderRadius: '4px', border: `1px solid ${isRecording ? colors.yellow : colors.border}`,
                      backgroundColor: isRecording ? 'rgba(241, 196, 15, 0.12)' : colors.bgInput,
                      color: isRecording ? colors.yellow : (combo ? colors.textMain : colors.textMuted)
                    }}
                  >
                    {isRecording ? t('hotkeys.pressKey') : (combo || t('hotkeys.unassigned'))}
                  </button>
                  <button
                    onClick={() => clear(action.id)}
                    disabled={!combo}
                    title={t('hotkeys.clear')}
                    style={{ ...btnStyle(false), padding: '6px 9px', fontSize: '12px', opacity: combo ? 1 : 0.3, cursor: combo ? 'pointer' : 'default' }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
