import { Crest, Avatar } from './common';
import { displayName } from '../state';

// Alerta de evento del partido (gol, cambio, tarjeta amarilla o roja) en la parte baja de la pantalla.
const KIND = {
  goal: { label: 'GOL' },
  sub: { label: 'CAMBIO' },
  yellow: { label: 'AMARILLA', color: '#f5c518', text: '#111' },
  red: { label: 'ROJA', color: '#e0202b', text: '#fff' }
};

function PlayerLine({ arrow, color, player, size = 46, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: size, lineHeight: 1.1 }}>
      <span style={{ color, fontSize: size * 0.8, width: 34 }}>{arrow}</span>
      <span style={{ color: t.accent, minWidth: 44 }}>{player?.number}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{t.upper ? displayName(player).toUpperCase() : displayName(player)}</span>
    </div>
  );
}

export default function EventAlert({ alert, info, player, outPlayer, score, theme: t }) {
  const kind = KIND[alert.kind] || KIND.goal;
  const labelBg = kind.color || t.accent;
  const labelText = kind.text || t.onAccent;
  const upper = (s) => (t.upper ? String(s).toUpperCase() : s);
  const isSub = alert.kind === 'sub';

  return (
    <div style={{ position: 'relative', width: 1320, height: 190, display: 'flex', fontFamily: t.font, fontWeight: t.weight, color: t.text, boxShadow: '0 16px 40px rgba(0,0,0,0.6)', borderRadius: t.radius, overflow: 'hidden' }}>
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: labelBg, color: labelText }}>
        <div style={{ fontSize: alert.kind === 'goal' ? 64 : 38, letterSpacing: 2, lineHeight: 1 }}>{kind.label}</div>
        {alert.minute !== '' && alert.minute != null && <div style={{ fontSize: 34, opacity: 0.9 }}>{alert.minute}'</div>}
        {alert.ownGoal && <div style={{ fontSize: 22, letterSpacing: 2 }}>EN CONTRA</div>}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 26, padding: '0 36px', background: t.bg }}>
        {!isSub && <Avatar photo={player?.photo} size={130} ring={info.color} />}
        <Crest team={info} size={isSub ? 90 : 70} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {isSub ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PlayerLine arrow="▲" color="#2ecc71" player={player} t={t} />
              <PlayerLine arrow="▼" color="#e74c3c" player={outPlayer} t={t} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 24, color: t.muted, letterSpacing: 3 }}>{upper(info.name)}</div>
              <div style={{ fontSize: 66, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ color: t.accent, marginRight: 18 }}>{player?.number}</span>{upper(player ? (player.name || displayName(player)) : '')}
              </div>
            </>
          )}
        </div>
        {alert.kind === 'goal' && score && (
          <div style={{ fontSize: 76, letterSpacing: 4, padding: '0 6px' }}>{score.home}<span style={{ color: t.accent, margin: '0 10px' }}>-</span>{score.away}</div>
        )}
      </div>
    </div>
  );
}
