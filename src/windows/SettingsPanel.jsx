import { useState, useEffect } from 'react';
import { LANGUAGES } from '../i18n/translations';

export default function SettingsPanel({ config, handleDirectSave, handleScrape, colors, inputStyle, btnStyle, t, language, setLanguage }) {

  const chromaColors = [
    { label: t('ajustes.chromaGreen'), value: '#00FF00' },
    { label: t('ajustes.chromaBlue'), value: '#0000FF' },
    { label: t('ajustes.chromaMagenta'), value: '#FF00FF' },
    { label: t('ajustes.chromaBlack'), value: '#000000' },
    { label: t('ajustes.chromaWhite'), value: '#FFFFFF' },
    { label: t('ajustes.chromaYellow'), value: '#FFFF00' }
  ];

  const [localCode, setLocalCode] = useState(config.speedhiveCode || '');
  const provider = config.timingProvider || 'speedhive';

  useEffect(() => {
    setLocalCode(config.speedhiveCode || '');
  }, [config.speedhiveCode]);

  return (
    <div style={{ flex: 1, padding: '30px', backgroundColor: colors.bgApp, overflowY: 'auto' }}>
      <h2 style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', color: colors.yellow, marginTop: 0 }}>
        {t('ajustes.title')}
      </h2>

      {/* SECCIÓN: IDIOMA */}
      <div style={{ marginTop: '20px', backgroundColor: colors.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
          {t('ajustes.languageLabel')}
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ ...inputStyle, fontSize: '14px', padding: '12px', width: '300px', cursor: 'pointer' }}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
      </div>

      {/* SECCIÓN 1: CHROMA KEY */}
      <div style={{ marginTop: '20px', backgroundColor: colors.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
          {t('ajustes.chromaLabel')}
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
          {t('ajustes.providerLabel')}
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
          {t('ajustes.codeLabel')}
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
            {t('ajustes.loadNowBtn')}
          </button>
        </div>

      </div>
    </div>
  );
}
