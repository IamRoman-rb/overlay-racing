import { useState, useRef, useEffect } from 'react';
import { SKIN_FORMATS } from '../utils/skinStyles';
import { getFinalResultsDefaultSize } from '../utils/finalResultsSize';
import { getCanvasSize } from '../utils/canvasSize';
import GraphicPreview from './GraphicPreview';
import { EXTRA_FONTS, fontCssValue, GOOGLE_FONTS_URL } from '../utils/fonts';

// Número que se confirma con Enter o al salir del campo (no en cada tecla: evita redimensionar a medio escribir).
// Vacío = vuelve al valor original. `key` fuerza a mostrar el valor guardado cuando cambia desde afuera.
function CommitNumberInput({ value, placeholder, onCommit, style }) {
  return (
    <input
      key={String(value ?? '')}
      type="number" min="1" step="1"
      defaultValue={value ?? ''}
      placeholder={placeholder}
      onBlur={(e) => { if (e.target.value !== String(value ?? '')) onCommit(e.target.value); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      style={style}
    />
  );
}

const OVERLAY_PRESETS = [[1920, 1080, 'Full HD'], [1280, 720, 'HD'], [3840, 2160, '4K'], [1080, 1920, ''], [1080, 1080, '']];

export default function CustomizePanel({ config, positions, defaultPositions, onUpdatePositions, onSelectLogo, onSelectCategoryLogo, onSelectPhotosFolder, onClearLogo, onClearCategoryLogo, onClearPhotosFolder, onConfigChange, colors, inputStyle, btnStyle, t, drivers, sessionInfo }) {
  const [selectedGraphic, setSelectedGraphic] = useState('relator');
  // Gráficas acumuladas con Ctrl + clic para verlas juntas en la previsualización (vacío = se ve solo la seleccionada)
  const [groupIds, setGroupIds] = useState([]);

  // Distribución de la pestaña PANEL del Control Panel (4 opciones)
  const PANEL_LAYOUT_OPTIONS = [
    { id: 'left', vertical: true, buttonsFirst: true },
    { id: 'right', vertical: true, buttonsFirst: false },
    { id: 'top', vertical: false, buttonsFirst: true },
    { id: 'bottom', vertical: false, buttonsFirst: false },
  ];
  const panelLayout = PANEL_LAYOUT_OPTIONS.some(o => o.id === config.panelLayout) ? config.panelLayout : 'left';

  const skinLabels = { pro: t('personalizar.skinPro'), gradient: t('personalizar.skinGradient'), glass: t('personalizar.skinGlass') };
  const renderSkinOptions = () => SKIN_FORMATS.map(value => (
    <option key={value} value={value}>{skinLabels[value] || value}</option>
  ));

  const { width: CW, height: CH } = getCanvasSize(config); // lienzo del overlay (por defecto 1920x1080)
  const SAFE_X = Math.round(CW * 0.05), SAFE_Y = Math.round(CH * 0.05); // zona segura: 5 % de cada borde
  const dragInfo = useRef({ isDragging: false, id: null, startX: 0, startY: 0, initialX: 0, initialY: 0, offX: 0, offY: 0, width: 0, height: 0 });
  const previewRef = useRef(null);       // escenario del tamaño del overlay (escalado)
  const previewAreaRef = useRef(null);   // zona disponible, para ajustar la escala
  const graphicWrapRef = useRef(null);   // contenedor de la gráfica real
  const fallbackRef = useRef(null);      // rectángulo de reemplazo si la gráfica no muestra nada
  const selectionRef = useRef(null);     // recuadro de selección / zona de arrastre
  const labelRef = useRef(null);         // lectura de X, Y y tamaño
  const boundsRef = useRef(null);        // {x, y, w, h} de la gráfica seleccionada, en px del escenario

  const [previewScale, setPreviewScale] = useState(0.42);
  const [contentState, setContentState] = useState({ id: null, has: true });
  const [showGuides, setShowGuides] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapLines, setSnapLines] = useState({ x: [], y: [] });
  const hasContent = contentState.id === selectedGraphic ? contentState.has : true;

  // Líneas a las que "se pega" la gráfica al arrastrarla: bordes, centro y zona segura (5 %) del cuadro
  const SNAP_X = [0, SAFE_X, CW / 2, CW - SAFE_X, CW];
  const SNAP_Y = [0, SAFE_Y, CH / 2, CH - SAFE_Y, CH];
  const SNAP_THRESHOLD = 10;

  // Ajusta la escala del escenario al espacio disponible (el ResizeObserver avisa también al montar)
  useEffect(() => {
    const el = previewAreaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const scale = Math.min((el.clientWidth - 48) / CW, (el.clientHeight - 48) / CH);
      setPreviewScale(Math.max(0.2, Math.min(1, scale)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [CW, CH]);

  // Mide la gráfica real seleccionada en cada cuadro y mueve el recuadro de selección sobre ella
  useEffect(() => {
    let raf = 0;
    let lastState = { id: null, has: true };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const stage = previewRef.current, box = selectionRef.current;
      const wrap = graphicWrapRef.current && Array.from(graphicWrapRef.current.children).find(el => el.dataset.gid === selectedGraphic);
      if (!wrap || !stage || !box) return;
      const stageRect = stage.getBoundingClientRect();
      if (stageRect.width === 0) return;
      const k = stageRect.width / CW;

      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      // GraphicPreview envuelve la gráfica en un contenedor sin caja (display: contents): se mide lo que hay adentro
      const contentRoot = wrap.querySelector('[data-le-wrap]') || wrap;
      Array.from(contentRoot.children).forEach(child => {
        if (child.tagName === 'STYLE' || child.tagName === 'SCRIPT') return;
        const r = child.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        left = Math.min(left, r.left); top = Math.min(top, r.top); right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
      });
      const has = right > left;
      if (!has && fallbackRef.current) {
        const r = fallbackRef.current.getBoundingClientRect();
        left = r.left; top = r.top; right = r.right; bottom = r.bottom;
      }
      if (lastState.id !== selectedGraphic || lastState.has !== has) {
        lastState = { id: selectedGraphic, has };
        setContentState(lastState);
      }
      if (!(right > left)) { boundsRef.current = null; box.style.display = 'none'; return; }

      const b = { x: (left - stageRect.left) / k, y: (top - stageRect.top) / k, w: (right - left) / k, h: (bottom - top) / k };
      boundsRef.current = b;
      box.style.display = 'block';
      box.style.left = `${b.x}px`; box.style.top = `${b.y}px`;
      box.style.width = `${b.w}px`; box.style.height = `${b.h}px`;
      if (labelRef.current) labelRef.current.textContent = `X ${Math.round(b.x)}  Y ${Math.round(b.y)}  ·  ${Math.round(b.w)} × ${Math.round(b.h)}`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selectedGraphic, CW]);

  // Clic normal: una sola gráfica. Ctrl + clic: suma (o quita) gráficas para verlas todas juntas.
  const handleGraphicButtonClick = (e, id) => {
    if (!(e.ctrlKey || e.metaKey)) {
      setGroupIds([]);
      setSelectedGraphic(id);
      return;
    }
    const current = groupIds.length > 0 ? groupIds : [selectedGraphic];
    if (!current.includes(id)) {
      setGroupIds([...current, id]);
      setSelectedGraphic(id);
    } else if (id !== selectedGraphic) {
      setGroupIds(current);
      setSelectedGraphic(id);
    } else {
      const rest = current.filter(g => g !== id);
      if (rest.length === 0) return;
      setGroupIds(rest.length > 1 ? rest : []);
      setSelectedGraphic(rest[rest.length - 1]);
    }
  };
  const shownIds = groupIds.length > 0 ? groupIds : [selectedGraphic];

  const getCurrentPos = (id) => positions[id] || defaultPositions[id] || { x: 0, y: 0, scale: 1 };

  const handlePreviewMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedGraphic(id);
    const pos = getCurrentPos(id);
    const b = boundsRef.current;
    dragInfo.current = {
      isDragging: true, id, startX: e.clientX, startY: e.clientY, initialX: pos.x, initialY: pos.y,
      offX: b ? b.x - pos.x : 0, offY: b ? b.y - pos.y : 0, width: b ? b.w : 0, height: b ? b.h : 0
    };
    if (previewRef.current && previewRef.current.parentElement) previewRef.current.parentElement.focus();
  };

  // Devuelve cuánto hay que correr la gráfica para que su borde o su centro caiga sobre una línea guía
  const snapAxis = (start, size, targets) => {
    let best = null;
    [start, start + size / 2, start + size].forEach(candidate => {
      targets.forEach(target => {
        const delta = target - candidate;
        if (Math.abs(delta) <= SNAP_THRESHOLD && (best === null || Math.abs(delta) < Math.abs(best.delta))) best = { delta, target };
      });
    });
    return best;
  };

  const handlePreviewMouseMove = (e) => {
    if (!dragInfo.current.isDragging || !previewRef.current) return;
    const { id, startX, startY, initialX, initialY, offX, offY, width, height } = dragInfo.current;

    const rect = previewRef.current.getBoundingClientRect();
    const actualScale = rect.width / CW;

    const dx = (e.clientX - startX) / actualScale;
    const dy = (e.clientY - startY) / actualScale;

    let newX = Math.round(initialX + dx);
    let newY = Math.round(initialY + dy);

    // Imán a los ejes (se desactiva manteniendo Alt)
    const lines = { x: [], y: [] };
    if (snapEnabled && !e.altKey && width > 0) {
      const sx = snapAxis(newX + offX, width, SNAP_X);
      if (sx) { newX += sx.delta; lines.x.push(sx.target); }
      const sy = snapAxis(newY + offY, height, SNAP_Y);
      if (sy) { newY += sy.delta; lines.y.push(sy.target); }
    }
    setSnapLines(prev => (JSON.stringify(prev) === JSON.stringify(lines) ? prev : lines));

    const newPositions = { ...positions, [id]: { ...getCurrentPos(id), x: Math.round(newX), y: Math.round(newY) } };
    onUpdatePositions(newPositions, false);
  };

  const handlePreviewMouseUp = () => {
    if (dragInfo.current.isDragging) {
      dragInfo.current.isDragging = false;
      setSnapLines({ x: [], y: [] });
      onUpdatePositions(positions, true);
    }
  };

  // Centra la gráfica seleccionada en el cuadro, usando su tamaño real medido
  const handleCenter = (axis) => {
    const b = boundsRef.current;
    if (!b) return;
    const pos = getCurrentPos(selectedGraphic);
    const next = { ...pos };
    if (axis === 'x' || axis === 'both') next.x = Math.round(pos.x + (CW / 2 - (b.x + b.w / 2)));
    if (axis === 'y' || axis === 'both') next.y = Math.round(pos.y + (CH / 2 - (b.y + b.h / 2)));
    onUpdatePositions({ ...positions, [selectedGraphic]: next }, true);
  };

  // Ajuste fino con el teclado: flechas = 1 px, Shift + flechas = 10 px
  const handleStageKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 1;
    const deltas = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    const pos = getCurrentPos(selectedGraphic);
    onUpdatePositions({ ...positions, [selectedGraphic]: { ...pos, x: pos.x + d[0], y: pos.y + d[1] } }, false);
  };
  const handleStageKeyUp = (e) => {
    if (e.key.startsWith('Arrow')) onUpdatePositions(positions, true);
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
        ref={isSelected ? fallbackRef : undefined}
        onMouseDown={(e) => handlePreviewMouseDown(e, id)}
        style={{
          position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transform: `scale(${pos.scale})`, transformOrigin: 'top left',
          cursor: dragInfo.current.isDragging && isSelected ? 'grabbing' : 'grab',
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
    'lapTimesHistory', 'trackAlert', 'penaltyAlert', 'branding'
  ];
  const allGraphics = GRAPHIC_IDS.map(id => ({ id, label: t(`graphics.${id}`) }));

  const colorSettings = [
    { id: 'themeMain', label: t('personalizar.colorBorder'), default: '#e74c3c' }, { id: 'themeSecondary', label: t('personalizar.colorSecondary'), default: '#3498db' },
    { id: 'themeAccent', label: t('personalizar.colorAccent'), default: '#f39c12' }, { id: 'themeBg', label: t('personalizar.colorBg'), default: '#1a1a1a' },
    { id: 'themeHeaderBg', label: t('personalizar.colorHeaderBg'), default: '#000000' }, { id: 'themeTitleText', label: t('personalizar.colorTitleText'), default: '#ffcc00' },
    { id: 'themeNormalText', label: t('personalizar.colorNormalText'), default: '#ffffff' }, { id: 'themeNumberText', label: t('personalizar.colorNumberText'), default: '#bdc3c7' }
  ];

  // Grilla: los pilotos van de a 2 por fila; se elige cuántas filas se ven (1-4, igual que StartingGrid)
  const gridRows = Math.min(4, Math.max(1, parseInt(config.gridRows, 10) || 1));

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: colors.bgApp }} onMouseMove={handlePreviewMouseMove} onMouseUp={handlePreviewMouseUp} onMouseLeave={handlePreviewMouseUp} >
      <div style={{ width: '380px', minWidth: '380px', backgroundColor: colors.bgPanel, padding: '20px', overflowY: 'auto', borderRight: `1px solid ${colors.border}`, zIndex: 100 }}>

        <h3 style={{ color: colors.yellow, marginTop: 0, marginBottom: '15px' }}>{t('personalizar.selectGraphic')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '30px' }}>
          {allGraphics.map(graphic => (
            <button key={graphic.id} onClick={(e) => handleGraphicButtonClick(e, graphic.id)} style={{ ...btnStyle(selectedGraphic === graphic.id), padding: '8px 5px', fontSize: '9px', ...(groupIds.includes(graphic.id) && selectedGraphic !== graphic.id ? { outline: `2px solid ${colors.yellow}`, outlineOffset: '-2px' } : {}) }}> {graphic.label} </button>
          ))}
        </div>
        <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', marginTop: '-22px', marginBottom: '30px' }}>{t('personalizar.multiSelectHint')}</p>

        <h3 style={{ color: colors.yellow, marginBottom: '8px' }}>{t('personalizar.panelLayoutTitle')}</h3>
        <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', marginTop: 0, marginBottom: '12px' }}>{t('personalizar.panelLayoutDesc')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '30px' }}>
          {PANEL_LAYOUT_OPTIONS.map(opt => {
            const active = panelLayout === opt.id;
            const btnBox = { backgroundColor: active ? colors.yellow : '#555', borderRadius: '2px' };
            const tableBox = { backgroundColor: active ? '#000' : '#888', borderRadius: '2px', flex: 1 };
            return (
              <button
                key={opt.id}
                onClick={() => onConfigChange('panelLayout', opt.id)}
                style={{ ...btnStyle(active), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 6px', fontSize: '9px' }}
              >
                <div style={{ width: '70px', height: '46px', display: 'flex', flexDirection: opt.vertical ? 'row' : 'column', gap: '3px', padding: '3px', border: `1px solid ${active ? '#000' : colors.border}`, borderRadius: '3px', boxSizing: 'border-box' }}>
                  {[opt.buttonsFirst ? 'b' : 't', opt.buttonsFirst ? 't' : 'b'].map(kind => (
                    kind === 'b'
                      ? <div key="b" style={{ ...btnBox, ...(opt.vertical ? { width: '30%' } : { height: '38%' }) }} />
                      : <div key="t" style={tableBox} />
                  ))}
                </div>
                <span>{t(`personalizar.panelLayout_${opt.id}`)}</span>
              </button>
            );
          })}
        </div>

        <h3 style={{ color: colors.yellow, marginBottom: '8px' }}>{t('personalizar.overlaySizeTitle')}</h3>
        <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', marginTop: 0, marginBottom: '12px' }}>{t('personalizar.overlaySizeDesc')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
          {[['overlayWidth', 'graphicWidthLabel', 1920], ['overlayHeight', 'graphicHeightLabel', 1080]].map(([key, labelKey, def]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t(`personalizar.${labelKey}`)}</label>
              <CommitNumberInput
                value={config[key]}
                placeholder={String(def)}
                onCommit={(v) => onConfigChange(key, v === '' ? '' : getCanvasSize({ [key]: v })[key === 'overlayWidth' ? 'width' : 'height'])}
                style={{ ...inputStyle, padding: '10px', fontSize: '11px' }}
              />
            </div>
          ))}
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const [w, h] = e.target.value.split('x').map(Number);
              onConfigChange({ overlayWidth: w, overlayHeight: h });
            }}
            style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', gridColumn: '1 / -1' }}
          >
            <option value="">{t('personalizar.overlayPreset')}</option>
            {OVERLAY_PRESETS.map(([w, h, name]) => <option key={`${w}x${h}`} value={`${w}x${h}`}>{name ? `${name} ` : ''}{w} × {h}</option>)}
          </select>
          <button onClick={() => onConfigChange({ overlayWidth: '', overlayHeight: '' })} style={{ ...btnStyle(false), gridColumn: '1 / -1', padding: '8px', fontSize: '10px' }}>{t.i('personalizar.overlayReset')}</button>
        </div>
        <div style={{ marginBottom: '30px' }} />

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
              {EXTRA_FONTS.map(f => (
                <option key={f.name} value={fontCssValue(f)} style={{ fontFamily: fontCssValue(f) }}>{f.name}</option>
              ))}
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
                <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', marginTop: '15px' }}>{t('personalizar.gridRowsLabel')}</label>
                <select
                  value={gridRows}
                  onChange={(e) => onConfigChange('gridRows', parseInt(e.target.value, 10))}
                  style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
                >
                  {[1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n === 1 ? t('personalizar.gridRowsOne') : t('personalizar.gridRowsOption', { n, m: n * 2 })}</option>
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

        {selectedGraphic === 'branding' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '30px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.formatOf', { name: t('graphics.branding') })}</label>
            <select
              value={config.brandingFormat || 'standard'}
              onChange={(e) => onConfigChange('brandingFormat', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="standard">Clásico (Logos en Fila con Caja)</option>
              <option value="stacked">Apilado (Un Logo sobre el Otro)</option>
              <option value="minimal">Minimalista (Sin Caja)</option>
              {renderSkinOptions()}
            </select>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', marginTop: '15px' }}>{t('personalizar.brandingShowLabel')}</label>
            <select
              value={config.brandingShow || 'both'}
              onChange={(e) => onConfigChange('brandingShow', e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${colors.border}` }}
            >
              <option value="both">{t('panel.branding_both')}</option>
              <option value="producer">{t('panel.branding_producer')}</option>
              <option value="category">{t('panel.branding_category')}</option>
            </select>
            <span style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', marginTop: '10px' }}>{t('personalizar.brandingHint')}</span>
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
              <option value="roll">{t('personalizar.animRoll')}</option>
            </select>
          </div>

          {/* Ancho y alto propios de la gráfica (vacío = tamaño original; resultados finales tiene medidas por defecto) */}
          {[['sizeW_', 'graphicWidthLabel', 'width'], ['sizeH_', 'graphicHeightLabel', 'height']].map(([prefix, labelKey, dim]) => (
            <div key={prefix} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t(`personalizar.${labelKey}`)}</label>
              <CommitNumberInput
                value={config[`${prefix}${selectedGraphic}`] ?? (selectedGraphic === 'finalResults' ? config[dim === 'width' ? 'finalResultsWidth' : 'finalResultsHeight'] : undefined)}
                placeholder={selectedGraphic === 'finalResults' ? String(getFinalResultsDefaultSize(config.finalResultsFormat || 'standard')[dim]) : t('personalizar.graphicSizeAuto')}
                onCommit={(v) => onConfigChange(`${prefix}${selectedGraphic}`, v === '' ? '' : Math.max(1, Math.round(Number(v))))}
                style={{ ...inputStyle, padding: '10px', fontSize: '11px' }}
              />
            </div>
          ))}
          <span style={{ gridColumn: '1 / -1', fontSize: '10px', color: colors.textMuted, lineHeight: '1.5' }}>{t('personalizar.graphicSizeHint')}</span>

          {/* Alineación del texto de los zócalos (relator, comentarista, notero, circuito y zócalo libre) */}
          {['relator', 'comentarista', 'notero1', 'notero2', 'circuito', 'customZocalo'].includes(selectedGraphic) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.textAlignLabel')}</label>
              <select
                value={config[`textAlign_${selectedGraphic}`] || (selectedGraphic === 'customZocalo' && config.customZocaloFormat === 'banner' ? 'center' : 'left')}
                onChange={(e) => onConfigChange(`textAlign_${selectedGraphic}`, e.target.value)}
                style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer' }}
              >
                <option value="left">{t('personalizar.alignLeft')}</option>
                <option value="center">{t('personalizar.alignCenter')}</option>
                <option value="right">{t('personalizar.alignRight')}</option>
              </select>
            </div>
          )}

          {/* La alerta de sanciones aparece/desaparece sin transición, así que no tiene duración configurable */}
          {selectedGraphic !== 'penaltyAlert' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.durationLabel')}</label>
              <input
                type="number" min="0" max="10" step="0.1"
                value={config[`animationDuration_${selectedGraphic}`] ?? ''}
                placeholder={['finalResults', 'winner'].includes(selectedGraphic) ? '0.5' : '0.4'}
                onChange={(e) => onConfigChange(`animationDuration_${selectedGraphic}`, e.target.value)}
                style={{ ...inputStyle, padding: '10px', fontSize: '11px' }}
              />
            </div>
          )}
        </div>

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>{t('personalizar.coordsTitle')}</h3>
        {positions[selectedGraphic] && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>{t('personalizar.axisX')}</label><input type="number" value={positions[selectedGraphic].x} onChange={(e) => handlePosChange('x', e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>{t('personalizar.axisY')}</label><input type="number" value={positions[selectedGraphic].y} onChange={(e) => handlePosChange('y', e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: '9px', color: colors.textMuted }}>{t('personalizar.scaleLabel')}</label><input type="number" step="0.1" value={positions[selectedGraphic].scale} onChange={(e) => handlePosChange('scale', e.target.value)} style={inputStyle} /></div>
            </div>
            <button onClick={handleResetPosition} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: '1px solid #e74c3c' }}> {t.i('personalizar.resetPositionBtn')} </button>
          </div>
        )}

        <h3 style={{ color: colors.yellow, marginBottom: '15px' }}>{t('personalizar.mediaTitle')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.producerLogo')}</span>
            <div style={{ backgroundColor: '#000', height: '60px', borderRadius: '4px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {config.logo ? <img src={config.logo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{ fontSize: '10px', color: '#444' }}>{t('common.emptyLabel')}</span>}
            </div>
            <button onClick={onSelectLogo} style={{ ...btnStyle(false), padding: '6px', fontSize: '9px' }}>{t.i('common.loadBtn')}</button>
            {config.logo && <button onClick={onClearLogo} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '6px', fontSize: '9px' }}>{t.i('common.removeBtn')}</button>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.categoryLogo')}</span>
            <div style={{ backgroundColor: '#000', height: '60px', borderRadius: '4px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {config.categoryLogo ? <img src={config.categoryLogo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{ fontSize: '10px', color: '#444' }}>{t('common.emptyLabel')}</span>}
            </div>
            <button onClick={onSelectCategoryLogo} style={{ ...btnStyle(false), padding: '6px', fontSize: '9px' }}>{t.i('common.loadBtn')}</button>
            {config.categoryLogo && <button onClick={onClearCategoryLogo} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '6px', fontSize: '9px' }}>{t.i('common.removeBtn')}</button>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '25px', backgroundColor: '#111', padding: '10px', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
          <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('personalizar.photosFolder')}</span>
          <div style={{ fontSize: '10px', color: config.photosPath ? colors.green : '#555', wordBreak: 'break-all', marginBottom: '5px' }}>
            {config.photosPath ? config.photosPath : t('personalizar.noFolderSelected')}
          </div>
          <button onClick={onSelectPhotosFolder} style={{ ...btnStyle(false), padding: '8px', fontSize: '10px' }}>{t.i('personalizar.chooseFolderBtn')}</button>
          {config.photosPath && <button onClick={onClearPhotosFolder} style={{ ...btnStyle(false), backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '8px', fontSize: '10px' }}>{t.i('personalizar.removeFolderBtn')}</button>}
        </div>

      </div>

      <div style={{ flex: 1, minWidth: 0, backgroundColor: colors.bgApp, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* BARRA DE HERRAMIENTAS: ejes, cuadrícula, imán y centrado */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', padding: '10px 16px', backgroundColor: colors.bgPanel, borderBottom: `1px solid ${colors.border}` }}>
          {[
            { key: 'guides', label: t('personalizar.guidesToggle'), checked: showGuides, set: setShowGuides },
            { key: 'grid', label: t('personalizar.gridToggle'), checked: showGrid, set: setShowGrid },
            { key: 'snap', label: t('personalizar.snapToggle'), checked: snapEnabled, set: setSnapEnabled },
          ].map(opt => (
            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 'bold', color: colors.textMain, cursor: 'pointer', textTransform: 'uppercase' }}>
              <input type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)} style={{ cursor: 'pointer' }} />
              {opt.label}
            </label>
          ))}
          <span style={{ flex: 1 }} />
          <button onClick={() => handleCenter('x')} style={{ ...btnStyle(false), width: 'auto', padding: '6px 12px', fontSize: '9px' }}>{t.i('personalizar.centerH')}</button>
          <button onClick={() => handleCenter('y')} style={{ ...btnStyle(false), width: 'auto', padding: '6px 12px', fontSize: '9px' }}>{t.i('personalizar.centerV')}</button>
          <button onClick={() => handleCenter('both')} style={{ ...btnStyle(false), width: 'auto', padding: '6px 12px', fontSize: '9px' }}>{t.i('personalizar.centerBoth')}</button>
        </div>

        <div ref={previewAreaRef} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div
            tabIndex={0}
            onKeyDown={handleStageKeyDown}
            onKeyUp={handleStageKeyUp}
            style={{
              width: CW * previewScale, height: CH * previewScale,
              minWidth: CW * previewScale, minHeight: CH * previewScale,
              flexShrink: 0, position: 'relative', outline: 'none',
              boxShadow: '0 0 0 2px #555, 0 0 30px rgba(0,0,0,1)'
            }}
          >
            <div
              ref={previewRef}
              style={{
                width: `${CW}px`, height: `${CH}px`,
                backgroundColor: config.chromaColor || '#00FF00',
                position: 'absolute', top: 0, left: 0,
                transform: `scale(${previewScale})`, transformOrigin: 'top left',
                overflow: 'hidden',
                fontFamily: config.fontFamily || 'Arial, sans-serif'
              }}
            >
              <style>
                {`@import url('${GOOGLE_FONTS_URL}');`}
              </style>

              {/* CUADRÍCULA Y EJES (debajo de la gráfica) */}
              {showGrid && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, width: `${CW}px`, height: `${CH}px`, pointerEvents: 'none', zIndex: 1,
                  backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.22) 2px, transparent 2px), linear-gradient(to bottom, rgba(255,255,255,0.22) 2px, transparent 2px)',
                  backgroundSize: '100px 100px'
                }} />
              )}

              {/* LA GRÁFICA REAL (con datos de la carrera si los hay, o de ejemplo) */}
              <div ref={graphicWrapRef} style={{ position: 'absolute', left: 0, top: 0, width: `${CW}px`, height: `${CH}px`, pointerEvents: 'none', zIndex: 10 }}>
                {shownIds.map(gid => (
                  <div key={gid} data-gid={gid} style={{ position: 'absolute', left: 0, top: 0, width: `${CW}px`, height: `${CH}px` }}>
                    <GraphicPreview id={gid} config={config} positions={positions} drivers={drivers} sessionInfo={sessionInfo} />
                  </div>
                ))}
              </div>

              {/* Si la gráfica no muestra nada todavía (por ejemplo, sin datos), se marca su lugar con un rectángulo */}
              {!hasContent && renderPreviewGraphic(selectedGraphic, t(`graphics.${selectedGraphic}`))}

              {showGuides && (
                <>
                  <div style={{ position: 'absolute', left: `${CW / 2 - 1}px`, top: 0, width: '2px', height: `${CH}px`, backgroundColor: 'rgba(0, 229, 255, 0.75)', pointerEvents: 'none', zIndex: 900 }} />
                  <div style={{ position: 'absolute', left: 0, top: `${CH / 2 - 1}px`, width: `${CW}px`, height: '2px', backgroundColor: 'rgba(0, 229, 255, 0.75)', pointerEvents: 'none', zIndex: 900 }} />
                  <div style={{ position: 'absolute', left: `${SAFE_X}px`, top: `${SAFE_Y}px`, width: `${CW - 2 * SAFE_X}px`, height: `${CH - 2 * SAFE_Y}px`, border: '2px dashed rgba(255,255,255,0.45)', boxSizing: 'border-box', pointerEvents: 'none', zIndex: 900 }} />
                </>
              )}

              {/* LÍNEAS DE IMÁN ACTIVAS mientras se arrastra */}
              {snapLines.x.map(x => (
                <div key={`sx${x}`} style={{ position: 'absolute', left: `${x - 2}px`, top: 0, width: '4px', height: `${CH}px`, backgroundColor: '#ff2bd6', pointerEvents: 'none', zIndex: 950 }} />
              ))}
              {snapLines.y.map(y => (
                <div key={`sy${y}`} style={{ position: 'absolute', left: 0, top: `${y - 2}px`, width: `${CW}px`, height: '4px', backgroundColor: '#ff2bd6', pointerEvents: 'none', zIndex: 950 }} />
              ))}

              {/* RECUADRO DE SELECCIÓN: se posiciona solo sobre la gráfica y sirve para arrastrarla */}
              <div
                ref={selectionRef}
                onMouseDown={(e) => handlePreviewMouseDown(e, selectedGraphic)}
                style={{
                  position: 'absolute', display: 'none', zIndex: 1000, boxSizing: 'border-box',
                  border: `3px dashed ${config.themeAccent || '#ffcc00'}`, cursor: 'grab'
                }}
              >
                <div ref={labelRef} style={{
                  position: 'absolute', left: '-3px', top: '-34px', whiteSpace: 'nowrap', pointerEvents: 'none',
                  backgroundColor: config.themeAccent || '#ffcc00', color: '#000', fontSize: '20px', fontWeight: 'bold', padding: '2px 8px', fontFamily: 'monospace'
                }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '6px 16px', fontSize: '10px', color: colors.textMuted, borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgPanel }}>
          {t('personalizar.nudgeHint')}
        </div>
      </div>
    </div>
  );
}
