// Editor de un sponsor (pestaña SPONSORS): recorte (se guarda aparte, el archivo no se toca) y QUITAR FONDO para imágenes
// con fondo de color liso (se guarda un PNG nuevo y se conserva el original para poder restaurarlo).
import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { alphaBounds, normalizeCrop, removeBackground, sponsorUrl } from '../utils/sponsors';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch { /* fuera de Electron */ }
}

const STAGE_W = 720;
const STAGE_H = 420;
const MAX_SIDE = 4096;
const FULL = { x: 0, y: 0, w: 1, h: 1 };
const CHECKER = 'repeating-conic-gradient(#3a3a3a 0% 25%, #262626 0% 50%) 50% / 20px 20px';

// Píxeles de una imagen (servida por el programa o data URL)
function loadPixels(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k)); const h = Math.max(1, Math.round(img.naturalHeight * k));
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ canvas, ctx, image: ctx.getImageData(0, 0, w, h), w, h });
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error('load'));
    img.src = src;
  });
}

export default function SponsorEditor({ sponsor, colors, btnStyle, t, onSave, onClose }) {
  const isVideo = sponsor.type === 'video';
  const canRemoveBg = !isVideo && !/\.gif$/i.test(sponsor.file);
  const originalSrc = sponsorUrl(sponsor.originalFile || sponsor.file);
  const [workSrc, setWorkSrc] = useState(() => sponsorUrl(sponsor.file));
  const [processed, setProcessed] = useState(null);      // data URL con el fondo quitado (sin guardar)
  const [restore, setRestore] = useState(false);          // volver al archivo original al guardar
  const [crop, setCrop] = useState(() => normalizeCrop(sponsor.crop) || FULL);
  const [tolerance, setTolerance] = useState(40);
  const [nat, setNat] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const dragRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const scale = nat ? Math.min(STAGE_W / nat.w, STAGE_H / nat.h, 4) : 1;
  const dispW = nat ? nat.w * scale : STAGE_W;
  const dispH = nat ? nat.h * scale : STAGE_H;
  const rect = { left: crop.x * dispW, top: crop.y * dispH, width: crop.w * dispW, height: crop.h * dispH };

  // --- Recorte con el mouse: mover el recuadro o tirar de una esquina ---
  const onDown = (e, mode) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode, x: e.clientX, y: e.clientY, start: { ...crop } };
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const fx = (e.clientX - d.x) / dispW; const fy = (e.clientY - d.y) / dispH;
    const s = d.start; const MIN = 0.03;
    if (d.mode === 'move') {
      setCrop({ ...s, x: Math.min(1 - s.w, Math.max(0, s.x + fx)), y: Math.min(1 - s.h, Math.max(0, s.y + fy)) });
      return;
    }
    let x0 = s.x; let y0 = s.y; let x1 = s.x + s.w; let y1 = s.y + s.h;
    if (d.mode.includes('w')) x0 = Math.min(x1 - MIN, Math.max(0, s.x + fx));
    if (d.mode.includes('e')) x1 = Math.max(x0 + MIN, Math.min(1, s.x + s.w + fx));
    if (d.mode.includes('n')) y0 = Math.min(y1 - MIN, Math.max(0, s.y + fy));
    if (d.mode.includes('s')) y1 = Math.max(y0 + MIN, Math.min(1, s.y + s.h + fy));
    setCrop({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  };
  const onUp = () => { dragRef.current = null; };

  // --- Quitar fondo (siempre desde el original, así cambiar la tolerancia no acumula) ---
  const doRemoveBg = async () => {
    setBusy(true); setMsg('');
    try {
      const { ctx, image, canvas } = await loadPixels(originalSrc);
      const cleared = removeBackground(image.data, image.width, image.height, tolerance);
      if (!cleared) { setMsg(t('sponsors.editNoBg')); return; }
      ctx.putImageData(image, 0, 0);
      const url = canvas.toDataURL('image/png');
      setProcessed(url); setRestore(false); setWorkSrc(url);
    } catch {
      setMsg(t('sponsors.editError'));
    } finally { setBusy(false); }
  };
  const doRestore = () => { setProcessed(null); setRestore(!!sponsor.originalFile); setWorkSrc(originalSrc); };

  // --- Recortar los bordes vacíos (transparentes) ---
  const doTrim = async () => {
    setBusy(true); setMsg('');
    try {
      const { image } = await loadPixels(workSrc);
      const b = alphaBounds(image.data, image.width, image.height);
      if (!b || (b.w > 0.995 && b.h > 0.995)) setMsg(t('sponsors.editNoTrim'));
      else setCrop(b);
    } catch {
      setMsg(t('sponsors.editError'));
    } finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const next = { ...sponsor };
      const c = normalizeCrop(crop);
      if (c) next.crop = c; else delete next.crop;
      const toDelete = [];
      if (processed) {
        const res = ipcRenderer ? await ipcRenderer.invoke('save-sponsor-image', processed) : null;
        if (!res || !res.file) { setMsg(t('sponsors.editError')); return; }
        if (sponsor.originalFile) toDelete.push(sponsor.file); // la versión sin fondo anterior
        next.originalFile = sponsor.originalFile || sponsor.file;
        next.file = res.file;
      } else if (restore && sponsor.originalFile) {
        toDelete.push(sponsor.file);
        next.file = sponsor.originalFile;
        delete next.originalFile;
      }
      onSave(next);
      if (ipcRenderer) toDelete.forEach(f => ipcRenderer.invoke('delete-sponsor-file', f).catch(() => {}));
      onClose();
    } finally { setBusy(false); }
  };

  const handle = (mode, style) => (
    <div onPointerDown={(e) => onDown(e, mode)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{ position: 'absolute', width: '14px', height: '14px', backgroundColor: '#ffcc00', border: '2px solid #000', borderRadius: '3px', touchAction: 'none', ...style }} />
  );
  const mediaStyle = { width: `${dispW}px`, height: `${dispH}px`, display: 'block', opacity: nat ? 1 : 0 };
  const small = { fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const pct = (v) => `${Math.round(v * 100)}%`;

  return (
    <div onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '18px', display: 'flex', gap: '18px', maxWidth: '100%', maxHeight: '100%', overflow: 'auto' }}>
        {/* Imagen con el recuadro de recorte */}
        <div style={{ width: `${STAGE_W}px`, height: `${STAGE_H}px`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: CHECKER, borderRadius: '4px' }}>
          <div style={{ position: 'relative', width: `${dispW}px`, height: `${dispH}px`, overflow: 'hidden' }}>
            {isVideo
              ? <video src={workSrc} autoPlay muted loop playsInline style={mediaStyle} onLoadedMetadata={(e) => setNat({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })} />
              : <img src={workSrc} alt="" draggable={false} style={mediaStyle} onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />}
            {nat && (
              <div onPointerDown={(e) => onDown(e, 'move')} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height, boxSizing: 'border-box', border: '2px dashed #ffcc00', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', cursor: 'move', touchAction: 'none' }}>
                {handle('nw', { left: -8, top: -8, cursor: 'nwse-resize' })}
                {handle('ne', { right: -8, top: -8, cursor: 'nesw-resize' })}
                {handle('sw', { left: -8, bottom: -8, cursor: 'nesw-resize' })}
                {handle('se', { right: -8, bottom: -8, cursor: 'nwse-resize' })}
              </div>
            )}
          </div>
        </div>

        {/* Herramientas */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: colors.yellow }}>{t('sponsors.editTitle', { name: sponsor.name || sponsor.file })}</div>

          <div style={small}>{t('sponsors.editCrop')}</div>
          <span style={{ fontSize: '10px', color: colors.textMuted }}>{t('sponsors.editCropHint')}</span>
          <span style={{ fontSize: '11px', color: colors.textMain }}>{nat ? `${Math.round(crop.w * nat.w)} × ${Math.round(crop.h * nat.h)} px (${pct(crop.w)} × ${pct(crop.h)})` : ''}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {!isVideo && <button onClick={doTrim} disabled={busy} style={{ ...btnStyle(false), flex: 1, padding: '7px', fontSize: '10px' }}>{t('sponsors.editTrim')}</button>}
            <button onClick={() => setCrop(FULL)} disabled={busy} style={{ ...btnStyle(false), flex: 1, padding: '7px', fontSize: '10px' }}>{t('sponsors.editResetCrop')}</button>
          </div>

          {canRemoveBg && (
            <>
              <div style={{ ...small, marginTop: '8px' }}>{t('sponsors.editBg')}</div>
              <span style={{ fontSize: '10px', color: colors.textMuted }}>{t('sponsors.editBgHint')}</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', ...small }}>
                {t('sponsors.editTolerance')}
                <input type="range" min="5" max="140" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ width: '26px', textAlign: 'right', color: colors.textMain }}>{tolerance}</span>
              </label>
              <button onClick={doRemoveBg} disabled={busy} style={{ ...btnStyle(!!processed), padding: '8px', fontSize: '10px' }}>{t('sponsors.editRemoveBg')}</button>
              {(processed || (sponsor.originalFile && !restore)) && (
                <button onClick={doRestore} disabled={busy} style={{ ...btnStyle(false), padding: '7px', fontSize: '10px' }}>{t('sponsors.editRestore')}</button>
              )}
            </>
          )}

          {msg && <span style={{ fontSize: '11px', color: '#e67e22' }}>{msg}</span>}
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={onClose} disabled={busy} style={{ ...btnStyle(false), flex: 1, padding: '9px', fontSize: '11px' }}>{t('sponsors.editCancel')}</button>
            <button onClick={save} disabled={busy || !nat} style={{ ...btnStyle(true), flex: 1, padding: '9px', fontSize: '11px' }}><Icon name="save" />{t('sponsors.editSave')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
