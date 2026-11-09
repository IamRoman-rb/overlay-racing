import { getGraphicFrame } from '../utils/raceVisuals';
import { sponsorList, useRotation } from '../utils/sponsors';
import { SponsorMedia } from '../components/SponsorSlot';

// SPONSOR AL AIRE (pestaña SPONSORS): un sponsor elegido o todos rotando.
//   state: { isVisible, sponsorId, rotate }
//   Formatos (config.sponsorLiveFormat): 'card' (recuadro con fondo) | 'clean' (solo el logo) | 'fullscreen' (pantalla completa, para spots en video)
//   config.sponsorLiveWidth: ancho del recuadro (px); config.sponsorRotateSec: segundos por sponsor al rotar.
export default function SponsorLive({ state, config, id = 'sponsorLive' }) {
  const isVisible = !!state?.isVisible;
  const format = config?.sponsorLiveFormat || 'card';
  const full = format === 'fullscreen';
  const { wrapperStyle, bRad, theme } = getGraphicFrame(config, id, isVisible, { x: 1560, y: 40, scale: 1 }, full ? 90 : 55);
  const all = sponsorList(config);
  const items = state?.rotate ? all : all.filter(s => s.id === state?.sponsorId);
  const seconds = Math.min(120, Math.max(2, parseInt(config?.sponsorRotateSec, 10) || 8));
  const index = useRotation(items.length, seconds, isVisible);
  const width = Math.min(1920, Math.max(80, parseInt(config?.sponsorLiveWidth, 10) || 320));
  const height = Math.round(width * 0.5);

  const layers = items.map((s, i) => (
    <div key={s.id} style={{ position: 'absolute', inset: 0, opacity: i === index ? 1 : 0, transition: 'opacity 0.6s ease' }}>
      <SponsorMedia sponsor={s} fit={full ? 'cover' : 'contain'} />
    </div>
  ));

  if (full) {
    return (
      <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 90, pointerEvents: 'none', opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s ease', backgroundColor: isVisible && items.length ? '#000' : 'transparent' }}>
        {layers}
      </div>
    );
  }

  const card = format === 'card';
  return (
    <div style={wrapperStyle}>
      <div style={{
        position: 'relative', width: `${width}px`, height: `${height}px`, boxSizing: 'border-box',
        padding: card ? '12px' : 0, borderRadius: card ? bRad : 0, overflow: 'hidden',
        backgroundColor: card ? theme.bg : 'transparent', borderTop: card ? `3px solid ${theme.main}` : 'none',
        boxShadow: card ? '0 10px 30px rgba(0,0,0,0.45)' : 'none'
      }}>
        <div style={{ position: 'absolute', inset: card ? '12px' : 0 }}>{layers}</div>
      </div>
    </div>
  );
}
