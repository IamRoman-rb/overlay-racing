import { useState, useEffect, useRef } from 'react';
import { LANGUAGES } from '../i18n/translations';

export default function SettingsPanel({ config, handleDirectSave, handleScrape, colors, inputStyle, btnStyle, t, language, setLanguage, onExportSettings, onImportSettings, onResetAllPositions, scrapeErrorText }) {

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

  // Estado del botón "CARGAR DATOS AHORA": idle -> loading -> ok | error -> idle
  const [loadState, setLoadState] = useState('idle');
  const loadResetTimer = useRef(null);
  useEffect(() => () => { if (loadResetTimer.current) clearTimeout(loadResetTimer.current); }, []);

  const handleLoadNow = async () => {
    if (loadState === 'loading') return;
    if (loadResetTimer.current) clearTimeout(loadResetTimer.current);
    setLoadState('loading');

    // Si se escribió el código y se hizo clic directo en el botón, el guardado por onBlur puede no
    // haberse aplicado todavía: se guarda primero para que el scraper use el código nuevo.
    if (localCode.trim() !== (config.speedhiveCode || '')) {
      await handleDirectSave('speedhiveCode', localCode.trim());
      await new Promise(resolve => setTimeout(resolve, 60));
    }

    // Duración mínima del estado "cargando": si los datos llegan casi al instante, igual se ve la animación
    const startedAt = Date.now();
    const status = await handleScrape();
    const elapsed = Date.now() - startedAt;
    if (elapsed < 1000) await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
    const next = status === 'ok' ? 'ok' : (status === 'busy' ? 'idle' : 'error');
    setLoadState(next);
    if (next !== 'idle') {
      loadResetTimer.current = setTimeout(() => setLoadState('idle'), 2500);
    }
  };

  const loadBtnColors = {
    idle: { bg: colors.yellow, fg: '#000', border: colors.yellow },
    loading: { bg: '#b8960a', fg: '#000', border: colors.yellow },
    ok: { bg: '#2ecc71', fg: '#fff', border: '#27ae60' },
    error: { bg: '#e74c3c', fg: '#fff', border: '#c0392b' }
  }[loadState];
  const loadBtnLabel = {
    idle: t('ajustes.loadNowBtn'),
    loading: t('ajustes.loadingBtn'),
    ok: t('ajustes.loadedBtn'),
    error: t('ajustes.loadErrorBtn')
  }[loadState];

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
          <style>{`
            @keyframes loadBtnSpin { to { transform: rotate(360deg); } }
            @keyframes loadBtnPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 204, 0, 0.55); } 50% { box-shadow: 0 0 0 10px rgba(255, 204, 0, 0); } }
            @keyframes loadBtnShimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
            @keyframes loadBtnPop { 0% { transform: scale(0.85); } 60% { transform: scale(1.1); } 100% { transform: scale(1); } }
            @keyframes loadBtnShake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
            .load-now-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-width: 240px; transition: background-color 0.25s ease, border-color 0.25s ease, transform 0.15s ease; }
            .load-now-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(255, 204, 0, 0.35); }
            .load-now-btn.is-idle::after { content: ''; position: absolute; top: 0; bottom: 0; left: -60px; width: 40px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); transform: skewX(-20deg); transition: left 0.5s ease; }
            .load-now-btn.is-idle:hover::after { left: calc(100% + 20px); }
            .load-now-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); }
            .load-now-btn.is-loading { cursor: wait; animation: loadBtnPulse 1.2s ease-in-out infinite; }
            .load-now-btn.is-loading::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); background-size: 200px 100%; background-repeat: no-repeat; animation: loadBtnShimmer 1.1s linear infinite; }
            .load-now-btn.is-ok { animation: loadBtnPop 0.4s ease; }
            .load-now-btn.is-error { animation: loadBtnShake 0.45s ease; }
            .load-now-spinner { width: 14px; height: 14px; border: 3px solid rgba(0,0,0,0.25); border-top-color: #000; border-radius: 50%; animation: loadBtnSpin 0.7s linear infinite; }
          `}</style>
          <button
            onClick={handleLoadNow}
            disabled={loadState === 'loading'}
            className={`load-now-btn is-${loadState}`}
            style={{ ...btnStyle(true), width: 'auto', padding: '10px 30px', backgroundColor: loadBtnColors.bg, color: loadBtnColors.fg, borderColor: loadBtnColors.border }}
          >
            {loadState === 'loading' && <span className="load-now-spinner" />}
            {loadState === 'ok' && <span style={{ fontSize: '15px', lineHeight: 1 }}>✓</span>}
            {loadState === 'error' && <span style={{ fontSize: '15px', lineHeight: 1 }}>✕</span>}
            <span>{loadBtnLabel}</span>
          </button>
        </div>
        {scrapeErrorText && (
          <div style={{ marginTop: '15px', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: `1px solid ${colors.red}`, borderRadius: '6px', padding: '12px 16px', color: colors.red, fontSize: '12px', fontWeight: 'bold', lineHeight: '1.5', wordBreak: 'break-word' }}>
            ⚠️ {scrapeErrorText}
          </div>
        )}

      </div>

      {/* SECCIÓN 3: COPIA DE SEGURIDAD DE LA CONFIGURACIÓN */}
      <div style={{ marginTop: '20px', backgroundColor: colors.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
          {t('ajustes.backupSection')}
        </label>
        <p style={{ fontSize: '12px', color: colors.textMuted, lineHeight: '1.6', marginTop: 0, marginBottom: '15px', maxWidth: '700px' }}>
          {t('ajustes.backupDescription')}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onExportSettings} style={{ ...btnStyle(false), width: 'auto', padding: '10px 20px', backgroundColor: '#2ecc71', color: '#fff', borderColor: '#27ae60' }}>
            {t('ajustes.exportSettingsBtn')}
          </button>
          <button onClick={onImportSettings} style={{ ...btnStyle(false), width: 'auto', padding: '10px 20px', backgroundColor: '#d35400', color: '#fff', borderColor: '#e67e22' }}>
            {t('ajustes.importSettingsBtn')}
          </button>
        </div>
      </div>

      {/* SECCIÓN 4: RESTABLECER POSICIONES AL LAYOUT PRECONFIGURADO */}
      <div style={{ marginTop: '20px', backgroundColor: colors.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
          {t('ajustes.resetPositionsSection')}
        </label>
        <p style={{ fontSize: '12px', color: colors.textMuted, lineHeight: '1.6', marginTop: 0, marginBottom: '15px', maxWidth: '700px' }}>
          {t('ajustes.resetPositionsDescription')}
        </p>
        <button onClick={onResetAllPositions} style={{ ...btnStyle(false), width: 'auto', padding: '10px 20px', backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c' }}>
          {t('ajustes.resetAllPositionsBtn')}
        </button>
      </div>
    </div>
  );
}
