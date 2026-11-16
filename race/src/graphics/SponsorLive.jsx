import { getGraphicFrame } from '../utils/raceVisuals';
import { liveItems, sponsorTransparent, useSequence } from '../utils/sponsors';
import { SponsorMedia } from '../components/SponsorSlot';

// SPONSOR AL AIRE (pestaña SPONSORS): un sponsor elegido o todos rotando.
//   state: { isVisible, sponsorId, rotate, groupId }
//   Formatos (config.sponsorLiveFormat): 'card' (recuadro con fondo) | 'clean' (solo el logo) | 'fullscreen' (pantalla completa, para spots en video)
//   config.sponsorLiveWidth: ancho del recuadro (px); config.sponsorRotateSec: segundos por imagen al rotar (los videos se pasan completos).
//   Los PNG / SVG / WebP / GIF (con transparencia) salen siempre sin caja ni fondo: solo el logo.
export default function SponsorLive({ state, config, id = 'sponsorLive', preview = false }) {
  const isVisible = !!state?.isVisible;
  const format = config?.sponsorLiveFormat || 'card';
  const full = format === 'fullscreen';
  const { wrapperStyle, bRad, theme } = getGraphicFrame(config, id, isVisible, { x: 1560, y: 40, scale: 1 }, full ? 90 : 55);
  // Uno elegido, o rotando los activos (de un grupo o todos), en el orden de la biblioteca
  const items = liveItems(config, state);
  const seconds = Math.min(120, Math.max(2, parseInt(config?.sponsorRotateSec, 10) || 8));
  // Imágenes: config.sponsorRotateSec; videos: se pasan completos antes de seguir
  const { index, next } = useSequence(items, seconds, isVisible);
  const width = Math.min(1920, Math.max(80, parseInt(config?.sponsorLiveWidth, 10) || 320));
  const height = Math.round(width * 0.5);

  const current = items[index] || null;
  const clear = sponsorTransparent(current); // el sponsor que se ve ahora tiene transparencia: sin fondo

  const layers = items.map((s, i) => (
    <div key={s.id} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: i === index ? 1 : 0, transition: 'opacity 0.6s ease' }}>
      <SponsorMedia sponsor={s} fit={full && !sponsorTransparent(s) ? 'cover' : 'contain'} active={i === index} audible={!preview && isVisible && i === index} onEnded={items.length > 1 ? next : undefined} />
    </div>
  ));

  if (full) {
    return (
      <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 90, pointerEvents: 'none', opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s ease', backgroundColor: isVisible && items.length && !clear ? '#000' : 'transparent' }}>
        {layers}
      </div>
    );
  }

  const card = format === 'card';
  const box = card && !clear;
  return (
    <div style={wrapperStyle}>
      <div style={{
        position: 'relative', width: `${width}px`, height: `${height}px`, boxSizing: 'border-box',
        padding: card ? '12px' : 0, borderRadius: card ? bRad : 0, overflow: 'hidden',
        backgroundColor: box ? theme.bg : 'transparent', borderTop: `3px solid ${box ? theme.main : 'transparent'}`,
        boxShadow: box ? '0 10px 30px rgba(0,0,0,0.45)' : 'none', transition: 'background-color 0.6s ease, box-shadow 0.6s ease, border-color 0.6s ease'
      }}>
        <div style={{ position: 'absolute', top: card ? '12px' : 0, right: card ? '12px' : 0, bottom: card ? '12px' : 0, left: card ? '12px' : 0 }}>{layers}</div>
      </div>
    </div>
  );
}
