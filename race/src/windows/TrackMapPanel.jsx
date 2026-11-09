// src/windows/TrackMapPanel.jsx
// Pestaña CIRCUITO: imagen del circuito, TRAZADO (puntos del recorrido que usa el mapa en vivo) y CURVAS (para la alerta
// en curva). El trazado se sugiere solo a partir de la imagen y las curvas se marcan sobre el trazado, así lo que se ve
// al aire se dibuja con los puntos y no depende de la imagen.
import { useState, useRef, useMemo, useEffect } from 'react';
import Icon from '../components/Icon';
import { smoothPathPercent, nearestOnTrack, sectorPathsPercent, sectorRanges, trackDirection, DEFAULT_ASPECT } from '../utils/trackPath';
import { SECTOR_PALETTE } from '../utils/elite';
import { useImageAspect } from '../utils/raceVisuals';
import { detectTrackFromImage } from '../utils/trackDetect';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch { /* fuera de Electron */ }
}

const round1 = (v) => Math.round(v * 10) / 10;

export default function TrackMapPanel({ config, onConfigChange, colors, inputStyle, btnStyle, t }) {
  const [selectedCurveId, setSelectedCurveId] = useState(null);
  const dragInfo = useRef({ isDragging: false, curveId: null });
  const imgRef = useRef(null);
  const [mode, setMode] = useState('curves'); // 'curves' | 'path'
  const isPath = mode === 'path';
  const isCurves = mode === 'curves';
  const isSectors = mode === 'sectors';
  const isData = mode === 'data';

  const curves = config?.trackCurves || [];
  const trackPath = Array.isArray(config?.trackPath) ? config.trackPath : [];
  const hasPath = trackPath.length >= 3;

  // Los puntos se guardan en % de la imagen del circuito (o de un lienzo 3:2 si no hay imagen). El lienzo toma
  // exactamente esa proporción, así lo que se marca acá coincide con lo que se ve al aire.
  const imageAspect = useImageAspect(config?.trackImage || null);
  const pathAspect = config?.trackImage ? imageAspect : DEFAULT_ASPECT;
  const smoothD = useMemo(() => (pathAspect ? smoothPathPercent(config?.trackPath, pathAspect) : ''), [config?.trackPath, pathAspect]);
  // Con trazado, las curvas también se marcan en ese lienzo (sobre la pista dibujada con los puntos, no sobre la imagen)
  const useTrackCanvas = isPath || hasPath;

  // --- SECTORES: cortes sobre el trazado (fracciones de vuelta desde la largada) ---
  const splits = Array.isArray(config?.trackSectors) ? config.trackSectors : [];
  const sectorPaths = useMemo(() => (pathAspect && hasPath ? sectorPathsPercent(config?.trackPath, pathAspect, config?.trackSectors) : []), [config?.trackPath, config?.trackSectors, pathAspect, hasPath]);
  const lengthM = parseFloat(String(config?.circuitLength || '').replace(',', '.'));
  const handleSectorClick = (e) => {
    if (!hasPath) return;
    const snap = nearestOnTrack(trackPath, pathAspect, getPercentFromEvent(e));
    if (!snap || snap.t < 0.01 || snap.t > 0.99 || splits.some(v => Math.abs(v - snap.t) < 0.01)) return;
    onConfigChange?.('trackSectors', [...splits, snap.t].sort((a, b) => a - b));
  };
  const removeSplit = (index) => onConfigChange?.('trackSectors', [...splits].sort((a, b) => a - b).filter((_, i) => i !== index));
  const detectedDirection = pathAspect && hasPath ? trackDirection(trackPath, pathAspect) : null;

  const areaRef = useRef(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pathBox = (() => {
    if (!pathAspect || !area.w || !area.h) return null;
    const availW = Math.max(100, area.w - 44);
    const availH = Math.max(100, area.h - 44);
    const w = Math.min(availW, availH * pathAspect, 1400);
    return { w: Math.round(w), h: Math.round(w / pathAspect) };
  })();

  const getPercentFromEvent = (e) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  // --- TRAZADO SUGERIDO A PARTIR DE LA IMAGEN ---
  const [suggest, setSuggest] = useState(null); // { status: 'running' | 'ok' | 'error', method, source, n }
  const autoTriedRef = useRef(null);
  const runSuggest = async (askBeforeReplace) => {
    if (!config?.trackImage) return;
    if (askBeforeReplace && trackPath.length && typeof window !== 'undefined' && !window.confirm(t('circuito.confirmReplacePath'))) return;
    setSuggest({ status: 'running' });
    const result = await detectTrackFromImage(config.trackImage);
    if (result.error || !result.points?.length) { setSuggest({ status: 'error' }); return; }
    onConfigChange?.('trackPath', result.points);
    setSuggest({ status: 'ok', method: result.method, source: result.source, n: result.points.length });
  };
  // Al entrar a TRAZADO con una imagen y sin puntos, se sugiere el recorrido automáticamente (una vez por imagen)
  useEffect(() => {
    if (!isPath || !config?.trackImage || trackPath.length || autoTriedRef.current === config.trackImage) return undefined;
    autoTriedRef.current = config.trackImage;
    const timer = setTimeout(() => runSuggest(false), 0);
    return () => clearTimeout(timer);
  });

  // --- PUNTOS DEL TRAZADO ---
  const [pickStart, setPickStart] = useState(false);
  const pathDrag = useRef(null);
  const nearestPointIndex = ({ x, y }) => {
    let best = -1; let bestD = Infinity;
    trackPath.forEach((p, i) => {
      const d = ((p.x - x) * pathAspect) ** 2 + (p.y - y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };
  const handlePathClick = (e) => {
    if (pathDrag.current?.moved) return;
    const pos = getPercentFromEvent(e);
    if (pickStart) {
      // Largada: el punto elegido pasa a ser el primero, sin cambiar el sentido
      const i = nearestPointIndex(pos);
      if (i > 0) onConfigChange?.('trackPath', [...trackPath.slice(i), ...trackPath.slice(0, i)]);
      setPickStart(false);
      return;
    }
    onConfigChange?.('trackPath', [...trackPath, { x: round1(pos.x), y: round1(pos.y) }]);
  };
  const handlePathPointDown = (e, index) => {
    if (pickStart) return;
    e.stopPropagation();
    pathDrag.current = { index, moved: false };
  };
  const handlePathMove = (e) => {
    if (!pathDrag.current) return;
    const { x, y } = getPercentFromEvent(e);
    pathDrag.current.moved = true;
    onConfigChange?.('trackPath', trackPath.map((p, i) => (i === pathDrag.current.index ? { x: round1(x), y: round1(y) } : p)));
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
    setSuggest(null);
  };
  // Sentido de giro: se invierte el recorrido dejando la largada en el mismo punto
  const handleReverse = () => {
    if (trackPath.length < 3) return;
    onConfigChange?.('trackPath', [trackPath[0], ...trackPath.slice(1).reverse()]);
  };

  // --- IMAGEN ---
  const handleSelectImage = async () => {
    if (!ipcRenderer) return;
    try {
      const imgData = await ipcRenderer.invoke('select-track-image');
      if (imgData) { onConfigChange?.('trackImage', imgData); setSuggest(null); }
    } catch (e) {
      console.error('Error seleccionando imagen del circuito:', e);
    }
  };
  const handleClearImage = () => {
    if (typeof window !== 'undefined' && !window.confirm(t('circuito.confirmRemoveMap'))) return;
    onConfigChange?.('trackImage', null);
    onConfigChange?.('trackCurves', []);
    setSelectedCurveId(null);
  };

  // --- CURVAS: con trazado se ubican solas sobre la pista (y guardan en qué parte de la vuelta están) ---
  const placeCurve = (pos) => {
    if (hasPath) {
      const snap = nearestOnTrack(trackPath, pathAspect, pos);
      if (snap) return snap;
    }
    return { x: pos.x, y: pos.y };
  };
  const handleImageClick = (e) => {
    if (dragInfo.current.isDragging) return; // evita agregar curva al soltar un drag
    const place = placeCurve(getPercentFromEvent(e));
    const newCurve = { id: `curve_${Date.now()}`, name: t('circuito.curveDefaultName', { n: curves.length + 1 }), ...place };
    onConfigChange?.('trackCurves', [...curves, newCurve]);
    setSelectedCurveId(newCurve.id);
  };
  const handleMarkerMouseDown = (e, curveId) => {
    e.stopPropagation();
    dragInfo.current = { isDragging: true, curveId };
    setSelectedCurveId(curveId);
  };
  const handleImageMouseMove = (e) => {
    if (!dragInfo.current.isDragging) return;
    const place = placeCurve(getPercentFromEvent(e));
    onConfigChange?.('trackCurves', curves.map(c => (c.id === dragInfo.current.curveId ? { ...c, x: place.x, y: place.y, t: place.t } : c)));
  };
  const handleImageMouseUp = () => {
    setTimeout(() => { dragInfo.current = { isDragging: false, curveId: null }; }, 50);
  };
  const handleRenameCurve = (curveId, newName) => {
    onConfigChange?.('trackCurves', curves.map(c => (c.id === curveId ? { ...c, name: newName } : c)));
  };
  const handleDeleteCurve = (curveId) => {
    onConfigChange?.('trackCurves', curves.filter(c => c.id !== curveId));
    if (selectedCurveId === curveId) setSelectedCurveId(null);
  };

  // Flecha del sentido de giro en la largada (en píxeles del lienzo, para que no se deforme)
  const startArrow = (() => {
    if (!pathBox || trackPath.length < 2) return null;
    const a = trackPath[0]; const b = trackPath[1];
    return Math.atan2((b.y - a.y) * pathBox.h, (b.x - a.x) * pathBox.w) * 180 / Math.PI;
  })();

  const suggestText = !suggest ? '' : suggest.status === 'running' ? t('circuito.suggesting')
    : suggest.status === 'error' ? t('circuito.suggestFail')
    : t(suggest.source === 'contour' ? 'circuito.suggestOkContour' : (suggest.method === 'alpha' ? 'circuito.suggestOkAlpha' : 'circuito.suggestOkColor'), { n: suggest.n });

  const smallBtn = { ...btnStyle(false), flex: 1, padding: '8px', fontSize: '10px' };

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
          <button onClick={() => { setMode('curves'); setPickStart(false); }} style={{ ...btnStyle(isCurves), padding: '8px' }}>{t('circuito.modeCurves')}</button>
          <button onClick={() => setMode('path')} style={{ ...btnStyle(isPath), padding: '8px' }}>{t('circuito.modePath')}</button>
          <button onClick={() => { setMode('sectors'); setPickStart(false); }} style={{ ...btnStyle(isSectors), padding: '8px' }}>{t('circuito.modeSectors')}</button>
          <button onClick={() => { setMode('data'); setPickStart(false); }} style={{ ...btnStyle(isData), padding: '8px' }}>{t('circuito.modeData')}</button>
        </div>

        {isSectors && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', color: hasPath ? colors.textMuted : '#e67e22', marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }}>{hasPath ? t('circuito.sectorsInstructions') : t('circuito.curvesNeedPath')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {sectorRanges(splits).map(([a, b], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '4px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}` }}>
                  <span style={{ backgroundColor: SECTOR_PALETTE[i % SECTOR_PALETTE.length], color: '#000', fontWeight: 900, fontSize: '11px', padding: '1px 6px', borderRadius: '2px' }}>S{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '11px', color: colors.textMain }}>
                    {Number.isFinite(lengthM) && lengthM > 0 ? `${Math.round(lengthM * (b - a))} m` : `${Math.round((b - a) * 100)} %`}
                  </span>
                  {i > 0 && (
                    <button onClick={() => removeSplit(i - 1)} title={t('circuito.sectorRemove')} style={{ backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 7px', fontSize: '10px', cursor: 'pointer' }}><Icon name="close" /></button>
                  )}
                </div>
              ))}
            </div>
            {!(Number.isFinite(lengthM) && lengthM > 0) && <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: 1.4 }}>{t('circuito.sectorsNeedLength')}</p>}
            {splits.length > 0 && <button onClick={() => onConfigChange?.('trackSectors', [])} style={{ ...smallBtn, width: '100%', marginTop: '8px', backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('circuito.sectorsClear')}</button>}
          </div>
        )}

        {isData && (
          <CircuitDataForm config={config} onConfigChange={onConfigChange} detectedDirection={detectedDirection} colors={colors} inputStyle={inputStyle} t={t} />
        )}

        {isPath && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', color: colors.textMuted, marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }}>{t('circuito.pathInstructions')}</p>

            {config?.trackImage && (
              <button onClick={() => runSuggest(true)} disabled={suggest?.status === 'running'} style={{ ...btnStyle(false), width: '100%', padding: '10px', fontSize: '10px', marginBottom: '8px', color: colors.green, borderColor: colors.green }}>
                <Icon name="search" />{t('circuito.suggestBtn')}
              </button>
            )}
            {suggestText && (
              <div style={{ fontSize: '11px', lineHeight: 1.45, marginBottom: '10px', padding: '8px', borderRadius: '4px', backgroundColor: colors.bgInput, color: suggest.status === 'error' ? '#e67e22' : colors.textMain, border: `1px solid ${suggest.status === 'error' ? '#e67e22' : colors.border}` }}>
                {suggestText}
                {suggest.status === 'ok' && <div style={{ color: colors.textMuted, marginTop: '4px' }}>{t('circuito.suggestReviewHint')}</div>}
              </div>
            )}

            <div style={{ fontSize: '12px', fontWeight: 'bold', color: hasPath ? colors.green : '#e67e22', marginBottom: '10px' }}>
              {t('circuito.pathPoints', { n: trackPath.length })}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
              <button onClick={() => setPickStart(!pickStart)} disabled={!hasPath} style={{ ...smallBtn, ...(pickStart ? { backgroundColor: colors.green, color: '#000', borderColor: colors.green } : {}) }}>{t('circuito.pickStartBtn')}</button>
              <button onClick={handleReverse} disabled={!hasPath} style={smallBtn}>{t('circuito.reverseBtn')}</button>
            </div>
            {pickStart && <div style={{ fontSize: '11px', color: colors.green, marginBottom: '8px' }}>{t('circuito.pickStartHint')}</div>}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <button onClick={() => onConfigChange?.('trackPath', trackPath.slice(0, -1))} disabled={!trackPath.length} style={smallBtn}><Icon name="undo" />{t('circuito.pathUndo')}</button>
              <button onClick={handleClearPath} disabled={!trackPath.length} style={{ ...smallBtn, backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>{t('circuito.pathClear')}</button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMuted, cursor: 'pointer' }}>
              <input type="checkbox" checked={config?.trackMapShowImage === true} onChange={(e) => onConfigChange?.('trackMapShowImage', e.target.checked)} />
              {t('circuito.mapShowImage')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMuted, marginTop: '8px' }}>
              <input
                type="color" value={/^#[0-9a-f]{6}$/i.test(config?.trackMapLineColor || '') ? config.trackMapLineColor : '#2ecc71'}
                onChange={(e) => onConfigChange?.('trackMapLineColor', e.target.value)}
                style={{ width: '30px', height: '22px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
              />
              {t('circuito.mapLineColor')}
            </label>
          </div>
        )}

        {isCurves && (
          <p style={{ fontSize: '11px', color: hasPath ? colors.textMuted : '#e67e22', marginTop: 0, marginBottom: '15px', lineHeight: '1.5' }}>
            {hasPath ? t('circuito.curvesOnPathHint') : t('circuito.curvesNeedPath')}
          </p>
        )}

        {isCurves && <h3 style={{ color: colors.yellow, marginBottom: '10px', fontSize: '14px' }}>{t('circuito.curvesTitle', { n: curves.length })}</h3>}
        {isCurves && (
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

      <div ref={areaRef} style={{ flex: 1, backgroundColor: colors.bgApp, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '20px' }}>
        {(config?.trackImage || useTrackCanvas) && (!useTrackCanvas || pathBox) ? (
          <div
            ref={imgRef}
            onClick={isPath ? handlePathClick : (isSectors ? handleSectorClick : (isCurves ? handleImageClick : undefined))}
            onMouseMove={isPath ? handlePathMove : (isCurves ? handleImageMouseMove : undefined)}
            onMouseUp={isPath ? handlePathUp : handleImageMouseUp}
            onMouseLeave={isPath ? handlePathUp : handleImageMouseUp}
            style={useTrackCanvas ? {
              // Lienzo con la proporción exacta de la imagen (sin borde: un borde correría los % de los clics).
              // En TRAZADO se ve la imagen para marcar encima; en CURVAS se ve sólo la pista dibujada con los puntos.
              position: 'relative', flexShrink: 0, width: `${pathBox.w}px`, height: `${pathBox.h}px`,
              backgroundImage: isPath && config?.trackImage ? `url(${config.trackImage})` : 'none', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
              backgroundColor: isPath && config?.trackImage ? 'transparent' : '#0d0d0d',
              cursor: pickStart ? 'pointer' : 'crosshair', outline: `2px solid ${colors.border}`, borderRadius: '4px'
            } : {
              position: 'relative', maxWidth: '100%', maxHeight: '100%',
              backgroundImage: config?.trackImage ? `url(${config.trackImage})` : 'none', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
              backgroundColor: config?.trackImage ? 'transparent' : '#0d0d0d',
              width: '900px', aspectRatio: '3 / 2', cursor: 'crosshair',
              border: `2px solid ${colors.border}`, borderRadius: '8px'
            }}
          >
            {useTrackCanvas && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {/* En CURVAS la pista se dibuja con los puntos (asfalto + línea), igual que en la gráfica al aire */}
                {!isPath && smoothD && <path d={smoothD} fill="none" stroke="#9a9a9a" strokeWidth="26" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                {!isPath && smoothD && <path d={smoothD} fill="none" stroke="#3b3b3b" strokeWidth="20" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                {isPath && trackPath.length >= 2 && (
                  <polygon points={trackPath.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.yellow} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                )}
                {/* Curva suavizada: es exactamente la que se ve en el mapa en vivo */}
                {smoothD && <path d={smoothD} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="9" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                {smoothD && (isPath || isCurves) && <path d={smoothD} fill="none" stroke="#2ecc71" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                {/* SECTORES / DATOS: cada sector con su color, igual que en la presentación del circuito */}
                {(isSectors || isData) && sectorPaths.map((sp, i) => (
                  <polyline key={i} points={sp.points} fill="none" stroke={SECTOR_PALETTE[i % SECTOR_PALETTE.length]} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
            )}
            {isPath && trackPath.map((p, i) => (
              <div
                key={i}
                onMouseDown={(e) => handlePathPointDown(e, i)}
                onContextMenu={(e) => handlePathPointDelete(e, i)}
                title={i === 0 ? t('circuito.pathStart') : t('circuito.pathPointTitle', { n: i + 1 })}
                style={{
                  position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)', cursor: pickStart ? 'pointer' : 'grab',
                  width: i === 0 ? '16px' : '9px', height: i === 0 ? '16px' : '9px', borderRadius: '50%', boxSizing: 'border-box',
                  backgroundColor: i === 0 ? colors.green : colors.yellow, border: `${i === 0 ? 2 : 1.5}px solid #000`, userSelect: 'none',
                  opacity: i === 0 ? 1 : 0.85, zIndex: i === 0 ? 2 : 1
                }}
              />
            ))}
            {/* Sentido de giro: flecha en la largada */}
            {isPath && startArrow !== null && (
              <div style={{
                position: 'absolute', left: `${trackPath[0].x}%`, top: `${trackPath[0].y}%`, pointerEvents: 'none', zIndex: 3,
                transform: `translate(-50%, -50%) rotate(${startArrow.toFixed(1)}deg) translateX(22px)`,
                color: colors.green, fontSize: '22px', fontWeight: 900, lineHeight: 1, textShadow: '0 0 3px #000, 0 0 3px #000'
              }}>➜</div>
            )}
            {(isSectors || isData) && sectorPaths.map((sp, i) => {
              const first = sp.points.split(' ')[0].split(',').map(Number);
              return (
                <div key={`cut${i}`} title={i === 0 ? t('circuito.pathStart') : `S${i + 1}`} style={{
                  position: 'absolute', left: `${first[0]}%`, top: `${first[1]}%`, transform: 'translate(-50%, -50%)', zIndex: 2, pointerEvents: 'none',
                  minWidth: '22px', height: '22px', borderRadius: '11px', padding: '0 4px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: i === 0 ? '#fff' : SECTOR_PALETTE[i % SECTOR_PALETTE.length], border: '2px solid #000', fontSize: '10px', fontWeight: 900, color: '#000'
                }}>{i === 0 ? 'S/F' : `S${i + 1}`}</div>
              );
            })}
            {isCurves && curves.map((c, i) => (
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
                  userSelect: 'none', zIndex: 2
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

// Campo de texto que guarda al salir o con Enter
function DataField({ label, value, placeholder, onCommit, colors, inputStyle, type = 'text' }) {
  const [draft, setDraft] = useState(value ?? '');
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setDraft(value ?? ''); }
  const commit = () => { if (String(draft) !== String(value ?? '')) onCommit(draft); };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '7px' }}>
      <span style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textMuted, letterSpacing: '0.5px' }}>{label}</span>
      <input type={type} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }}
        style={{ ...inputStyle, padding: '7px', fontSize: '11px', textTransform: 'none' }} />
    </label>
  );
}

// DATOS DEL CIRCUITO para la presentación y el récord (lo que no sale del trazado)
function CircuitDataForm({ config, onConfigChange, detectedDirection, colors, inputStyle, t }) {
  const field = (key, label, placeholder, type) => (
    <DataField key={key} label={t(label)} value={config?.[key] || ''} placeholder={placeholder} type={type} colors={colors} inputStyle={inputStyle}
      onCommit={(v) => onConfigChange?.(key, String(v).trim())} />
  );
  const dirLabel = detectedDirection === 'cw' ? t('circuito.dirCw') : detectedDirection === 'ccw' ? t('circuito.dirCcw') : '—';
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: '11px', color: colors.textMuted, marginTop: 0, marginBottom: '10px', lineHeight: '1.5' }}>{t('circuito.dataInstructions')}</p>
      {field('eventTitle', 'circuito.dataEventTitle', config?.campeonato || 'CAMPEONATO - FECHA 1')}
      {field('circuitName', 'circuito.dataName', config?.circuito || '')}
      {field('circuitCity', 'circuito.dataCity', 'CIUDAD, PROVINCIA')}
      {field('circuitLength', 'circuito.dataLength', '3250', 'number')}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '7px' }}>
        <span style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textMuted, letterSpacing: '0.5px' }}>{t('circuito.dataDirection')}</span>
        <select value={config?.circuitDirection || 'auto'} onChange={(e) => onConfigChange?.('circuitDirection', e.target.value)} style={{ ...inputStyle, padding: '7px', fontSize: '11px', cursor: 'pointer' }}>
          <option value="auto">{t('circuito.dirAuto', { dir: dirLabel })}</option>
          <option value="cw">{t('circuito.dirCw')}</option>
          <option value="ccw">{t('circuito.dirCcw')}</option>
        </select>
      </label>
      <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.yellow, margin: '12px 0 6px' }}>{t('circuito.dataRecordTitle')}</div>
      {field('recordTime', 'circuito.dataRecordTime', '1:28.415')}
      {field('recordSpeed', 'circuito.dataRecordSpeed', '214', 'number')}
      {field('recordDate', 'circuito.dataRecordDate', '14 SEP 2025')}
      {field('recordEvent', 'circuito.dataRecordEvent', 'FINAL')}
      {field('recordDriver', 'circuito.dataRecordDriver', 'NOMBRE APELLIDO')}
      {field('recordNumber', 'circuito.dataRecordNumber', '7')}
      {field('recordTeam', 'circuito.dataRecordTeam', 'EQUIPO')}
      <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: 1.4 }}>{t('circuito.dataPhotoHint')}</p>
    </div>
  );
}
