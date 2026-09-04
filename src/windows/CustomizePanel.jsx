import { useState, useRef } from 'react';

export default function CustomizePanel({ config, positions, defaultPositions, onUpdatePositions, onSelectLogo, onSelectCategoryLogo, onSelectPhotosFolder, onClearLogo, onClearCategoryLogo, onClearPhotosFolder, onConfigChange, colors, inputStyle, btnStyle }) {
  const [selectedGraphic, setSelectedGraphic] = useState('relator');
  
  const dragInfo = useRef({ isDragging: false, id: null, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const previewRef = useRef(null); 

  const PREVIEW_SCALE = 0.42;

  const handlePreviewMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation(); 
    setSelectedGraphic(id);
    const pos = positions[id] || defaultPositions[id] || {x:0, y:0, scale:1};
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
    const pos = positions[id] || defaultPositions[id] || {x:0,y:0,scale:1};
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
        <span style={{ color: config.themeTitleText || '#888888', fontSize: '11px', fontWeight: 'bold' }}>{label}</span><br/>
        <span style={{ color: config.themeNormalText || '#ffffff', fontSize: '22px', fontWeight: 'bold' }}>{config[id] || 'ÁREA DE GRÁFICA'}</span>
      </div>
    );
  };

  const allGraphics = [
    { id: 'relator', label: 'RELATOR' }, { id: 'comentarista', label: 'COMENTARISTA' }, { id: 'notero1', label: 'NOTERO 1' }, { id: 'notero2', label: 'NOTERO 2' },
    { id: 'circuito', label: 'CIRCUITO' }, { id: 'clima', label: 'CLIMA' }, { id: 'ticker', label: 'TIRA INFERIOR' }, { id: 'tower', label: 'TORRE POSICIONES' },
    { id: 'grid', label: 'GRILLA PARTIDA' }, { id: 'finalResults', label: 'RESULTADOS FINALES' }, { id: 'winner', label: 'GANADOR' },
    { id: 'flags', label: 'BANDERAS DE ALERTA' }, { id: 'fastestLap', label: 'RECORD DE VUELTA' },
    { id: 'driverInfo', label: 'INFO DEL PILOTO' }, { id: 'battle', label: 'BATALLA (F1)' }, { id: 'customZocalo', label: 'ZÓCALO LIBRE' },
    { id: 'votingQR', label: 'QR DE VOTACIÓN' }, { id: 'votingResults', label: 'RESULTADOS DE VOTACIÓN' },
    { id: 'lapCounter', label: 'CONTADOR DE VUELTAS' }
  ];

  const colorSettings = [
    { id: 'themeMain', label: 'BORDES / LÍNEAS', default: '#e74c3c' }, { id: 'themeSecondary', label: 'CAJAS / SECUNDARIO', default: '#3498db' },
    { id: 'themeAccent', label: 'ACENTO / POSICIÓN', default: '#f39c12' }, { id: 'themeBg', label: 'FONDO GENERAL', default: '#1a1a1a' },
    { id: 'themeHeaderBg', label: 'FONDO ENCABEZADOS', default: '#000000' }, { id: 'themeTitleText', label: 'TEXTO TÍTULOS', default: '#ffcc00' },
    { id: 'themeNormalText', label: 'TEXTO NOMBRES', default: '#ffffff' }, { id: 'themeNumberText', label: 'TEXTO TIEMPOS', default: '#bdc3c7' }
  ];

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: colors.bgApp }} onMouseMove={handlePreviewMouseMove} onMouseUp={handlePreviewMouseUp} onMouseLeave={handlePreviewMouseUp} >
      <div style={{ width: '380px', minWidth: '380px', backgroundColor: colors.bgPanel, padding: '20px', overflowY: 'auto', borderRight: `1px solid ${colors.border}`, zIndex: 100 }}>
        
        <h3 style={{ color: colors.yellow, marginTop: 0, marginBottom: '15px' }}>SELECCIONAR GRÁFICA</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '30px' }}>
          {allGraphics.map(graphic => (
            <button key={graphic.id} onClick={() => setSelectedGraphic(graphic.id)} style={{...btnStyle(selectedGraphic === graphic.id), padding: '8px 5px', fontSize: '9px'}}> {graphic.label} </button>
          ))}
        </div>
        
        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>CONFIGURACIÓN VISUAL (TEMA)</h3>
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

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>TEXTO Y TIPOGRAFÍA</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>TIPOGRAFÍA GENERAL</label>
            <select value={config.fontFamily || 'Arial, sans-serif'} onChange={(e) => onConfigChange('fontFamily', e.target.value)} style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}>
              <option value="Arial, sans-serif">Arial (Clásica)</option>
              <option value="'Oswald', sans-serif">Oswald (TV)</option>
              <option value="'Montserrat', sans-serif">Montserrat (Moderna)</option>
              <option value="'Teko', sans-serif">Teko (Racing)</option>
              <option value="'Exo 2', sans-serif">Exo 2 (Futurista)</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>FORMATO NOMBRES</label>
            <select value={config.nameFormat || 'original'} onChange={(e) => onConfigChange('nameFormat', e.target.value)} style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}>
              <option value="original">Original</option>
              <option value="uppercase">MAYÚSCULAS</option>
              <option value="firstInitialLast">R. Borla</option>
              <option value="firstLastInitial">Roman B.</option>
              <option value="lastOnly">Borla (Solo Apellido)</option>
            </select>
          </div>
        </div>

        {/* --- SELECTORES INTELIGENTES CONDICIONALES --- */}
        {selectedGraphic === 'grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>FORMATO DE GRILLA DE PARTIDA</label>
            <select 
              value={config.gridFormat || 'standard'} 
              onChange={(e) => onConfigChange('gridFormat', e.target.value)} 
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásica (Cajas Pequeñas)</option>
              <option value="photos">Fila x Fila (Fotos Gigantes F1)</option>
            </select>
          </div>
        )}

        {selectedGraphic === 'battle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>FORMATO DE BATALLA</label>
            <select 
              value={config.battleFormat || 'vertical'} 
              onChange={(e) => onConfigChange('battleFormat', e.target.value)} 
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="vertical">Vertical (Clásica / Apilados)</option>
              <option value="horizontal">Horizontal (Lado a Lado / WEC)</option>
            </select>
          </div>
        )}
        {/* --------------------------------------------- */}

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>ESTILO: {allGraphics.find(g => g.id === selectedGraphic)?.label}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>BORDES (REDONDEO)</label>
            <select 
              value={config[`borderRadius_${selectedGraphic}`] || '8px'} 
              onChange={(e) => onConfigChange(`borderRadius_${selectedGraphic}`, e.target.value)} 
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer' }}
            >
              <option value="0px">0px (Cuadrados)</option>
              <option value="8px">8px (Normal)</option>
              <option value="16px">16px (Redondeados)</option>
              <option value="30px">30px (Píldora)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>ANIMACIÓN (ENTRADA)</label>
            <select 
              value={config[`animationStyle_${selectedGraphic}`] || 'slide'} 
              onChange={(e) => onConfigChange(`animationStyle_${selectedGraphic}`, e.target.value)} 
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer' }}
            >
              <option value="slide">Deslizar (Slide)</option>
              <option value="fade">Desvanecer (Fade)</option>
              <option value="zoom">Aumentar (Zoom)</option>
            </select>
          </div>
        </div>

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>COORDENADAS Y TAMAÑO</h3>
        {positions[selectedGraphic] && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>EJE X</label><input type="number" value={positions[selectedGraphic].x} onChange={(e) => handlePosChange('x', e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>EJE Y</label><input type="number" value={positions[selectedGraphic].y} onChange={(e) => handlePosChange('y', e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>ESCALA</label><input type="number" step="0.1" value={positions[selectedGraphic].scale} onChange={(e) => handlePosChange('scale', e.target.value)} style={inputStyle} /></div>
            </div>
            <button onClick={handleResetPosition} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: '1px solid #e74c3c' }}> 🔄 RESTABLECER POSICIÓN </button>
          </div>
        )}

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>RECURSOS MULTIMEDIA</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>LOGO PRODUCTORA</span>
            <div style={{ backgroundColor: '#000', height: '60px', borderRadius: '4px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {config.logo ? <img src={config.logo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{fontSize: '10px', color: '#444'}}>VACÍO</span>}
            </div>
            <button onClick={onSelectLogo} style={{...btnStyle(false), padding: '6px', fontSize: '9px'}}>📷 CARGAR</button>
            {config.logo && <button onClick={onClearLogo} style={{...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '6px', fontSize: '9px'}}>🗑️ QUITAR</button>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>LOGO CATEGORÍA</span>
            <div style={{ backgroundColor: '#000', height: '60px', borderRadius: '4px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {config.categoryLogo ? <img src={config.categoryLogo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{fontSize: '10px', color: '#444'}}>VACÍO</span>}
            </div>
            <button onClick={onSelectCategoryLogo} style={{...btnStyle(false), padding: '6px', fontSize: '9px'}}>📷 CARGAR</button>
            {config.categoryLogo && <button onClick={onClearCategoryLogo} style={{...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '6px', fontSize: '9px'}}>🗑️ QUITAR</button>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '25px', backgroundColor: '#111', padding: '10px', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>CARPETA FOTOS DE PILOTOS</span>
            <div style={{ fontSize: '10px', color: config.photosPath ? colors.green : '#555', wordBreak: 'break-all', marginBottom: '5px' }}>
              {config.photosPath ? config.photosPath : 'Ninguna carpeta seleccionada.'}
            </div>
            <button onClick={onSelectPhotosFolder} style={{...btnStyle(false), padding: '8px', fontSize: '10px'}}>📁 ELEGIR CARPETA</button>
            {config.photosPath && <button onClick={onClearPhotosFolder} style={{...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '8px', fontSize: '10px'}}>🗑️ QUITAR CARPETA</button>}
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
                <div style={{ position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px 20px', fontSize: '26px', fontWeight: 'bold', zIndex: 999 }}>
                  MONITOR PREVIO (1920x1080)
                </div>
                
                {allGraphics
                  .filter(graphic => graphic.id === selectedGraphic)
                  .map(graphic => renderPreviewGraphic(graphic.id, graphic.label))}
            </div>
        </div>
      </div>
    </div>
  );
}