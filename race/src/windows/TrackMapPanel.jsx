// src/windows/TrackMapPanel.jsx
import { useState, useRef } from 'react';
import Icon from '../components/Icon';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch (e) {}
}

// Calcula el rectángulo real que ocupa la imagen dentro de un contenedor con backgroundSize:contain
function getContainedImageRect(containerW, containerH, imgW, imgH) {
  const containerRatio = containerW / containerH;
  const imgRatio = imgW / imgH;
  let renderW, renderH, offsetX, offsetY;
  if (imgRatio > containerRatio) {
    renderW = containerW;
    renderH = containerW / imgRatio;
    offsetX = 0;
    offsetY = (containerH - renderH) / 2;
  } else {
    renderH = containerH;
    renderW = containerH * imgRatio;
    offsetY = 0;
    offsetX = (containerW - renderW) / 2;
  }
  return { renderW, renderH, offsetX, offsetY };
}

export default function TrackMapPanel({ config, onConfigChange, colors, inputStyle, btnStyle, t }) {
  const [selectedCurveId, setSelectedCurveId] = useState(null);
  const dragInfo = useRef({ isDragging: false, curveId: null });
  const imgRef = useRef(null);

  const curves = config?.trackCurves || [];

  // TRAZADO del mapa en vivo (config.trackPath): puntos en % del lienzo, el primero es la línea de largada / llegada
  const [mode, setMode] = useState('curves'); // 'curves' | 'path'
  const trackPath = Array.isArray(config?.trackPath) ? config.trackPath : [];
  const pathDrag = useRef(null);
  const handlePathClick = (e) => {
    if (pathDrag.current?.moved) return;
    const { x, y } = getPercentFromEvent(e);
    onConfigChange?.('trackPath', [...trackPath, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }]);
  };
  const handlePathPointDown = (e, index) => {
    e.stopPropagation();
    pathDrag.current = { index, moved: false };
  };
  const handlePathMove = (e) => {
    if (!pathDrag.current) return;
    const { x, y } = getPercentFromEvent(e);
    pathDrag.current.moved = true;
    const next = trackPath.map((p, i) => (i === pathDrag.current.index ? { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : p));
    onConfigChange?.('trackPath', next);
  };
  const handlePathUp = () => { setTimeout(() => { pathDrag.current = null; }, 50); };
  const handlePathPointDelete = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    onConfigChange?.('trackPath', trackPath.filter((_, i) => i !== index));
  };
  const handleClearPath = () => {
    if (typeof window !== 'undefined' && !window.confirm(t('circuito.confirmClearPath'))) return;
    onConfigChange?.('trackPath', []);
  };
  const isPath = mode === 'path';

  const handleSelectImage = async () => {
    if (!ipcRenderer) return;
    try {
      const imgData = await ipcRenderer.invoke('select-track-image');
      if (imgData) onConfigChange?.('trackImage', imgData);
    } catch (e) {
      console.error('Error seleccionando imagen del circuito:', e);
    }
  };

  const handleClearImage = () => {
    if (typeof window !== 'undefined' && !window.confirm(t('circuito.confirmRemoveMap'))) {
      return;
    }
    onConfigChange?.('trackImage', null);
    onConfigChange?.('trackCurves', []);
    setSelectedCurveId(null);
  };

  const getPercentFromEvent = (e) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleImageClick = (e) => {
    if (dragInfo.current.isDragging) return; // evita agregar curva al soltar un drag
    const { x, y } = getPercentFromEvent(e);
    const newCurve = { id: `curve_${Date.now()}`, name: t('circuito.curveDefaultName', { n: curves.length + 1 }), x, y };
    const newCurves = [...curves, newCurve];
    onConfigChange?.('trackCurves', newCurves);
    setSelectedCurveId(newCurve.id);
  };

  const handleMarkerMouseDown = (e, curveId) => {
    e.stopPropagation();
    dragInfo.current = { isDragging: true, curveId };
    setSelectedCurveId(curveId);
  };

  const handleImageMouseMove = (e) => {
    if (!dragInfo.current.isDragging) return;
    const { x, y } = getPercentFromEvent(e);
    const newCurves = curves.map(c => c.id === dragInfo.current.curveId ? { ...c, x, y } : c);
    onConfigChange?.('trackCurves', newCurves);
  };

  const handleImageMouseUp = () => {
    setTimeout(() => { dragInfo.current = { isDragging: false, curveId: null }; }, 50);
  };

  const handleRenameCurve = (curveId, newName) => {
    const newCurves = curves.map(c => c.id === curveId ? { ...c, name: newName } : c);
    onConfigChange?.('trackCurves', newCurves);
  };

  const handleDeleteCurve = (curveId) => {
    onConfigChange?.('trackCurves', curves.filter(c => c.id !== curveId));
    if (selectedCurveId === curveId) setSelectedCurveId(null);
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ width: '320px', backgroundColor: colors.bgPanel, padding: '20px', overflowY: 'auto', borderRight: `1px solid ${colors.border}` }}>
        <h3 style={{ color: colors.yellow, marginTop: 0, marginBottom: '15px' }}>{t('circuito.title')}</h3>

        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
          <button onClick={handleSelectImage} style={{ ...btnStyle(false), flex: 1 }}>{t.i('circuito.loadImageBtn')}</button>
          {config?.trackImage && (
            <button onClick={handleClearImage} style={{ ...btnStyle(false), flex: 1, backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t.i('common.removeBtn')}</button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '15px' }}>
          <button onClick={() => setMode('curves')} style={{ ...btnStyle(!isPath), padding: '8px' }}>{t('circuito.modeCurves')}</button>
          <button onClick={() => setMode('path')} style={{ ...btnStyle(isPath), padding: '8px' }}>{t('circuito.modePath')}</button>
        </div>

        {isPath && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', color: colors.textMuted, marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }}>{t('circuito.pathInstructions')}</p>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: trackPath.length >= 3 ? colors.green : '#e67e22', marginBottom: '10px' }}>
              {t('circuito.pathPoints', { n: trackPath.length })}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <button onClick={() => onConfigChange?.('trackPath', trackPath.slice(0, -1))} disabled={!trackPath.length} style={{ ...btnStyle(false), flex: 1, padding: '8px', fontSize: '10px' }}><Icon name="undo" />{t('circuito.pathUndo')}</button>
              <button onClick={handleClearPath} disabled={!trackPath.length} style={{ ...btnStyle(false), flex: 1, padding: '8px', fontSize: '10px', backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('circuito.pathClear')}</button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMuted, cursor: 'pointer' }}>
              <input type="checkbox" checked={config?.trackMapShowImage !== false} onChange={(e) => onConfigChange?.('trackMapShowImage', e.target.checked)} />
              {t('circuito.mapShowImage')}
            </label>
          </div>
        )}

        {!isPath && config?.trackImage && (
          <p style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '15px', lineHeight: '1.5' }}>
            {t('circuito.instructions')}
          </p>
        )}

        {!isPath && <h3 style={{ color: colors.yellow, marginBottom: '10px', fontSize: '14px' }}>{t('circuito.curvesTitle', { n: curves.length })}</h3>}
        {!isPath && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {curves.length === 0 && (
            <p style={{ fontSize: '11px', color: colors.textMuted, fontStyle: 'italic' }}>{t('circuito.noCurves')}</p>
          )}
          {curves.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setSelectedCurveId(c.id)}
              style={{
                display: 'flex', gap: '5px', alignItems: 'center',
                padding: '6px', borderRadius: '4px', cursor: 'pointer',
                backgroundColor: selectedCurveId === c.id ? 'rgba(255,204,0,0.1)' : colors.bgInput,
                border: `1px solid ${selectedCurveId === c.id ? colors.yellow : colors.border}`
              }}
            >
              <span style={{ color: colors.yellow, fontSize: '11px', fontWeight: 'bold', width: '18px' }}>{i + 1}</span>
              <input
                value={c.name}
                onChange={(e) => handleRenameCurve(c.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ ...inputStyle, flex: 1, padding: '4px 6px', fontSize: '11px' }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteCurve(c.id); }}
                style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer' }}
              ><Icon name="close" /></button>
            </div>
          ))}
        </div>
        )}
      </div>

      <div style={{ flex: 1, backgroundColor: colors.bgApp, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '20px' }}>
        {(config?.trackImage || isPath) ? (
          <div
            ref={imgRef}
            onClick={isPath ? handlePathClick : handleImageClick}
            onMouseMove={isPath ? handlePathMove : handleImageMouseMove}
            onMouseUp={isPath ? handlePathUp : handleImageMouseUp}
            onMouseLeave={isPath ? handlePathUp : handleImageMouseUp}
            style={{
              position: 'relative', maxWidth: '100%', maxHeight: '100%',
              backgroundImage: config?.trackImage ? `url(${config.trackImage})` : 'none', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
              backgroundColor: config?.trackImage ? 'transparent' : '#0d0d0d',
              // 3:2 fijo: es la misma proporción del mapa en vivo, así los puntos caen en el mismo lugar
              width: '900px', aspectRatio: '3 / 2', cursor: 'crosshair',
              border: `2px solid ${colors.border}`, borderRadius: '8px'
            }}
          >
            {isPath && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {trackPath.length >= 2 && (
                  <polygon points={trackPath.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.yellow} strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                )}
              </svg>
            )}
            {isPath && trackPath.map((p, i) => (
              <div
                key={i}
                onMouseDown={(e) => handlePathPointDown(e, i)}
                onContextMenu={(e) => handlePathPointDelete(e, i)}
                title={i === 0 ? t('circuito.pathStart') : t('circuito.pathPointTitle', { n: i + 1 })}
                style={{
                  position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)', cursor: 'grab',
                  width: i === 0 ? '18px' : '12px', height: i === 0 ? '18px' : '12px', borderRadius: '50%',
                  backgroundColor: i === 0 ? colors.green : colors.yellow, border: '2px solid #000', userSelect: 'none'
                }}
              />
            ))}
            {!isPath && curves.map((c, i) => (
              <div
                key={c.id}
                onMouseDown={(e) => handleMarkerMouseDown(e, c.id)}
                style={{
                  position: 'absolute', left: `${c.x}%`, top: `${c.y}%`,
                  transform: 'translate(-50%, -50%)', cursor: 'grab',
                  width: '26px', height: '26px', borderRadius: '50%',
                  backgroundColor: selectedCurveId === c.id ? colors.yellow : '#e74c3c',
                  border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '900', color: '#000', boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                  userSelect: 'none'
                }}
                title={c.name}
              >
                {i + 1}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: colors.textMuted, textAlign: 'center' }}>
            <p>{t('circuito.emptyState')}</p>
          </div>
        )}
      </div>
    </div>
  );
}