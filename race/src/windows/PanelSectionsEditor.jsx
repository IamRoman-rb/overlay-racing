// PERSONALIZAR: acomodar las secciones de botones de la pestaña PANEL (orden y cuáles se ven).
import { useState } from 'react';
import Icon from '../components/Icon';
import { PANEL_SECTIONS, getSectionOrder, isSectionHidden } from '../utils/panelSections';

export function PanelSectionsEditor({ config, onConfigChange, colors, btnStyle, t }) {
  const order = getSectionOrder(config);
  const hidden = Array.isArray(config.panelSectionHidden) ? config.panelSectionHidden : [];
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const labelOf = (id) => t(PANEL_SECTIONS.find(s => s.id === id)?.label || id);

  const saveOrder = (next) => onConfigChange('panelSectionOrder', next);
  const move = (id, delta) => {
    const i = order.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    saveOrder(next);
  };
  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const next = order.filter(id => id !== dragId);
    next.splice(next.indexOf(targetId), 0, dragId);
    saveOrder(next);
  };
  const toggleHidden = (id) => onConfigChange('panelSectionHidden', hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id]);
  const arrowBtn = { background: 'none', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: '3px', cursor: 'pointer', padding: '1px 5px', fontSize: '11px', lineHeight: 1.2 };

  return (
    <>
      <h3 style={{ color: colors.yellow, marginBottom: '8px' }}>{t('personalizar.panelSectionsTitle')}</h3>
      <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', marginTop: 0, marginBottom: '10px' }}>{t('personalizar.panelSectionsDesc')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', backgroundColor: '#111', padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '8px' }}>
        {order.map((id, i) => {
          const off = isSectionHidden(config, id);
          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => { setDragId(id); try { e.dataTransfer.setData('text/plain', id); } catch { /* sin dataTransfer */ } }}
              onDragOver={(e) => { e.preventDefault(); setOverId(id); }}
              onDragLeave={() => setOverId(o => (o === id ? null : o))}
              onDrop={(e) => { e.preventDefault(); dropOn(id); setDragId(null); setOverId(null); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '4px', cursor: 'grab',
                backgroundColor: overId === id && dragId && dragId !== id ? 'rgba(255,204,0,0.15)' : colors.bgInput,
                border: `1px solid ${overId === id && dragId && dragId !== id ? colors.yellow : colors.border}`,
                opacity: dragId === id ? 0.5 : (off ? 0.55 : 1)
              }}
            >
              <Icon name="drag_indicator" color={colors.textMuted} />
              <span style={{ fontSize: '10px', color: colors.textMuted, width: '16px' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: off ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{labelOf(id)}</span>
              <button onClick={() => move(id, -1)} disabled={i === 0} title={t('personalizar.moveUp')} style={arrowBtn}>▲</button>
              <button onClick={() => move(id, 1)} disabled={i === order.length - 1} title={t('personalizar.moveDown')} style={arrowBtn}>▼</button>
              <label title={t('personalizar.sectionVisible')} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={!off} onChange={() => toggleHidden(id)} />
              </label>
            </div>
          );
        })}
      </div>
      <button onClick={() => onConfigChange({ panelSectionOrder: null, panelSectionHidden: null })} style={{ ...btnStyle(false), padding: '8px', fontSize: '10px', marginBottom: '30px' }}>{t.i('personalizar.panelSectionsReset')}</button>
    </>
  );
}
