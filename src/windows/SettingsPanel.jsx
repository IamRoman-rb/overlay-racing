import { useState, useEffect } from 'react';

export default function SettingsPanel({ config, handleDirectSave, handleScrape, colors, inputStyle, btnStyle }) {
  
  const chromaColors = [
    { label: 'VERDE (CLÁSICO)', value: '#00FF00' },
    { label: 'AZUL', value: '#0000FF' },
    { label: 'MAGENTA / ROSA', value: '#FF00FF' },
    { label: 'NEGRO', value: '#000000' },
    { label: 'BLANCO', value: '#FFFFFF' },
    { label: 'AMARILLO', value: '#FFFF00' }
  ];

  const [localCode, setLocalCode] = useState(config.speedhiveCode || '');
  const provider = config.timingProvider || 'speedhive';

  useEffect(() => {
    setLocalCode(config.speedhiveCode || '');
  }, [config.speedhiveCode]);

  return (
    <div style={{ flex: 1, padding: '30px', backgroundColor: colors.bgApp, overflowY: 'auto' }}>
      <h2 style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', color: colors.yellow, marginTop: 0 }}>
        AJUSTES DEL SISTEMA
      </h2>

      {/* SECCIÓN 1: CHROMA KEY */}
      <div style={{ marginTop: '20px', backgroundColor: colors.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
          COLOR DE FONDO (CHROMA KEY)
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={config.chromaColor || '#00FF00'}
            onChange={(e) => handleDirectSave('chromaColor', e.target.value)}
            style={{ ...inputStyle, fontSize: '14px', padding: '12px', width: '300px' }}
          >
            {chromaColors.map(color => (
              <option key={color.value} value={color.value}>{color.label}</option>
            ))}
          </select>
          <div style={{ width: '40px', height: '40px', backgroundColor: config.chromaColor || '#00FF00', border: `2px solid ${colors.border}`, borderRadius: '4px' }}></div>
        </div>
      </div>

      {/* SECCIÓN 2: ORIGEN DE DATOS */}
      <div style={{ marginTop: '20px', backgroundColor: colors.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        
        {/* SELECTOR DE PROVEEDOR */}
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
          PROVEEDOR DE TIEMPOS (TIMING)
        </label>
        <select
          value={provider}
          onChange={(e) => handleDirectSave('timingProvider', e.target.value)}
          style={{ ...inputStyle, fontSize: '14px', padding: '12px', marginBottom: '20px', width: '100%', cursor: 'pointer' }}
        >
          <option value="speedhive">Speedhive (MyLaps)</option>
          <option value="racemonitor">Race Monitor</option>
        </select>

        {/* INPUT DEL CÓDIGO */}
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
          CÓDIGO DE LA CARRERA
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: colors.bgApp, padding: '10px', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
          
          <span style={{ color: colors.textMuted, fontSize: '14px' }}>
            {provider === 'racemonitor' ? 'https://www.race-monitor.com/Live/Race/' : 'https://speedhive.mylaps.com/livetiming/'}
          </span>
          
          <input
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value)}
            onBlur={() => handleDirectSave('speedhiveCode', localCode.trim())} // Guarda en JSON al salir
            style={{ ...inputStyle, fontSize: '14px', padding: '10px', textTransform: 'none', flex: 1, backgroundColor: colors.bgPanel, color: colors.yellow }}
            placeholder={provider === 'racemonitor' ? "Ej: 169244" : "Ej: 74582"}
          />
          
          {provider === 'speedhive' && (
            <span style={{ color: colors.textMuted, fontSize: '14px' }}>/active</span>
          )}
        </div>
        
        {/* Botón rápido para testear */}
        <div style={{ marginTop: '15px' }}>
          <button onClick={handleScrape} style={{ ...btnStyle(true), width: 'auto', padding: '10px 30px' }}>
            🔄 CARGAR DATOS AHORA
          </button>
        </div>
        
      </div>
    </div>
  );
}