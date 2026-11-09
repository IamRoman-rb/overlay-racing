import { ELEMENT_STYLES_PREFIX, TEXT_SHADOWS, BOX_SHADOWS, BG_SIZES, BORDER_STYLES, BORDER_SIDES, IMG_FITS, sanitizeElementStyle, firstTextElement } from '../utils/layoutEdit';
import { EXTRA_FONTS, fontCssValue } from '../utils/fonts';
import Icon from '../components/Icon';

// PERSONALIZAR > ELEMENTOS: estilo propio de cualquier caja, texto o imagen de una gráfica (config.elementStyles_<id>, ver
// utils/layoutEdit.js): textos, fondos, bordes, imágenes y efectos. Se guardan en la configuración (database.json), así que
// viajan con la copia de seguridad de AJUSTES.

const KIND_ICONS = { text: 'description', block: 'crop_square', image: 'image', icon: 'image' };

const rgbToHex = (rgb) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(rgb || '');
  if (!m || m[4] === '0') return null; // transparente: no hay color para mostrar
  return `#${[m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('')}`;
};

export default function ElementStylePanel({
  graphicId, graphicLabel, config, onConfigChange, tree, selectedKey, onSelect, onHover, pickMode, onTogglePick,
  getElement, onSelectImage, colors, inputStyle, btnStyle, t
}) {
  const storeKey = `${ELEMENT_STYLES_PREFIX}${graphicId}`;
  const allStyles = config[storeKey] || {};
  const current = (selectedKey && allStyles[selectedKey]) || {};
  const styledCount = Object.keys(allStyles).length;
  const node = tree.current;

  // Valores que muestra hoy el elemento, para arrancar los selectores de color desde ahí
  const el = selectedKey ? getElement(selectedKey) : null;
  const computed = el ? getComputedStyle(el) : null;
  const shown = {
    color: current.color || rgbToHex(el ? getComputedStyle(firstTextElement(el)).color : '') || '#ffffff',
    bgColor: current.bgColor || rgbToHex(computed?.backgroundColor) || '#000000',
    bgColor2: current.bgColor2 || current.bgColor || rgbToHex(computed?.backgroundColor) || '#000000',
    borderColor: current.borderColor || rgbToHex(computed?.borderLeftColor) || '#ffffff'
  };
  const hasText = !!(node && node.label && node.kind !== 'image');

  const setFields = (fields) => {
    if (!selectedKey) return;
    const next = { ...current };
    Object.entries(fields).forEach(([field, value]) => {
      if (value === '' || value === null || value === undefined) delete next[field];
      else next[field] = value;
    });
    const clean = sanitizeElementStyle(next);
    const all = { ...allStyles };
    if (clean) all[selectedKey] = clean; else delete all[selectedKey];
    onConfigChange(storeKey, Object.keys(all).length ? all : null);
  };
  const setField = (field, value) => setFields({ [field]: value });

  const pickImage = async (field) => {
    if (!onSelectImage) return;
    const dataUrl = await onSelectImage();
    if (dataUrl) setField(field, dataUrl);
  };

  const resetElement = () => {
    if (!selectedKey || !allStyles[selectedKey]) return;
    const all = { ...allStyles };
    delete all[selectedKey];
    onConfigChange(storeKey, Object.keys(all).length ? all : null);
  };

  const resetAll = () => {
    if (!styledCount || !window.confirm(t('personalizar.elConfirmResetAll'))) return;
    onConfigChange(storeKey, null);
  };

  const smallLabel = { fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase' };
  const panelBox = { backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '15px' };
  const sectionTitle = { gridColumn: '1 / -1', fontSize: '10px', fontWeight: 'bold', color: colors.yellow, borderBottom: `1px solid ${colors.border}`, paddingBottom: '4px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' };
  const fieldBorder = (field) => (current[field] !== undefined ? colors.yellow : colors.border);
  const full = { gridColumn: '1 / -1' };

  const clearBtn = (fields, on) => (
    <button
      onClick={() => setFields(Object.fromEntries([].concat(fields).map(f => [f, ''])))} disabled={!on} title={t('personalizar.elClear')}
      style={{ background: 'transparent', border: 'none', color: on ? colors.textMain : '#444', cursor: on ? 'pointer' : 'default', padding: 0, display: 'inline-flex' }}
    ><Icon name="close" /></button>
  );
  const colorField = (field, label, clearAlso = []) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={smallLabel}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.bgInput, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${fieldBorder(field)}` }}>
        <input type="color" value={shown[field]} onChange={(e) => setField(field, e.target.value)} style={{ width: '22px', height: '22px', cursor: 'pointer', border: 'none', padding: 0, backgroundColor: 'transparent' }} />
        <span style={{ flex: 1, fontSize: '11px', color: current[field] ? '#ddd' : '#666', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current[field] || t('personalizar.elInherit')}</span>
        {clearBtn([field, ...clearAlso], !!current[field])}
      </div>
    </div>
  );
  const selectField = (field, label, options, extra = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...extra }}>
      <span style={smallLabel}>{label}</span>
      <select value={current[field] ?? ''} onChange={(e) => setField(field, e.target.value)} style={{ ...inputStyle, padding: '8px', fontSize: '11px', cursor: 'pointer', borderColor: fieldBorder(field) }}>
        <option value="">{t('personalizar.elInherit')}</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </div>
  );
  const numberField = (field, label, min, max, step, placeholder, disabled = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: disabled ? 0.4 : 1 }}>
      <span style={smallLabel}>{label}</span>
      <input
        type="number" min={min} max={max} step={step} value={current[field] ?? ''} placeholder={placeholder} disabled={disabled}
        onChange={(e) => setField(field, e.target.value === '' ? '' : Number(e.target.value))}
        style={{ ...inputStyle, padding: '8px', fontSize: '11px', borderColor: fieldBorder(field) }}
      />
    </div>
  );
  const imageField = (field, label, extra = null) => (
    <div style={{ ...full, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={smallLabel}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.bgInput, padding: '6px 8px', borderRadius: '4px', border: `1px solid ${fieldBorder(field)}` }}>
        <div style={{ width: '44px', height: '30px', backgroundColor: '#000', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {current[field] ? <img src={current[field]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <Icon name="image" color="#444" />}
        </div>
        <button onClick={() => pickImage(field)} style={{ ...btnStyle(false), flex: 1, padding: '6px', fontSize: '9px' }}>{t.i('personalizar.elLoadImage')}</button>
        {clearBtn(field, !!current[field])}
      </div>
      {extra}
    </div>
  );

  const fontOptions = [
    ['Arial, sans-serif', t('personalizar.fontArial')], ["'Oswald', sans-serif", t('personalizar.fontOswald')],
    ["'Montserrat', sans-serif", t('personalizar.fontMontserrat')], ["'Teko', sans-serif", t('personalizar.fontTeko')],
    ["'Exo 2', sans-serif", t('personalizar.fontExo')], ...EXTRA_FONTS.map(f => [fontCssValue(f), f.name])
  ];
  const opts = (list, prefix) => list.map(v => [v, t(`personalizar.${prefix}${v}`)]);

  // Fila de la lista de navegación (contenedores, el elemento elegido y lo que tiene adentro)
  const row = (item, { depth = 0, active = false } = {}) => (
    <div
      key={item.key}
      onClick={() => onSelect(item.key)}
      onMouseEnter={() => onHover(item.key)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', marginLeft: `${depth * 10}px`, borderRadius: '4px', cursor: 'pointer',
        backgroundColor: active ? 'rgba(255,204,0,0.15)' : colors.bgInput, border: `1px solid ${active ? colors.yellow : colors.border}`,
        fontSize: '10px', fontWeight: 'bold', color: colors.textMain
      }}
    >
      <Icon name={KIND_ICONS[item.kind] || 'crop_square'} color={active ? colors.yellow : colors.textMuted} />
      <span style={{ color: colors.textMuted, flexShrink: 0 }}>{t(`personalizar.elKind_${item.kind}`)}</span>
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{item.label}</span>
      {allStyles[item.key] && <Icon name="tune" color={colors.yellow} title={t('personalizar.elStyledMark')} />}
    </div>
  );

  return (
    <>
      <h3 style={{ color: colors.yellow, marginBottom: '8px' }}>{t('personalizar.elementsTitle', { name: graphicLabel })}</h3>
      <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', marginTop: 0, marginBottom: '12px' }}>{t('personalizar.elementsDesc')}</p>

      <div style={panelBox}>
        <button onClick={onTogglePick} style={{ ...btnStyle(pickMode), width: '100%', padding: '10px', fontSize: '10px', marginBottom: '10px' }}>
          <Icon name="pan_tool" /> {pickMode ? t('personalizar.elPickOn') : t('personalizar.elPick')}
        </button>

        {!node ? (
          <>
            <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', margin: '0 0 8px' }}>{t('personalizar.elNoSelection')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>{tree.children.map(item => row(item))}</div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button
                onClick={() => onSelect(tree.ancestors[tree.ancestors.length - 1]?.key)} disabled={!tree.ancestors.length}
                style={{ ...btnStyle(false), flex: 1, padding: '7px', fontSize: '9px' }}
              ><Icon name="arrow_drop_up" /> {t('personalizar.elParent')}</button>
              <button onClick={() => onSelect(null)} style={{ ...btnStyle(false), flex: 1, padding: '7px', fontSize: '9px' }}>{t('personalizar.elDeselect')}</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '260px', overflowY: 'auto' }}>
              {tree.ancestors.map((item, i) => row(item, { depth: i }))}
              {row(node, { depth: tree.ancestors.length, active: true })}
              {tree.children.length > 0 && (
                <span style={{ ...smallLabel, marginLeft: `${(tree.ancestors.length + 1) * 10}px`, marginTop: '4px' }}>{t('personalizar.elInside')}</span>
              )}
              {tree.children.map(item => row(item, { depth: tree.ancestors.length + 1 }))}
            </div>
          </>
        )}
      </div>

      {node && (
        <div style={panelBox}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {hasText && (
              <>
                <div style={sectionTitle}><Icon name="description" /> {t('personalizar.elSecText')}</div>
                {colorField('color', t('personalizar.elTextColor'))}
                {selectField('textShadow', t('personalizar.elShadow'), Object.keys(TEXT_SHADOWS).map(k => [k, t(`personalizar.elShadow_${k}`)]))}
                {selectField('fontFamily', t('personalizar.elFont'), fontOptions, full)}
                {selectField('fontWeight', t('personalizar.elWeight'), [['400', t('personalizar.elWeight400')], ['700', t('personalizar.elWeight700')], ['900', t('personalizar.elWeight900')]])}
                {selectField('fontStyle', t('personalizar.elStyle'), [['normal', t('personalizar.elStyleNormal')], ['italic', t('personalizar.elStyleItalic')]])}
                {selectField('textTransform', t('personalizar.elTransform'), [['none', t('personalizar.elTfNone')], ['uppercase', t('personalizar.elTfUpper')], ['lowercase', t('personalizar.elTfLower')], ['capitalize', t('personalizar.elTfCap')]])}
                {numberField('letterSpacing', t('personalizar.elSpacing'), -5, 30, 0.5, '—')}
              </>
            )}

            <div style={sectionTitle}><Icon name="crop_square" /> {t('personalizar.elSecBg')}</div>
            {colorField('bgColor', t('personalizar.elBgColor'))}
            {numberField('bgOpacity', t('personalizar.elBgOpacity'), 0, 100, 5, '100')}
            {colorField('bgColor2', t('personalizar.elBgColor2'), ['bgAngle'])}
            {numberField('bgAngle', t('personalizar.elBgAngle'), 0, 360, 15, '90', !current.bgColor2)}
            {imageField('bgImage', t('personalizar.elBgImage'), current.bgImage
              ? selectField('bgSize', t('personalizar.elBgSize'), opts(Object.keys(BG_SIZES), 'elBgSize_'))
              : null)}

            <div style={sectionTitle}><Icon name="fit_screen" /> {t('personalizar.elSecBorder')}</div>
            {colorField('borderColor', t('personalizar.elBorderColor'))}
            {numberField('borderWidth', t('personalizar.elBorderWidth'), 0, 40, 1, '—')}
            {selectField('borderStyle', t('personalizar.elBorderStyle'), opts(BORDER_STYLES, 'elBorderStyle_'))}
            {selectField('borderSides', t('personalizar.elBorderSides'), opts(BORDER_SIDES, 'elBorderSides_'))}
            {numberField('borderRadius', t('personalizar.elBorderRadius'), 0, 500, 1, '—')}
            <span style={{ ...full, fontSize: '9px', color: colors.textMuted, lineHeight: '1.4' }}>{t('personalizar.elBorderHint')}</span>

            {node.kind === 'image' && (
              <>
                <div style={sectionTitle}><Icon name="image" /> {t('personalizar.elSecImage')}</div>
                {imageField('imgSrc', t('personalizar.elImgSrc'))}
                {selectField('imgFit', t('personalizar.elImgFit'), opts(IMG_FITS, 'elImgFit_'))}
              </>
            )}

            <div style={sectionTitle}><Icon name="tune" /> {t('personalizar.elSecEffects')}</div>
            {numberField('opacity', t('personalizar.elOpacity'), 0, 100, 5, '100')}
            {selectField('boxShadow', t('personalizar.elBoxShadow'), Object.keys(BOX_SHADOWS).map(k => [k, t(`personalizar.elShadow_${k}`)]))}
            {numberField('grayscale', t('personalizar.elGrayscale'), 0, 100, 10, '0')}
            {numberField('brightness', t('personalizar.elBrightness'), 0, 300, 10, '100')}
          </div>
          <button onClick={resetElement} disabled={!allStyles[selectedKey]} style={{ ...btnStyle(false), width: '100%', marginTop: '12px', padding: '8px', fontSize: '10px' }}>{t.i('personalizar.elResetElement')}</button>
        </div>
      )}

      <button
        onClick={resetAll} disabled={!styledCount}
        style={{ ...btnStyle(false), width: '100%', padding: '8px', fontSize: '10px', marginBottom: '8px', backgroundColor: styledCount ? '#c0392b' : colors.bgInput, color: '#fff', borderColor: styledCount ? '#e74c3c' : colors.border }}
      >{t.i('personalizar.elResetAll', { n: styledCount })}</button>
      <p style={{ fontSize: '10px', color: colors.textMuted, lineHeight: '1.5', marginTop: 0, marginBottom: '30px' }}>{t('personalizar.elHint')}</p>
    </>
  );
}
