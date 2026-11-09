import { getPlacement, placementRect, sponsorList, sponsorUrl, useRotation } from '../utils/sponsors';

// Un sponsor (imagen o video en silencio y en bucle) ocupando todo su recuadro
export function SponsorMedia({ sponsor, fit = 'contain', style }) {
  const src = sponsor ? sponsorUrl(sponsor.file) : null;
  if (!src) return null;
  const common = { width: '100%', height: '100%', objectFit: fit, display: 'block', ...style };
  if (sponsor.type === 'video') return <video key={src} src={src} autoPlay muted loop playsInline style={common} />;
  return <img key={src} src={src} alt="" style={common} />;
}

// Recuadro de sponsors pegado a una gráfica (lo dibuja LayoutEdits): aparece y se va junto con la gráfica.
//   visible: undefined = vista previa (siempre se ve)
export default function SponsorSlot({ id, config, visible }) {
  const placement = getPlacement(config, id);
  const shown = visible === undefined ? true : !!visible;
  const all = sponsorList(config);
  const items = placement ? placement.ids.map(x => all.find(s => s.id === x)).filter(Boolean) : [];
  const index = useRotation(items.length, placement ? placement.interval : 6, shown);
  if (!placement || !items.length) return null;
  const rect = placementRect(placement, config?.positions?.[id]);
  return (
    <div data-sponsor-slot="1" style={{
      position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
      zIndex: 60, pointerEvents: 'none', opacity: shown ? 1 : 0, transition: 'opacity 0.4s ease'
    }}>
      {items.map((s, i) => (
        <div key={s.id} style={{ position: 'absolute', inset: 0, opacity: i === index ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <SponsorMedia sponsor={s} />
        </div>
      ))}
    </div>
  );
}
