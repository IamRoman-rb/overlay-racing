import { Crest } from './common';
import { formatDate } from '../state';

// Presentación del partido: competición, ambos equipos, estadio, fecha, hora y árbitro.
function TeamBlock({ info, t }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
      <Crest team={info} size={230} style={{ filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.5))' }} />
      <div style={{ fontSize: 58, lineHeight: 1.02, textAlign: 'center', maxWidth: 560 }}>{t.upper ? info.name.toUpperCase() : info.name}</div>
      <div style={{ width: 160, height: 8, borderRadius: Math.min(t.radius, 4), background: info.color }} />
    </div>
  );
}

export default function MatchIntro({ home, away, match, comp, theme: t }) {
  const upper = (s) => (t.upper ? String(s).toUpperCase() : s);
  const details = [match.stadium, formatDate(match.date), match.time && `${match.time} hs`].filter(Boolean);

  return (
    <div style={{ position: 'absolute', left: 150, top: 200, width: 1620, height: 680, fontFamily: t.font, fontWeight: t.weight, color: t.text, background: t.bg, borderRadius: t.radius + 6, boxShadow: '0 24px 70px rgba(0,0,0,0.65)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, ${home.color}55 0%, transparent 42%, transparent 58%, ${away.color}55 100%)` }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '34px 50px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, minHeight: 72 }}>
          {comp.logo && <img src={comp.logo} alt="" style={{ maxHeight: 72, maxWidth: 240, objectFit: 'contain' }} />}
          <div style={{ fontSize: 36, letterSpacing: 4, color: t.accent }}>{upper(comp.name)}</div>
          {comp.round && <div style={{ fontSize: 26, padding: '5px 18px', borderRadius: Math.min(t.radius, 999), background: t.accent, color: t.onAccent, letterSpacing: 2 }}>{upper(comp.round)}</div>}
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 20 }}>
          <TeamBlock info={home} t={t} />
          <div style={{ fontSize: 76, color: t.accent2 === '#ffffff' ? t.accent : t.accent2, letterSpacing: 4 }}>VS</div>
          <TeamBlock info={away} t={t} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 34, fontSize: 30, color: t.text, padding: '16px 0 4px', borderTop: `2px solid ${t.accent}55` }}>
          {details.map((d, i) => <span key={i}>{upper(d)}</span>)}
          {match.referee && <span style={{ color: t.muted }}>{upper(`Árbitro: ${match.referee}`)}</span>}
        </div>
      </div>
    </div>
  );
}
