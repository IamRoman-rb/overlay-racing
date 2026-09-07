// src/windows/DriversTable.jsx
import { useState, useEffect } from 'react';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch (e) { }
}

export default function DriversTable({ drivers, colors, activeDriverNumber, onToggleInfo, selectedLapTimesNumber, onToggleLapTimesSelect }) {
  const [pitState, setPitState] = useState({ isVisible: false, driver: null, isRunning: false });

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-pitstop').then(setPitState).catch(() => { });
      const handlePitUpdate = (e, state) => setPitState(state);
      ipcRenderer.on('update-pitstop', handlePitUpdate);
      return () => ipcRenderer.removeListener('update-pitstop', handlePitUpdate);
    }
  }, []);

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
        No hay datos de telemetría. Conecta Speedhive o RaceMonitor para ver la tabla en vivo.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: colors.bgPanel, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
        <thead>
          <tr style={{ backgroundColor: colors.bgInput, color: colors.textMuted, borderBottom: `2px solid ${colors.border}` }}>
            <th style={{ padding: '12px 10px' }}>POS</th>
            <th style={{ padding: '12px 10px' }}>NUM</th>
            <th style={{ padding: '12px 10px', textAlign: 'left' }}>PILOTO</th>
            <th style={{ padding: '12px 10px' }}>VUELTAS</th>
            <th style={{ padding: '12px 10px' }}>ÚLTIMA V.</th>
            <th style={{ padding: '12px 10px' }}>DIFERENCIA</th>
            <th style={{ padding: '12px 10px' }}>T. TOTAL</th>
            <th style={{ padding: '12px 10px' }}>MEJOR V.</th>
            <th style={{ padding: '12px 10px', textAlign: 'right' }}>ACCIÓN</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d, index) => {
            const isInfoActive = activeDriverNumber === d.number;
            const isThisPitActive = pitState.isVisible && pitState.driver?.number === d.number;

            // Lógica de colores para el botón de Boxes
            let pitBtnText = '⏱️ BOX';
            let pitBtnColor = '#34495e'; // Gris neutro

            if (isThisPitActive) {
              if (pitState.isRunning) {
                pitBtnText = '🛑 STOP';
                pitBtnColor = colors.red; // Rojo peligro
              } else {
                pitBtnText = '❌ QUITAR';
                pitBtnColor = '#000000'; // Negro para limpiar
              }
            }

            return (
              <tr key={index} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: isInfoActive ? 'rgba(52, 152, 219, 0.1)' : 'transparent', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: colors.yellow }}>{d.pos}</td>
                <td style={{ padding: '10px', color: colors.textMuted }}>{d.number}</td>
                <td style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: colors.textMain, textTransform: 'uppercase' }}>{d.name}</td>
                <td style={{ padding: '10px', color: colors.textMuted }}>{d.laps || '-'}</td>

                {/* Si entra en boxes, la última vuelta la pintamos de verde según tu screenshot */}
                <td style={{ padding: '10px', color: d.lastLap === 'IN PIT' ? colors.green : colors.textMain, fontWeight: d.lastLap === 'IN PIT' ? 'bold' : 'normal' }}>
                  {d.lastLap || '-'}
                </td>

                <td style={{ padding: '10px', color: colors.textMuted }}>{d.diff || d.gap || '-'}</td>
                <td style={{ padding: '10px', color: colors.textMain, fontWeight: 'bold' }}>{d.totalTime || '-'}</td>
                <td style={{ padding: '10px', color: colors.textMuted }}>{d.bestLap || '-'}</td>

                <td style={{ padding: '10px', display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>

                  {/* BOTÓN EVOLUCIÓN DE TIEMPOS DE VUELTA */}
                  {onToggleLapTimesSelect && (
                    <button
                      onClick={() => onToggleLapTimesSelect(d)}
                      style={{
                        backgroundColor: selectedLapTimesNumber === d.number ? '#00e5ff' : colors.bgInput,
                        color: selectedLapTimesNumber === d.number ? '#000' : colors.textMuted,
                        border: `1px solid ${selectedLapTimesNumber === d.number ? '#00b8cc' : colors.border}`,
                        padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                      }}
                      title="Ver evolución de tiempos de vuelta de este piloto"
                    >
                      ⏱️ {selectedLapTimesNumber === d.number ? 'QUITAR' : 'VUELTAS'}
                    </button>
                  )}

                  {/* BOTÓN ZÓCALO DE INFO */}
                  <button
                    onClick={() => onToggleInfo(d)}
                    style={{
                      backgroundColor: isInfoActive ? colors.bgInput : '#3498db',
                      color: isInfoActive ? colors.textMuted : '#fff',
                      border: `1px solid ${isInfoActive ? colors.border : '#2980b9'}`,
                      padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    {isInfoActive ? 'OCULTAR' : 'INFO'}
                  </button>

                  {/* BOTÓN MAGICO DE CRONOMETRO EN BOXES */}
                  <button
                    onClick={() => handlePitAction(d)}
                    style={{
                      backgroundColor: pitBtnColor, color: '#fff', border: 'none',
                      padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                      minWidth: '70px', transition: 'background-color 0.2s'
                    }}
                  >
                    {pitBtnText}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}