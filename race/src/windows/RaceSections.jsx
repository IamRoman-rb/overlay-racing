// Bloques del panel para el análisis de carrera: categoría y multiclase, grilla y flechas, análisis (sectores, brecha,
// remontadas, mapa en vivo), modo clasificación, alertas automáticas y correcciones manuales.
import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { CLASS_PALETTE, getClassColor } from '../utils/raceVisuals';

const labelStyle = (colors) => ({ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '0.5px' });
const hintStyle = (colors) => ({ fontSize: '10px', color: colors.textMuted, lineHeight: 1.4 });
const smallBtn = (btnStyle, active = false) => ({ ...btnStyle(active), padding: '7px 6px', fontSize: '10px' });

const driverOptions = (drivers) => drivers.filter(d => !d.dsq).map(d => (
  <option key={d.number} value={d.number}>P{d.pos} #{d.number} — {d.name}</option>
));

// Campo de texto que guarda al salir o con Enter (no en cada tecla)
function CommitInput({ value, onCommit, style, placeholder, type = 'text', min, step, title }) {
  const [draft, setDraft] = useState(value ?? '');
  // Si el valor cambia desde afuera (otra pantalla, la fuente), el borrador lo sigue
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) { setPrevValue(value); setDraft(value ?? ''); }
  const commit = () => { if (String(draft) !== String(value ?? '')) onCommit(draft); };
  return (
    <input
      type={type} min={min} step={step} title={title} value={draft} placeholder={placeholder} style={style}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }}
    />
  );
}

// --- CATEGORÍA, MULTICLASE, GRILLA Y FLECHAS ---
export function CategorySection({ config, sessionInfo, onSave, onCategoryInput, onGridAction, colors, inputStyle, btnStyle, t, style }) {
  const detected = sessionInfo?.detectedCategory || '';
  const name = config.categoryName || '';
  const multiclassMode = config.multiclassMode || 'auto';
  const classes = sessionInfo?.classes || [];
  const multiclass = !!sessionInfo?.multiclass;
  const gridSource = sessionInfo?.gridSource || 'none';
  const qualifying = !!sessionInfo?.qualifying;

  let status = t('race.categoryNone');
  if (name && config.categoryNameAuto && name === detected) status = t('race.categoryAuto');
  else if (name) status = t('race.categoryManual');
  else if (detected) status = t('race.categoryDetected', { name: detected });

  return (
    <div className="panel-section" style={style}>
      <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('race.categorySection')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
        <label style={labelStyle(colors)}>{t('race.categoryLabel')}</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          <CommitInput value={name} onCommit={onCategoryInput} placeholder={t('race.categoryPlaceholder')} style={{ ...inputStyle, flex: 1 }} />
          {detected && detected !== name && (
            <button onClick={() => onSave({ categoryName: detected, categoryNameAuto: true })} title={t('race.categoryDetected', { name: detected })} style={{ ...smallBtn(btnStyle), width: 'auto', padding: '0 10px' }}>{t('race.categoryUse')}</button>
          )}
        </div>
        <span style={{ ...hintStyle(colors), color: name ? colors.textMuted : '#e67e22' }}>{status}</span>

        <label style={{ ...labelStyle(colors), marginTop: '8px' }}>{t('race.multiclassLabel')}</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
          {['auto', 'on', 'off'].map(m => (
            <button key={m} onClick={() => onSave('multiclassMode', m)} style={smallBtn(btnStyle, multiclassMode === m)}>{t(`race.multiclass_${m}`)}</button>
          ))}
        </div>
        <span style={hintStyle(colors)}>{multiclass ? t('race.classesDetected', { n: classes.length }) : t('race.multiclassHint')}</span>

        {multiclass && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, padding: '8px', borderRadius: '4px' }}>
            {classes.map((cls, i) => (
              <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color" value={getClassColor(config, cls, classes)}
                  onChange={(e) => onSave('classColors', { ...(config.classColors || {}), [cls]: e.target.value })}
                  title={CLASS_PALETTE[i % CLASS_PALETTE.length]}
                  style={{ width: '28px', height: '22px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls}</span>
              </div>
            ))}
            {[['towerClassFilter', 'race.towerFilter'], ['finalResultsClassFilter', 'race.finalFilter']].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ ...labelStyle(colors), width: '80px' }}>{t(label)}</span>
                <select value={classes.includes(config[key]) ? config[key] : ''} onChange={(e) => onSave(key, e.target.value)} style={{ ...inputStyle, padding: '6px', flex: 1, cursor: 'pointer' }}>
                  <option value="">{t('race.allClasses')}</option>
                  {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMuted, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.tickerClassLeaders !== false} onChange={(e) => onSave('tickerClassLeaders', e.target.checked)} />
              {t('race.classLeadersTicker')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMuted, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.finalResultsClassWinners !== false} onChange={(e) => onSave('finalResultsClassWinners', e.target.checked)} />
              {t('race.classWinnersFinal')}
            </label>
          </div>
        )}

        <label style={{ ...labelStyle(colors), marginTop: '8px' }}>{t('race.gridLabel')}</label>
        <span style={{ ...hintStyle(colors), color: gridSource === 'none' && !qualifying ? '#e67e22' : colors.textMuted }}>
          {qualifying ? t('race.gridQuali') : t(`race.grid_${gridSource}`)}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => onGridAction('capture')} style={{ ...smallBtn(btnStyle), flex: 2 }}>{t('race.gridCapture')}</button>
          <button onClick={() => onGridAction('clear')} style={{ ...smallBtn(btnStyle), flex: 1 }}>{t('race.gridClear')}</button>
        </div>

        <label style={{ ...labelStyle(colors), marginTop: '8px' }}>{t('race.arrowsLabel')}</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
          {['start', 'live', 'off'].map(m => (
            <button key={m} onClick={() => onSave('tickerArrows', m)} style={smallBtn(btnStyle, (config.tickerArrows || 'start') === m)}>{t(`race.arrows_${m}`)}</button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMuted, cursor: 'pointer' }}>
          <input type="checkbox" checked={config.towerShowGains !== false} onChange={(e) => onSave('towerShowGains', e.target.checked)} />
          {t('race.towerGains')}
        </label>
      </div>
    </div>
  );
}

// --- ANÁLISIS: SECTORES, BRECHA, REMONTADAS, MAPA EN VIVO ---
export function AnalysisSection({
  drivers, config, sessionInfo, sectorsSel, setSectorsSel, sectorsVisible, onToggleSectors,
  gapPair, setGapPair, gapData, onToggleGap, recommendedBattle, graphics, onToggleGraphic, onSave,
  colors, inputStyle, btnStyle, t, style
}) {
  const hasSectorData = drivers.some(d => d.sector1 || d.sector2 || d.sector3);
  const hasPath = Array.isArray(config.trackPath) && config.trackPath.length >= 3;
  const fmt = (v) => (v === null || v === undefined ? '-' : `${v >= 0 ? '+' : ''}${v.toFixed(3)}`);
  let gapTrend = '';
  if (gapData?.rate !== null && gapData?.rate !== undefined) {
    if (gapData.rate < -0.02) gapTrend = t('race.gapClosing', { rate: Math.abs(gapData.rate).toFixed(3) });
    else if (gapData.rate > 0.02) gapTrend = t('race.gapOpening', { rate: gapData.rate.toFixed(3) });
    else gapTrend = t('race.gapEven');
  }

  return (
    <div className="panel-section" style={style}>
      <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('race.analysisSection')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
        <label style={labelStyle(colors)}>{t('graphics.sectors')}</label>
        {[0, 1].map(i => (
          <select key={i} value={sectorsSel[i] || ''} onChange={(e) => { const next = [...sectorsSel]; next[i] = e.target.value; setSectorsSel(next); }} style={{ ...inputStyle, padding: '7px', cursor: 'pointer' }}>
            <option value="">{i === 0 ? t('race.driver1') : t('race.driver2Optional')}</option>
            {driverOptions(drivers)}
          </select>
        ))}
        <button onClick={onToggleSectors} style={btnStyle(sectorsVisible)}>{sectorsVisible ? t('race.hideSectors') : t('race.showSectors')}</button>
        {drivers.length > 0 && !hasSectorData && <span style={hintStyle(colors)}>{t('race.noSectorsSource')}</span>}

        <label style={{ ...labelStyle(colors), marginTop: '10px' }}>{t('race.gapLabel')}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {['front', 'back'].map(k => (
            <select key={k} value={gapPair[k] || ''} onChange={(e) => setGapPair({ ...gapPair, [k]: e.target.value })} style={{ ...inputStyle, padding: '7px', cursor: 'pointer' }}>
              <option value="">{t(k === 'front' ? 'race.gapFront' : 'race.gapBack')}</option>
              {driverOptions(drivers)}
            </select>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {recommendedBattle && (
            <button onClick={() => setGapPair({ front: recommendedBattle.front.number, back: recommendedBattle.back.number })} style={{ ...smallBtn(btnStyle), flex: 1 }}>{t('race.useBattle')}</button>
          )}
          <button onClick={onToggleGap} style={{ ...btnStyle(!!gapData?.isVisible), flex: 2 }}>{gapData?.isVisible ? t('race.hideGap') : t('race.showGap')}</button>
        </div>
        {gapPair.front && gapPair.back && (
          <span style={{ ...hintStyle(colors), color: colors.textMain }}>
            {gapData?.series?.length ? t('race.gapInfo', { gap: fmt(gapData.current), laps: gapData.series.length }) : t('race.gapWaiting')}
            {gapTrend ? ` · ${gapTrend}` : ''}
            {gapData?.lapsToCatch ? ` · ${t('race.gapCatch', { n: gapData.lapsToCatch })}` : ''}
          </span>
        )}

        <label style={{ ...labelStyle(colors), marginTop: '10px' }}>{t('race.moreGraphics')}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <button onClick={() => onToggleGraphic('gainers')} style={btnStyle(!!graphics.gainers)}>{t('graphics.gainers')}</button>
          <button onClick={() => onToggleGraphic('trackMap')} style={btnStyle(!!graphics.trackMap)}>{t('graphics.trackMap')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ ...labelStyle(colors) }}>{t('race.gainersCount')}</span>
          <CommitInput type="number" min="1" value={config.gainersCount || 5} onCommit={(v) => onSave('gainersCount', Math.min(10, Math.max(1, parseInt(v, 10) || 5)))} style={{ ...inputStyle, width: '55px', textAlign: 'center' }} />
        </div>
        {!hasPath && <span style={{ ...hintStyle(colors), color: '#e67e22' }}>{t('race.trackMapNoPath', { tab: t('tabs.circuito') })}</span>}
        {sessionInfo?.qualifying === false && drivers.length > 0 && sessionInfo?.gridSource === 'none' && (
          <span style={hintStyle(colors)}>{t('race.gainersNoGrid')}</span>
        )}
      </div>
    </div>
  );
}

// --- MODO CLASIFICACIÓN ---
export function QualifyingSection({ config, sessionInfo, isVisible, onToggle, onSave, colors, inputStyle, btnStyle, t, style }) {
  return (
    <div className="panel-section" style={style}>
      <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('race.qualiSection')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
        <span style={{ ...hintStyle(colors), color: sessionInfo?.qualifying ? colors.green : colors.textMuted }}>
          {sessionInfo?.name ? (sessionInfo?.qualifying ? t('race.qualiDetected') : t('race.raceDetected')) : t('race.noSession')}
        </span>
        <button onClick={onToggle} style={btnStyle(isVisible)}>{t('race.qualiBtn')}</button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={labelStyle(colors)}>{t('race.qualiTitle')}</span>
            <CommitInput value={config.qualiTitle || ''} onCommit={(v) => onSave('qualiTitle', v)} placeholder="Q1" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={labelStyle(colors)} title={t('race.qualiCutoffHint')}>{t('race.qualiCutoff')}</span>
            <CommitInput type="number" min="0" value={config.qualiCutoff || 0} onCommit={(v) => onSave('qualiCutoff', Math.max(0, parseInt(v, 10) || 0))} style={{ ...inputStyle, textAlign: 'center' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={labelStyle(colors)}>{t('race.qualiRows')}</span>
            <CommitInput type="number" min="5" value={config.qualiRows || 20} onCommit={(v) => onSave('qualiRows', Math.min(40, Math.max(5, parseInt(v, 10) || 20)))} style={{ ...inputStyle, textAlign: 'center' }} />
          </div>
        </div>
        <span style={hintStyle(colors)}>{t('race.qualiHint')}</span>
      </div>
    </div>
  );
}

// --- ALERTAS AUTOMÁTICAS ---
const ALERT_ICONS = { fastestLap: 'timer', leaderChange: 'trophy', stopped: 'warning', flag: 'flag' };
const ALERT_COLORS = { fastestLap: '#a23cf0', leaderChange: '#ffcc00', stopped: '#e74c3c', flag: '#3498db' };
const ALERT_MAX_AGE_MS = 3 * 60 * 1000;

function alertText(alert, t) {
  switch (alert.type) {
    case 'fastestLap': return t('race.alert_fastestLap', { number: alert.number, name: alert.name, time: alert.time });
    case 'leaderChange': return t(alert.qualifying ? 'race.alert_leaderChangeQuali' : 'race.alert_leaderChange', { number: alert.number, name: alert.name, prev: alert.prevNumber });
    case 'stopped': return t('race.alert_stopped', { number: alert.number, name: alert.name });
    case 'flag': return t('race.alert_flag', { flag: String(alert.flag || '').toUpperCase() });
    default: return '';
  }
}

export function RaceAlertsBar({ alerts, onAction, canAct, onDismiss, onClear, colors, btnStyle, t }) {
  // Reloj de 5 s: las alertas viejas desaparecen solas y el "hace X s" se actualiza
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setClockNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const newest = (alerts || []).reduce((m, a) => Math.max(m, a.at || 0), 0);
  const now = Math.max(clockNow, newest);
  const visible = (alerts || []).filter(a => now - a.at < ALERT_MAX_AGE_MS).slice(0, 6);
  if (!visible.length) return null;
  const ago = (at) => {
    const s = Math.max(0, Math.round((now - at) / 1000));
    return s < 60 ? t('race.secondsAgo', { n: s }) : t('race.minutesAgo', { n: Math.floor(s / 60) });
  };
  return (
    <div style={{ marginBottom: '15px', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: colors.bgPanel, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: `1px solid ${colors.border}` }}>
        <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', color: colors.yellow }}><Icon name="sensors" /> {t('race.alertsTitle')}</span>
        <button onClick={onClear} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{t('race.alertsClear')}</button>
      </div>
      {visible.map(a => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderBottom: `1px solid ${colors.border}`, borderLeft: `4px solid ${ALERT_COLORS[a.type] || colors.textMuted}` }}>
          <Icon name={ALERT_ICONS[a.type] || 'info'} color={ALERT_COLORS[a.type]} />
          <span style={{ flex: 1, fontSize: '12px', fontWeight: 'bold', color: colors.textMain }}>{alertText(a, t)}</span>
          <span style={{ fontSize: '10px', color: colors.textMuted, whiteSpace: 'nowrap' }}>{ago(a.at)}</span>
          {canAct(a) && (
            <button onClick={() => onAction(a)} style={{ ...btnStyle(false), width: 'auto', padding: '6px 12px', fontSize: '10px', backgroundColor: '#2ecc71', color: '#fff', borderColor: '#27ae60' }}>{t('race.alertOnAir')}</button>
          )}
          <button onClick={() => onDismiss(a.id)} title={t('race.alertDismiss')} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '2px' }}><Icon name="close" /></button>
        </div>
      ))}
    </div>
  );
}

// --- CORRECCIONES MANUALES (pestaña SANCIONES) ---
export function CorrectionsPanel({ drivers, corrections, onSetCorrection, onClear, colors, inputStyle, btnStyle, t }) {
  const known = new Set(drivers.map(d => String(d.number)));
  const extra = Object.keys(corrections || {}).filter(num => !known.has(num)).map(num => ({ number: num, name: '', pos: '-' }));
  const rows = [...drivers, ...extra];
  const activeCount = Object.keys(corrections || {}).length;
  const cell = { padding: '6px 8px', borderBottom: `1px solid ${colors.border}` };

  return (
    <div style={{ maxWidth: '900px', marginTop: '35px', borderTop: `1px solid ${colors.border}`, paddingTop: '25px' }}>
      <h3 style={{ color: colors.yellow, margin: '0 0 6px', fontSize: '15px' }}>{t('corrections.title')}</h3>
      <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: 0, marginBottom: '14px' }}>{t('corrections.description')}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: activeCount ? colors.yellow : colors.textMuted, flex: 1 }}>{t('corrections.active', { n: activeCount })}</span>
        <button onClick={() => onClear('penalties')} disabled={!activeCount} style={{ ...btnStyle(false), width: 'auto', padding: '8px 12px', fontSize: '10px' }}>{t('corrections.clearPenalties')}</button>
        <button onClick={() => onClear('all')} disabled={!activeCount} style={{ ...btnStyle(false), width: 'auto', padding: '8px 12px', fontSize: '10px', backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c' }}>{t('corrections.clearAll')}</button>
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '25px', color: colors.textMuted, fontStyle: 'italic', backgroundColor: colors.bgPanel, borderRadius: '6px' }}>{t('corrections.noDrivers')}</div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: colors.bgPanel, borderRadius: '6px', border: `1px solid ${colors.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: colors.bgInput, color: colors.textMuted, textAlign: 'left' }}>
                <th style={cell}>{t('corrections.colPos')}</th>
                <th style={cell}>{t('corrections.colNum')}</th>
                <th style={cell}>{t('corrections.colDriver')}</th>
                <th style={cell}>{t('corrections.colName')}</th>
                <th style={cell}>{t('corrections.colPenalty')}</th>
                <th style={{ ...cell, textAlign: 'center' }}>{t('corrections.colDsq')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(d => {
                const num = String(d.number);
                const c = (corrections || {})[num] || {};
                const sourceName = d.src?.name || d.name;
                const hasAny = !!(c.name || c.timePenalty || c.dsq);
                return (
                  <tr key={num} style={{ backgroundColor: hasAny ? 'rgba(255,204,0,0.06)' : 'transparent' }}>
                    <td style={{ ...cell, fontWeight: 'bold', color: d.dsq ? colors.red : colors.yellow }}>{d.pos}</td>
                    <td style={{ ...cell, fontWeight: 'bold' }}>#{num}</td>
                    <td style={{ ...cell, color: colors.textMuted, textTransform: 'uppercase' }}>{sourceName || '—'}</td>
                    <td style={cell}>
                      <CommitInput value={c.name || ''} placeholder={t('corrections.namePlaceholder')} onCommit={(v) => onSetCorrection(num, { name: v })} style={{ ...inputStyle, padding: '6px', textTransform: 'none' }} />
                    </td>
                    <td style={cell}>
                      <CommitInput type="number" min="0" step="0.1" value={c.timePenalty || ''} placeholder="0" title={t('corrections.penaltyHint')} onCommit={(v) => onSetCorrection(num, { timePenalty: parseFloat(v) || 0 })} style={{ ...inputStyle, padding: '6px', width: '80px', textAlign: 'center' }} />
                    </td>
                    <td style={{ ...cell, textAlign: 'center' }}>
                      <input type="checkbox" checked={!!c.dsq} onChange={(e) => onSetCorrection(num, { dsq: e.target.checked })} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: colors.textMuted, fontSize: '11px', marginTop: '10px' }}>{t('corrections.footer')}</p>
    </div>
  );
}
