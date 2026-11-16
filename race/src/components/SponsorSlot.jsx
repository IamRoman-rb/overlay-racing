import { useEffect, useRef, useState } from 'react';
import { cropLayout, getPlacement, normalizeCrop, placementRect, sponsorList, sponsorUrl, useSequence } from '../utils/sponsors';

// Tamaño del recuadro (sin la escala de la gráfica), para ubicar la imagen recortada
function useBoxSize(ref, enabled) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;
    const read = () => setSize(prev => (prev.w === el.clientWidth && prev.h === el.clientHeight ? prev : { w: el.clientWidth, h: el.clientHeight }));
    read();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, enabled]);
  return size;
}

// Video de un sponsor. Suena sólo si `audible` (el sponsor tiene sonido, está al aire y es el que se ve) y vuelve al
// principio cada vez que pasa a verse (`active`); mientras no se ve queda en pausa. React no actualiza `muted` después
// del primer render: va por ref.
//   onEnded: en una rotación con varios sponsors el video se pasa una vez completo y avisa al terminar (o si no carga)
//            para pasar al siguiente; sin onEnded queda en bucle.
function SponsorVideo({ src, sponsor, audible, active, style, onMeta, onEnded }) {
  const ref = useRef(null);
  const sound = !!audible && sponsor.sound === true;
  const volume = Number.isFinite(Number(sponsor.volume)) ? Math.min(1, Math.max(0, Number(sponsor.volume) / 100)) : 1;
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !sound;
    v.volume = volume;
    if (sound && v.paused) v.play().catch(() => {});
  }, [sound, volume]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (!active) { v.pause(); return; }
    try { v.currentTime = 0; } catch { /* todavía sin cargar */ }
    v.play().catch(() => {});
  }, [active]);
  const sequenced = typeof onEnded === 'function';
  return (
    <video ref={ref} key={src} src={src} autoPlay={active} muted loop={!sequenced} playsInline style={style} onLoadedMetadata={onMeta}
      onEnded={sequenced && active ? onEnded : undefined} onError={sequenced && active ? onEnded : undefined} />
  );
}

// Un sponsor (imagen o video en bucle) ocupando todo su recuadro, con el recorte elegido en SPONSORS.
// El recorte se calcula con medidas (sin aspect-ratio ni object-view-box) para que ande en el Chromium viejo de vMix.
//   audible: puede sonar (sólo en las salidas al aire); active: es el que se ve ahora (en una rotación)
//   onEnded: ver SponsorVideo (sólo en las rotaciones)
export function SponsorMedia({ sponsor, fit = 'contain', style, audible = false, active = true, onEnded }) {
  const src = sponsor ? sponsorUrl(sponsor.file) : null;
  const crop = sponsor ? normalizeCrop(sponsor.crop) : null;
  const boxRef = useRef(null);
  const box = useBoxSize(boxRef, !!crop);
  const [nat, setNat] = useState(null); // { src, w, h } medida real de la imagen o del video
  if (!src) return null;
  const isVideo = sponsor.type === 'video';

  if (!crop) {
    const common = { width: '100%', height: '100%', objectFit: fit, display: 'block', ...style };
    if (isVideo) return <SponsorVideo src={src} sponsor={sponsor} audible={audible} active={active} onEnded={onEnded} style={common} />;
    return <img key={src} src={src} alt="" style={common} />;
  }

  const natural = nat && nat.src === src ? nat : null;
  const layout = natural ? cropLayout(box.w, box.h, natural.w, natural.h, crop, fit) : null;
  const mediaStyle = layout
    ? { position: 'absolute', left: `${layout.media.left}px`, top: `${layout.media.top}px`, width: `${layout.media.width}px`, height: `${layout.media.height}px`, maxWidth: 'none', display: 'block' }
    : { position: 'absolute', left: 0, top: 0, opacity: 0 }; // se mide antes de mostrarse
  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <div style={layout ? { position: 'absolute', overflow: 'hidden', left: `${layout.clip.left}px`, top: `${layout.clip.top}px`, width: `${layout.clip.width}px`, height: `${layout.clip.height}px` } : { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }}>
        {isVideo
          ? <SponsorVideo src={src} sponsor={sponsor} audible={audible} active={active} onEnded={onEnded} style={mediaStyle} onMeta={(e) => setNat({ src, w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })} />
          : <img key={src} src={src} alt="" style={mediaStyle} onLoad={(e) => setNat({ src, w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />}
      </div>
    </div>
  );
}

// Recuadro de sponsors pegado a una gráfica (lo dibuja LayoutEdits): aparece y se va junto con la gráfica.
//   visible: undefined = vista previa (siempre se ve)
export default function SponsorSlot({ id, config, visible }) {
  const placement = getPlacement(config, id);
  const shown = visible === undefined ? true : !!visible;
  const all = sponsorList(config);
  const items = placement ? placement.ids.map(x => all.find(s => s.id === x)).filter(Boolean) : [];
  // Imágenes: los segundos elegidos; videos: se pasan completos
  const { index, next } = useSequence(items, placement ? placement.interval : 6, shown);
  if (!placement || !items.length) return null;
  const rect = placementRect(placement, config?.positions?.[id]);
  return (
    <div data-sponsor-slot="1" style={{
      position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
      zIndex: 60, pointerEvents: 'none', opacity: shown ? 1 : 0, transition: 'opacity 0.4s ease'
    }}>
      {items.map((s, i) => (
        <div key={s.id} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: i === index ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <SponsorMedia sponsor={s} active={i === index} audible={visible !== undefined && shown && i === index} onEnded={items.length > 1 ? next : undefined} />
        </div>
      ))}
    </div>
  );
}
