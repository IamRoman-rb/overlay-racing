// src/windows/TrackMapPanel.jsx
import { useState, useRef } from 'react';

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

export default function TrackMapPanel({ config, onConfigChange, colors, inputStyle, btnStyle }) {
  const [selectedCurveId, setSelectedCurveId] = useState(null);
  const dragInfo = useRef({ isDragging: false, curveId: null });
  const imgRef = useRef(null);

  const curves = config?.trackCurves || [];

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
    if (typeof window !== 'undefined' && !window.confirm('¿Seguro que querés quitar el mapa del circuito? Se perderán las curvas marcadas.')) {
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
    const newCurve = { id: `curve_${Date.now()}`, name: `Curva ${curves.length + 1}`, x, y };
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
        <h3 style={{ color: colors.yellow, marginTop: 0, marginBottom: '15px' }}>MAPA DEL CIRCUITO</h3>

        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
          <button onClick={handleSelectImage} style={{ ...btnStyle(false), flex: 1 }}>📷 CARGAR IMAGEN</button>
          {config?.trackImage && (
            <button onClick={handleClearImage} style={{ ...btnStyle(false), flex: 1, backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>🗑️ QUITAR</button>
          )}
        </div>

        {config?.trackImage && (
          <p style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '15px', lineHeight: '1.5' }}>
            Hacé click en la imagen para agregar una curva. Arrastrá un marcador para moverlo.
          </p>
        )}

        <h3 style={{ color: colors.yellow, marginBottom: '10px', fontSize: '14px' }}>CURVAS ({curves.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {curves.length === 0 && (
            <p style={{ fontSize: '11px', color: colors.textMuted, fontStyle: 'italic' }}>Todavía no hay curvas marcadas.</p>
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
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: colors.bgApp, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '20px' }}>
        {config?.trackImage ? (
          <div
            ref={imgRef}
            onClick={handleImageClick}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseUp}
            style={{
              position: 'relative', maxWidth: '100%', maxHeight: '100%',
              backgroundImage: `url(${config.trackImage})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
              width: '900px', height: '600px', cursor: 'crosshair',
              border: `2px solid ${colors.border}`, borderRadius: '8px'
            }}
          >
            {curves.map((c, i) => (
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
            <p>Cargá una imagen del circuito para empezar a marcar curvas.</p>
          </div>
        )}
      </div>
    </div>
  );
}