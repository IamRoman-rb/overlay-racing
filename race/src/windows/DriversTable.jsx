// src/windows/DriversTable.jsx
import { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icon';
import { withIcons } from '../components/withIcons';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch { /* no crítico: se ignora */ }
}

export default function DriversTable({ drivers, colors, activeDriverNumber, onToggleInfo, selectedLapTimesNumber, onToggleLapTimesSelect, t, config, onConfigChange }) {
  const [pitState, setPitState] = useState({ isVisible: false, driver: null, isRunning: false });
  const [onboard, setOnboard] = useState(null); // piloto con el espacio para la cámara onboard abierto en la torre
  // Ancho disponible: al angostar el panel la tabla se reacomoda (botones en 2x2, columnas secundarias ocultas)
  // en vez de generar scroll horizontal, para que siempre se lean posición, número y nombre.
  const wrapRef = useRef(null);
  const hasDrivers = !!(drivers && drivers.length);
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(entries => { const w = entries[0]?.contentRect?.width; if (w) setWidth(w); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasDrivers]);

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-pitstop').then(setPitState).catch(() => { });
      const handlePitUpdate = (e, state) => setPitState(state);
      ipcRenderer.on('update-pitstop', handlePitUpdate);
      return () => ipcRenderer.removeListener('update-pitstop', handlePitUpdate);
    }
  }, []);

  useEffect(() => {
    if (!ipcRenderer) return undefined;
    ipcRenderer.invoke('get-tower-onboard').then(s => setOnboard(s?.number || null)).catch(() => { });
    const onUpdate = (e, s) => setOnboard(s?.number || null);
    ipcRenderer.on('update-tower-onboard', onUpdate);
    return () => ipcRenderer.removeListener('update-tower-onboard', onUpdate);
  }, []);
  const toggleOnboard = (d) => {
    if (ipcRenderer) ipcRenderer.send('tower-onboard', { number: String(onboard) === String(d.number) ? null : d.number });
  };

  const handlePitAction = (driver) => {
    if (pitState.isVisible && pitState.driver?.number === driver.number) {
      if (pitState.isRunning) {
        ipcRenderer.send('pitstop-action', { action: 'stop', driver });
      } else {
        ipcRenderer.send('pitstop-action', { action: 'hide', driver });
      }
    } else {
      ipcRenderer.send('pitstop-action', { action: 'start', driver });
    }
  };

  if (!drivers || drivers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, fontStyle: 'italic' }}>
        {t('driversTable.noData')}
      </div>
    );
  }

  const onboardDriver = onboard ? drivers.find(d => String(d.number) === String(onboard)) : null;
  const stackButtons = width < 1000;   // botones de acción en grilla 2x2
  const hideTimes = width < 700;       // oculta diferencia, tiempo total y mejor vuelta
  const hideLaps = width < 480;        // oculta vueltas
  const cellPad = stackButtons ? '8px 6px' : '10px';
  const headPad = stackButtons ? '10px 6px' : '12px 10px';
  const btnBase = { padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
  return (
    <div ref={wrapRef} style={{ width: '100%', boxSizing: 'border-box', overflowX: 'auto', backgroundColor: colors.bgPanel, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
      {/* CÁMARA ONBOARD: estado y opciones del espacio negro que se abre en la torre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '8px 12px', borderBottom: `1px solid ${colors.border}`, fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>
        <span style={{ color: onboard ? '#e67e22' : colors.textMuted }}>
          <Icon name="videocam" /> {onboard ? t('driversTable.onboardOn', { n: onboard, name: onboardDriver?.name || '' }) : t('driversTable.onboardOff')}
        </span>
        {onboard && <button onClick={() => ipcRenderer && ipcRenderer.send('tower-onboard', { number: null })} style={{ backgroundColor: colors.red, color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{t('driversTable.onboardClose')}</button>}
        <span style={{ flex: 1 }} />
        {onConfigChange && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title={t('driversTable.onboardHeightTitle')}>
              {t('driversTable.onboardHeight')}
              <input type="number" min="40" max="600" value={config?.towerOnboardHeight || 180}
                onChange={(e) => onConfigChange('towerOnboardHeight', Math.min(600, Math.max(40, parseInt(e.target.value, 10) || 180)))}
                style={{ width: '58px', padding: '4px', backgroundColor: colors.bgInput, color: colors.textMain, border: `1px solid ${colors.border}`, borderRadius: '4px', fontSize: '11px' }} />
              px
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }} title={t('driversTable.onboardLockTitle')}>
              <input type="checkbox" checked={config?.towerOnboardLock !== false} onChange={(e) => onConfigChange('towerOnboardLock', e.target.checked)} style={{ cursor: 'pointer' }} />
              {t('driversTable.onboardLock')}
            </label>
          </>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
        <thead>
          <tr style={{ backgroundColor: colors.bgInput, color: colors.textMuted, borderBottom: `2px solid ${colors.border}` }}>
            <th style={{ padding: headPad }}>{t('driversTable.colPos')}</th>
            <th style={{ padding: headPad }}>{t('driversTable.colNum')}</th>
            <th style={{ padding: headPad, textAlign: 'left' }}>{t('driversTable.colDriver')}</th>
            {!hideLaps && <th style={{ padding: headPad }}>{t('driversTable.colLaps')}</th>}
            <th style={{ padding: headPad }}>{t('driversTable.colLastLap')}</th>
            {!hideTimes && <th style={{ padding: headPad }}>{t('driversTable.colDiff')}</th>}
            {!hideTimes && <th style={{ padding: headPad }}>{t('driversTable.colTotalTime')}</th>}
            {!hideTimes && <th style={{ padding: headPad }}>{t('driversTable.colBestLap')}</th>}
            <th style={{ padding: headPad, textAlign: 'right' }}>{t('driversTable.colAction')}</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d, index) => {
            const isInfoActive = activeDriverNumber === d.number;
            const isThisPitActive = pitState.isVisible && pitState.driver?.number === d.number;

            // Lógica de colores para el botón de Boxes
            let pitBtnText = t('driversTable.pitBox');
            let pitBtnColor = '#34495e'; // Gris neutro

            if (isThisPitActive) {
              if (pitState.isRunning) {
                pitBtnText = t('driversTable.pitStop');
                pitBtnColor = colors.red; // Rojo peligro
              } else {
                pitBtnText = t('driversTable.pitRemove');
                pitBtnColor = '#000000'; // Negro para limpiar
              }
            }

            return (
              <tr key={index} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: isInfoActive ? 'rgba(52, 152, 219, 0.1)' : 'transparent', transition: 'background-color 0.2s' }}>
                <td style={{ padding: cellPad, fontWeight: 'bold', color: colors.yellow }}>{d.pos}</td>
                <td style={{ padding: cellPad, color: colors.textMuted }}>{d.number}</td>
                <td style={{ padding: cellPad, textAlign: 'left', fontWeight: 'bold', color: colors.textMain, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{d.name}</td>
                {!hideLaps && <td style={{ padding: cellPad, color: colors.textMuted }}>{d.laps || '-'}</td>}

                {/* Si entra en boxes, la última vuelta la pintamos de verde según tu screenshot */}
                <td style={{ padding: cellPad, whiteSpace: 'nowrap', color: d.lastLap === 'IN PIT' ? colors.green : colors.textMain, fontWeight: d.lastLap === 'IN PIT' ? 'bold' : 'normal' }}>
                  {d.lastLap || '-'}
                </td>

                {!hideTimes && <td style={{ padding: cellPad, color: colors.textMuted }}>{d.diff || d.gap || '-'}</td>}
                {!hideTimes && <td style={{ padding: cellPad, color: colors.textMain, fontWeight: 'bold' }}>{d.totalTime || '-'}</td>}
                {!hideTimes && <td style={{ padding: cellPad, color: colors.textMuted }}>{d.bestLap || '-'}</td>}

                <td style={{ padding: cellPad, width: '1%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: stackButtons ? 'repeat(2, auto)' : 'repeat(4, auto)', gap: '5px', justifyContent: 'end' }}>

                  {/* BOTÓN EVOLUCIÓN DE TIEMPOS DE VUELTA */}
                  {onToggleLapTimesSelect && (
                    <button
                      onClick={() => onToggleLapTimesSelect(d)}
                      style={{
                        backgroundColor: selectedLapTimesNumber === d.number ? '#00e5ff' : colors.bgInput,
                        color: selectedLapTimesNumber === d.number ? '#000' : colors.textMuted,
                        border: `1px solid ${selectedLapTimesNumber === d.number ? '#00b8cc' : colors.border}`,
                        ...btnBase
                      }}
                      title={t('driversTable.lapTimesTitle')}
                    >
                      <Icon name="timer" /> {selectedLapTimesNumber === d.number ? t('driversTable.lapTimesRemove') : t('driversTable.lapTimesShow')}
                    </button>
                  )}

                  {/* BOTÓN CÁMARA ONBOARD: abre un espacio negro debajo del piloto en la torre */}
                  <button
                    onClick={() => toggleOnboard(d)}
                    title={t('driversTable.onboardTitle')}
                    style={{
                      backgroundColor: String(onboard) === String(d.number) ? '#e67e22' : colors.bgInput,
                      color: String(onboard) === String(d.number) ? '#000' : colors.textMuted,
                      border: `1px solid ${String(onboard) === String(d.number) ? '#d35400' : colors.border}`,
                      ...btnBase
                    }}
                  >
                    <Icon name="videocam" /> {String(onboard) === String(d.number) ? t('driversTable.onboardRemove') : t('driversTable.onboardShow')}
                  </button>

                  {/* BOTÓN ZÓCALO DE INFO */}
                  <button
                    onClick={() => onToggleInfo(d)}
                    style={{
                      backgroundColor: isInfoActive ? colors.bgInput : '#3498db',
                      color: isInfoActive ? colors.textMuted : '#fff',
                      border: `1px solid ${isInfoActive ? colors.border : '#2980b9'}`,
                      ...btnBase
                    }}
                  >
                    {isInfoActive ? t('common.hide') : t('driversTable.infoShow')}
                  </button>

                  {/* BOTÓN MAGICO DE CRONOMETRO EN BOXES */}
                  <button
                    onClick={() => handlePitAction(d)}
                    style={{
                      backgroundColor: pitBtnColor, color: '#fff', border: 'none',
                      ...btnBase,
                      minWidth: '70px', transition: 'background-color 0.2s'
                    }}
                  >
                    {withIcons(pitBtnText)}
                  </button>
                </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}