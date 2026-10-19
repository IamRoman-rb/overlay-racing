import { useState, useRef } from 'react';
import { SKIN_FORMATS } from '../utils/skinStyles';

export default function CustomizePanel({ config, positions, defaultPositions, onUpdatePositions, onSelectLogo, onSelectCategoryLogo, onSelectPhotosFolder, onClearLogo, onClearCategoryLogo, onClearPhotosFolder, onConfigChange, colors, inputStyle, btnStyle, t }) {
  const [selectedGraphic, setSelectedGraphic] = useState('relator');

  const skinLabels = { pro: t('personalizar.skinPro'), gradient: t('personalizar.skinGradient'), glass: t('personalizar.skinGlass') };
  const renderSkinOptions = () => SKIN_FORMATS.map(value => (
    <option key={value} value={value}>{skinLabels[value] || value}</option>
  ));

  const dragInfo = useRef({ isDragging: false, id: null, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const previewRef = useRef(null);

  const PREVIEW_SCALE = 0.42;

  const handlePreviewMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedGraphic(id);
    const pos = positions[id] || defaultPositions[id] || { x: 0, y: 0, scale: 1 };
    dragInfo.current = { isDragging: true, id, startX: e.clientX, startY: e.clientY, initialX: pos.x, initialY: pos.y };
  };

  const handlePreviewMouseMove = (e) => {
    if (!dragInfo.current.isDragging || !previewRef.current) return;
    const { id, startX, startY, initialX, initialY } = dragInfo.current;

    const rect = previewRef.current.getBoundingClientRect();
    const actualScale = rect.width / 1920;

    const dx = (e.clientX - startX) / actualScale;
    const dy = (e.clientY - startY) / actualScale;

    const newX = Math.round(initialX + dx);
    const newY = Math.round(initialY + dy);

    const newPositions = { ...positions, [id]: { ...positions[id], x: newX, y: newY } };
    onUpdatePositions(newPositions, false);
  };

  const handlePreviewMouseUp = () => {
    if (dragInfo.current.isDragging) {
      dragInfo.current.isDragging = false;
      onUpdatePositions(positions, true);
    }
  };

  const handlePosChange = (axis, value) => {
    const valNum = parseFloat(value) || 0;
    const newPositions = { ...positions, [selectedGraphic]: { ...positions[selectedGraphic], [axis]: valNum } };
    onUpdatePositions(newPositions, true);
  };

  const handleResetPosition = () => {
    const defaultPos = defaultPositions[selectedGraphic];
    if (!defaultPos) return;
    const newPositions = { ...positions, [selectedGraphic]: { ...defaultPos } };
    onUpdatePositions(newPositions, true);
  };

  const renderPreviewGraphic = (id, label) => {
    const pos = positions[id] || defaultPositions[id] || { x: 0, y: 0, scale: 1 };
    const isSelected = selectedGraphic === id;

    const currentRadius = config[`borderRadius_${id}`] || '8px';

    return (
      <div
        key={id}
        onMouseDown={(e) => handlePreviewMouseDown(e, id)}
        style={{
          position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transform: `scale(${pos.scale})`, transformOrigin: 'top left',
          cursor: dragInfo.current.isDragging && isSelected ? 'grabbing' : 'grab',
          border: isSelected ? `4px dashed ${config.themeAccent || '#ffcc00'}` : 'none',
          backgroundColor: config.themeBg || 'rgba(0, 0, 0, 0.85)',
          padding: '10px 20px', minWidth: '250px',
          borderLeft: `4px solid ${config.themeMain || '#e74c3c'}`,
          borderRadius: currentRadius,
          userSelect: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
          zIndex: isSelected ? 50 : 10
        }}
      >
        <span style={{ color: config.themeTitleText || '#888888', fontSize: '11px', fontWeight: 'bold' }}>{label}</span><br />
        <span style={{ color: config.themeNormalText || '#ffffff', fontSize: '22px', fontWeight: 'bold' }}>{config[id] || t('personalizar.previewPlaceholder')}</span>
      </div>
    );
  };

  const GRAPHIC_IDS = [
    'relator', 'comentarista', 'notero1', 'notero2', 'circuito', 'clima', 'ticker', 'tower',
    'grid', 'finalResults', 'winner', 'flags', 'fastestLap', 'driverInfo', 'battle', 'customZocalo',
    'votingQR', 'votingResults', 'lapCounter', 'virtualChamp', 'pitStop', 'startingLights',
    'lapTimesHistory', 'trackAlert', 'penaltyAlert'
  ];
  const allGraphics = GRAPHIC_IDS.map(id => ({ id, label: t(`graphics.${id}`) }));

  const colorSettings = [
    { id: 'themeMain', label: t('personalizar.colorBorder'), default: '#e74c3c' }, { id: 'themeSecondary', label: t('personalizar.colorSecondary'), default: '#3498db' },
    { id: 'themeAccent', label: t('personalizar.colorAccent'), default: '#f39c12' }, { id: 'themeBg', label: t('personalizar.colorBg'), default: '#1a1a1a' },
    { id: 'themeHeaderBg', label: t('personalizar.colorHeaderBg'), default: '#000000' }, { id: 'themeTitleText', label: t('personalizar.colorTitleText'), default: '#ffcc00' },
    { id: 'themeNormalText', label: t('personalizar.colorNormalText'), default: '#ffffff' }, { id: 'themeNumberText', label: t('personalizar.colorNumberText'), default: '#bdc3c7' }
  ];

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: colors.bgApp }} onMouseMove={handlePreviewMouseMove} onMouseUp={handlePreviewMouseUp} onMouseLeave={handlePreviewMouseUp} >
      <div style={{ width: '380px', minWidth: '380px', backgroundColor: colors.bgPanel, padding: '20px', overflowY: 'auto', borderRight: `1px solid ${colors.border}`, zIndex: 100 }}>

        <h3 style={{ color: colors.yellow, marginTop: 0, marginBottom: '15px' }}>{t('personalizar.selectGraphic')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '30px' }}>
          {allGraphics.map(graphic => (
            <button key={graphic.id} onClick={() => setSelectedGraphic(graphic.id)} style={{ ...btnStyle(selectedGraphic === graphic.id), padding: '8px 5px', fontSize: '9px' }}> {graphic.label} </button>
          ))}
        </div>

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>{t('personalizar.themeConfig')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
          {colorSettings.map(c => (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#ccc', textTransform: 'uppercase' }}>{c.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.bgInput, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                <input type="color" value={config[c.id] || c.default} onChange={(e) => onConfigChange(c.id, e.target.value)} style={{ width: '22px', height: '22px', cursor: 'pointer', border: 'none', padding: 0, backgroundColor: 'transparent' }} />
                <span style={{ fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }}>{config[c.id] || c.default}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>{t('personalizar.textTypography')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.fontLabel')}</label>
            <select value={config.fontFamily || 'Arial, sans-serif'} onChange={(e) => onConfigChange('fontFamily', e.target.value)} style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}>
              <option value="Arial, sans-serif">{t('personalizar.fontArial')}</option>
              <option value="'Oswald', sans-serif">{t('personalizar.fontOswald')}</option>
              <option value="'Montserrat', sans-serif">{t('personalizar.fontMontserrat')}</option>
              <option value="'Teko', sans-serif">{t('personalizar.fontTeko')}</option>
              <option value="'Exo 2', sans-serif">{t('personalizar.fontExo')}</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.nameFormatLabel')}</label>
            <select value={config.nameFormat || 'original'} onChange={(e) => onConfigChange('nameFormat', e.target.value)} style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}>
              <option value="original">{t('personalizar.nameOriginal')}</option>
              <option value="uppercase">{t('personalizar.nameUppercase')}</option>
              <option value="firstInitialLast">{t('personalizar.nameFirstInitialLast')}</option>
              <option value="firstLastInitial">{t('personalizar.nameFirstLastInitial')}</option>
              <option value="lastOnly">{t('personalizar.nameLastOnly')}</option>
            </select>
          </div>
        </div>

        {selectedGraphic === 'grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.grid') })}</label>
            <select
              value={config.gridFormat || 'standard'}
              onChange={(e) => onConfigChange('gridFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásica (Cajas Pequeñas)</option>
              <option value="photos">Fila x Fila (Fotos Gigantes F1)</option>
              <option value="cinematic">Cinematic (Grilla + Foto Central + Info)</option>
              {renderSkinOptions()}
            </select>
            {(config.gridFormat || 'standard') !== 'photos' && (config.gridFormat || 'standard') !== 'cinematic' && (
              <>
                <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', marginTop: '15px' }}>{t('personalizar.gridPerPageLabel')}</label>
                <select
                  value={config.gridPerPage || 2}
                  onChange={(e) => onConfigChange('gridPerPage', parseInt(e.target.value, 10))}
                  style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
                >
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n === 1 ? t('personalizar.gridPerPageOne') : t('personalizar.gridPerPageOption', { n })}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}

        {['relator', 'comentarista', 'notero1', 'notero2', 'circuito'].includes(selectedGraphic) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.lowerThirdFormatLabel')}</label>
            <select
              value={config[`lowerThirdFormat_${selectedGraphic}`] || 'standard'}
              onChange={(e) => onConfigChange(`lowerThirdFormat_${selectedGraphic}`, e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Barra Lateral)</option>
              <option value="minimal">Minimalista (Solo Línea)</option>
              <option value="boxed">Con Marco (Badge + Caja)</option>
              <option value="broadcast">Broadcast (Bloques Bicolor)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'pitStop' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.pitStop') })}</label>
            <select
              value={config.pitStopFormat || 'standard'}
              onChange={(e) => onConfigChange('pitStopFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Header + Fila)</option>
              <option value="compact">Compacto (Una Línea)</option>
              <option value="stopwatch">Cronómetro (Tiempo Protagonista)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'startingLights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.startingLights') })}</label>
            <select
              value={config.startingLightsFormat || 'classic'}
              onChange={(e) => onConfigChange('startingLightsFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="classic">Clásico (Fila de 5 Luces)</option>
              <option value="towers">Torres (Columnas Estilo F1)</option>
              <option value="countdown">Cuenta Regresiva (Número Gigante)</option>
              <option value="minimal">Minimalista (Luces Chicas)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'lapCounter' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.lapCounter') })}</label>
            <select
              value={config.lapCounterFormat || 'standard'}
              onChange={(e) => onConfigChange('lapCounterFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Solo Número)</option>
              <option value="labeled">Con Etiqueta (Barra "VUELTA")</option>
              <option value="circle">Círculo (Insignia Redonda)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'virtualChamp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.virtualChamp') })}</label>
            <select
              value={config.virtualChampFormat || 'standard'}
              onChange={(e) => onConfigChange('virtualChampFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Top 10 con Puntos Sumados)</option>
              <option value="compact">Compacto (Top 15, Filas Angostas)</option>
              <option value="podium">Podio (Colores Oro/Plata/Bronce)</option>
              <option value="minimal">Minimalista (Sin Header)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'votingQR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.votingQR') })}</label>
            <select
              value={config.votingQRFormat || 'standard'}
              onChange={(e) => onConfigChange('votingQRFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Header + QR + Texto)</option>
              <option value="compact">Compacto (QR Chico + Texto al Lado)</option>
              <option value="banner">Banner (Ancho, QR a la Izquierda)</option>
              <option value="minimal">Minimalista (Solo QR)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'votingResults' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.votingResults') })}</label>
            <select
              value={config.votingResultsFormat || 'standard'}
              onChange={(e) => onConfigChange('votingResultsFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Header + Barras + Total)</option>
              <option value="compact">Compacto (Sin Header ni Total)</option>
              <option value="podium">Podio (Colores Oro/Plata/Bronce)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'lapTimesHistory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.lapTimesHistory') })}</label>
            <select
              value={config.lapTimesHistoryFormat || 'standard'}
              onChange={(e) => onConfigChange('lapTimesHistoryFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Gráfico + Leyenda)</option>
              <option value="compact">Compacto (Sin Leyenda, Más Chico)</option>
              <option value="large">Grande (Gráfico Ampliado)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              <option value="table">Tabla (Últimas 4 Vueltas, Estilo F1)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'trackAlert' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.trackAlert') })}</label>
            <select
              value={config.trackAlertFormat || 'standard'}
              onChange={(e) => onConfigChange('trackAlertFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Con Mapa de Circuito)</option>
              <option value="compact">Compacto (Una Línea, Sin Mapa)</option>
              <option value="banner">Banner (Barra Completa)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'customZocalo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.customZocalo') })}</label>
            <select
              value={config.customZocaloFormat || 'standard'}
              onChange={(e) => onConfigChange('customZocaloFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Logos + Texto)</option>
              <option value="banner">Banner (Barra Completa)</option>
              <option value="boxed">Con Marco (Badge + Caja)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'driverInfo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.driverInfo') })}</label>
            <select
              value={config.driverInfoFormat || 'standard'}
              onChange={(e) => onConfigChange('driverInfoFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Bloques Pos/Número)</option>
              <option value="photo">Foto (Retrato + Datos)</option>
              <option value="compact">Compacto (Una Línea)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'winner' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.winner') })}</label>
            <select
              value={config.winnerFormat || 'standard'}
              onChange={(e) => onConfigChange('winnerFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Cartel Horizontal)</option>
              <option value="photo">Foto (Retrato Grande)</option>
              <option value="podium">Podio (Tarjeta Campeón)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'fastestLap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.fastestLap') })}</label>
            <select
              value={config.fastestLapFormat || 'standard'}
              onChange={(e) => onConfigChange('fastestLapFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Header + Fila)</option>
              <option value="compact">Compacto (Una Línea)</option>
              <option value="spotlight">Spotlight (Tiempo Protagonista)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'finalResults' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.finalResults') })}</label>
            <select
              value={config.finalResultsFormat || 'standard'}
              onChange={(e) => onConfigChange('finalResultsFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Tabla Completa)</option>
              <option value="compact">Compacto (Sin Vueltas/Mejor V., Más Filas)</option>
              <option value="podium">Podio (Colores Oro/Plata/Bronce)</option>
              <option value="minimal">Minimalista (Sin Caja ni Header)</option>
              <option value="broadcast">Broadcast (Tabla + Foto del Ganador, Estilo F1)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'clima' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.clima') })}</label>
            <select
              value={config.climaFormat || 'standard'}
              onChange={(e) => onConfigChange('climaFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Tarjeta con Detalle)</option>
              <option value="compact">Compacto (Solo Ícono y Temp.)</option>
              <option value="vertical">Vertical (Columna Angosta)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'flags' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.flags') })}</label>
            <select
              value={config.flagsFormat || 'standard'}
              onChange={(e) => onConfigChange('flagsFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásica (Cartel Centrado)</option>
              <option value="banner">Banner (Barra Completa)</option>
              <option value="corner">Esquina (Banderín Compacto)</option>
              <option value="stacked">Apilada (Franja + Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'tower' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.tower') })}</label>
            <select
              value={config.towerFormat || 'standard'}
              onChange={(e) => onConfigChange('towerFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásica (Header + Filas)</option>
              <option value="compact">Compacta (Sin Tendencia ni Tiempo)</option>
              <option value="podium">Podio (Colores Oro/Plata/Bronce)</option>
              <option value="minimal">Minimalista (Filas Cebra, Sin Header)</option>
              {renderSkinOptions()}
            </select>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', marginTop: '15px' }}>{t('personalizar.towerBlurLabel')}</label>
            <select
              value={config.towerBlur === undefined || config.towerBlur === '' ? 6 : config.towerBlur}
              onChange={(e) => onConfigChange('towerBlur', parseInt(e.target.value, 10))}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value={0}>{t('personalizar.blurNone')}</option>
              <option value={6}>{t('personalizar.blurSoft')}</option>
              <option value={12}>{t('personalizar.blurMedium')}</option>
              <option value={20}>{t('personalizar.blurStrong')}</option>
            </select>
          </div>
        )}

        {selectedGraphic === 'ticker' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.ticker') })}</label>
            <select
              value={config.tickerFormat || 'standard'}
              onChange={(e) => onConfigChange('tickerFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásica (Scroll Continuo)</option>
              <option value="compact">Compacta (Sin Tiempo, Más Pilotos)</option>
              <option value="podium">Podio (Colores Oro/Plata/Bronce)</option>
              <option value="spotlight">Spotlight (Un Piloto a la Vez)</option>
              <option value="board">Tablero (3 Columnas x 4 Filas, Estilo TC)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'battle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.battle') })}</label>
            <select
              value={config.battleFormat || 'vertical'}
              onChange={(e) => onConfigChange('battleFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="vertical">Vertical (Clásica / Apilados)</option>
              <option value="horizontal">Horizontal (Lado a Lado / WEC)</option>
              <option value="compact">Compacta (Filas Angostas)</option>
              <option value="duel">Duelo (1 vs 1 con "VS")</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        {selectedGraphic === 'penaltyAlert' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.penaltyAlert') })}</label>
            <select
              value={config.penaltyAlertFormat || 'card'}
              onChange={(e) => onConfigChange('penaltyAlertFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="card">Tarjeta (Cuadrada, con badge)</option>
              <option value="f1bar">Barra F1 (Fina, Horizontal, Superior)</option>
              <option value="corner">Esquina (Franja Lateral Compacta)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
          </div>
        )}

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>{t('personalizar.styleOf', { name: allGraphics.find(g => g.id === selectedGraphic)?.label })}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.borderRadiusLabel')}</label>
            <select
              value={config[`borderRadius_${selectedGraphic}`] || '8px'}
              onChange={(e) => onConfigChange(`borderRadius_${selectedGraphic}`, e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer' }}
            >
              <option value="0px">{t('personalizar.radius0')}</option>
              <option value="8px">{t('personalizar.radius8')}</option>
              <option value="16px">{t('personalizar.radius16')}</option>
              <option value="30px">{t('personalizar.radius30')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.animationLabel')}</label>
            <select
              value={config[`animationStyle_${selectedGraphic}`] || 'slide'}
              onChange={(e) => onConfigChange(`animationStyle_${selectedGraphic}`, e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer' }}
            >
              <option value="slide">{t('personalizar.animSlide')}</option>
              <option value="fade">{t('personalizar.animFade')}</option>
              <option value="zoom">{t('personalizar.animZoom')}</option>
              <option value="bounce">{t('personalizar.animBounce')}</option>
              <option value="flip">{t('personalizar.animFlip')}</option>
              <option value="rotate">{t('personalizar.animRotate')}</option>
            </select>
          </div>
        </div>

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>{t('personalizar.coordsTitle')}</h3>
        {positions[selectedGraphic] && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>{t('personalizar.axisX')}</label><input type="number" value={positions[selectedGraphic].x} onChange={(e) => handlePosChange('x', e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>{t('personalizar.axisY')}</label><input type="number" value={positions[selectedGraphic].y} onChange={(e) => handlePosChange('y', e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>{t('personalizar.scaleLabel')}</label><input type="number" step="0.1" value={positions[selectedGraphic].scale} onChange={(e) => handlePosChange('scale', e.target.value)} style={inputStyle} /></div>
            </div>
            <button onClick={handleResetPosition} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: '1px solid #e74c3c' }}> {t('personalizar.resetPositionBtn')} </button>
          </div>
        )}

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>{t('personalizar.mediaTitle')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.producerLogo')}</span>
            <div style={{ backgroundColor: '#000', height: '60px', borderRadius: '4px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {config.logo ? <img src={config.logo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{ fontSize: '10px', color: '#444' }}>{t('common.emptyLabel')}</span>}
            </div>
            <button onClick={onSelectLogo} style={{ ...btnStyle(false), padding: '6px', fontSize: '9px' }}>{t('common.loadBtn')}</button>
            {config.logo && <button onClick={onClearLogo} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '6px', fontSize: '9px' }}>{t('common.removeBtn')}</button>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.categoryLogo')}</span>
            <div style={{ backgroundColor: '#000', height: '60px', borderRadius: '4px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {config.categoryLogo ? <img src={config.categoryLogo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{ fontSize: '10px', color: '#444' }}>{t('common.emptyLabel')}</span>}
            </div>
            <button onClick={onSelectCategoryLogo} style={{ ...btnStyle(false), padding: '6px', fontSize: '9px' }}>{t('common.loadBtn')}</button>
            {config.categoryLogo && <button onClick={onClearCategoryLogo} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '6px', fontSize: '9px' }}>{t('common.removeBtn')}</button>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '25px', backgroundColor: '#111', padding: '10px', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
          <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.photosFolder')}</span>
          <div style={{ fontSize: '10px', color: config.photosPath ? colors.green : '#555', wordBreak: 'break-all', marginBottom: '5px' }}>
            {config.photosPath ? config.photosPath : t('personalizar.noFolderSelected')}
          </div>
          <button onClick={onSelectPhotosFolder} style={{ ...btnStyle(false), padding: '8px', fontSize: '10px' }}>{t('personalizar.chooseFolderBtn')}</button>
          {config.photosPath && <button onClick={onClearPhotosFolder} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '8px', fontSize: '10px' }}>{t('personalizar.removeFolderBtn')}</button>}
        </div>

      </div>

      <div style={{ flex: 1, backgroundColor: colors.bgApp, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{
          width: 1920 * PREVIEW_SCALE, height: 1080 * PREVIEW_SCALE,
          minWidth: 1920 * PREVIEW_SCALE, minHeight: 1080 * PREVIEW_SCALE,
          flexShrink: 0, position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,1)'
        }}>
          <div
            ref={previewRef}
            style={{
              width: '1920px', height: '1080px',
              backgroundColor: config.chromaColor || '#00FF00',
              position: 'absolute', top: 0, left: 0,
              transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left',
              border: '4px solid #555', boxSizing: 'border-box', overflow: 'hidden',
              fontFamily: config.fontFamily || 'Arial, sans-serif'
            }}
          >
            <style>
              {`@import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,700;0,900;1,900&family=Montserrat:ital,wght@0,400;0,700;0,900;1,900&family=Oswald:wght@400;700&family=Teko:wght@400;600;700&display=swap');`}
            </style>
            {allGraphics
              .filter(graphic => graphic.id === selectedGraphic)
              .map(graphic => renderPreviewGraphic(graphic.id, graphic.label))}
          </div>
        </div>
      </div>
    </div>
  );
}
