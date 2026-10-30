import { Crest, Avatar } from './common';
import { formationSlots, playerById, displayName, readable } from '../state';

// Alineación: cancha con los 11 titulares en su formación, banco de suplentes, DT y cuerpo técnico.
// El dibujo de cada jugador depende de la liga (theme.marker).
const PITCH = { w: 1180, h: 700, pad: 22 };

function Pitch({ pitch }) {
  const { w, h, pad } = PITCH;
  const stripes = 12;
  const line = { stroke: pitch.line, strokeWidth: 3, fill: 'none' };
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, borderRadius: 12 }}>
      {Array.from({ length: stripes }).map((_, i) => (
        <rect key={i} x={(w / stripes) * i} y={0} width={w / stripes + 1} height={h} fill={i % 2 ? pitch.b : pitch.a} />
      ))}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} {...line} />
      <line x1={w / 2} y1={pad} x2={w / 2} y2={h - pad} {...line} />
      <circle cx={w / 2} cy={h / 2} r={86} {...line} />
      <circle cx={w / 2} cy={h / 2} r={5} fill={pitch.line} />
      {/* áreas grandes y chicas de cada arco */}
      <rect x={pad} y={h / 2 - 190} width={190} height={380} {...line} />
      <rect x={pad} y={h / 2 - 90} width={70} height={180} {...line} />
      <rect x={w - pad - 190} y={h / 2 - 190} width={190} height={380} {...line} />
      <rect x={w - pad - 70} y={h / 2 - 90} width={70} height={180} {...line} />
    </svg>
  );
}

function Shirt({ color, color2, number }) {
  return (
    <svg viewBox="0 0 64 64" width={78} height={78} style={{ filter: 'drop-shadow(0 4px 5px rgba(0,0,0,0.5))' }}>
      <path d="M20 6 L8 14 L2 28 L12 33 L16 27 L16 58 L48 58 L48 27 L52 33 L62 28 L56 14 L44 6 C40 13 24 13 20 6 Z" fill={color} stroke={color2} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="32" y="45" textAnchor="middle" fontSize="23" fontWeight="800" fill={readable(color)} fontFamily="inherit">{number}</text>
    </svg>
  );
}

// Un jugador sobre la cancha, centrado en (left, top)
function Marker({ kind, team, player, left, top, t }) {
  const name = displayName(player);
  const upper = t.upper ? name.toUpperCase() : name;
  const number = player?.number || '';
  const cap = player?.captain ? <span style={{ marginLeft: 6, color: t.accent2 }}>(C)</span> : null;
  const wrap = { position: 'absolute', left, top, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const plate = { marginTop: 5, padding: '3px 12px', fontSize: 25, whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.72)', color: '#fff', borderRadius: Math.min(t.radius, 8) };

  if (kind === 'shirt') {
    return <div style={wrap}><Shirt color={team.color} color2={team.color2} number={number} /><div style={plate}>{upper}{cap}</div></div>;
  }
  if (kind === 'tag') {
    return (
      <div style={{ ...wrap, flexDirection: 'row', alignItems: 'stretch', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
        <div style={{ minWidth: 46, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: team.color, color: readable(team.color), fontSize: 28 }}>{number}</div>
        <div style={{ padding: '5px 14px', background: '#fff', color: '#111', fontSize: 25, whiteSpace: 'nowrap' }}>{upper}{cap}</div>
      </div>
    );
  }
  if (kind === 'square') {
    return (
      <div style={wrap}>
        <div style={{ width: 62, height: 62, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: team.color, color: readable(team.color), border: `3px solid ${t.accent}`, fontSize: 32, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>{number}</div>
        <div style={{ ...plate, background: t.accent, color: t.onAccent }}>{upper}{cap}</div>
      </div>
    );
  }
  return (
    <div style={wrap}>
      <div style={{ width: 66, height: 66, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: team.color, color: readable(team.color), border: `4px solid ${team.color2}`, fontSize: 30, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>{number}</div>
      <div style={plate}>{upper}{cap}</div>
    </div>
  );
}

const SectionTitle = ({ t, children }) => (
  <div style={{ fontSize: 24, letterSpacing: 3, color: t.accent, textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${t.accent}` }}>{children}</div>
);

export default function Lineup({ info, roster, sideData, theme: t, comp }) {
  const slots = formationSlots(sideData.formation);
  const bench = sideData.bench.map(id => playerById(roster, id)).filter(Boolean);
  const upper = (s) => (t.upper ? String(s).toUpperCase() : s);

  return (
    <div style={{ position: 'absolute', left: 60, top: 124, width: 1800, height: 900, fontFamily: t.font, fontWeight: t.weight, color: t.text, background: t.bg, borderRadius: t.radius + 6, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
      {/* franja de color del equipo */}
      <div style={{ height: 10, background: `linear-gradient(90deg, ${info.color}, ${info.color2})` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 26, height: 112, padding: '0 40px' }}>
        <Crest team={info} size={84} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 56, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upper(info.name)}</div>
          <div style={{ fontSize: 26, marginTop: 8, color: t.muted, letterSpacing: 2 }}>
            {upper('Alineación titular')} · <span style={{ color: t.accent }}>{sideData.formation}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {comp.logo && <img src={comp.logo} alt="" style={{ maxHeight: 64, maxWidth: 200, objectFit: 'contain' }} />}
          <div style={{ fontSize: 24, color: t.muted, letterSpacing: 2, marginTop: comp.logo ? 6 : 0 }}>{upper([comp.name, comp.round].filter(Boolean).join(' · '))}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 36, padding: '0 40px' }}>
        <div style={{ position: 'relative', width: PITCH.w, height: PITCH.h, flex: 'none' }}>
          <Pitch pitch={t.pitch} />
          {slots.map((s, i) => {
            const player = playerById(roster, sideData.xi[i]);
            if (!player) return null;
            return (
              <Marker key={i} kind={t.marker} team={info} player={player} t={t}
                left={PITCH.pad + s.x * (PITCH.w - PITCH.pad * 2)} top={PITCH.pad + s.y * (PITCH.h - PITCH.pad * 2)} />
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <SectionTitle t={t}>{upper('Director técnico')}</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <Avatar photo={info.coach.photo} size={86} ring={t.accent} />
              <div style={{ fontSize: 38, lineHeight: 1.05 }}>{upper(info.coach.name || '—')}</div>
            </div>
          </div>

          <div>
            <SectionTitle t={t}>{upper('Suplentes')}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
              {bench.slice(0, 9).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 27, padding: '3px 10px', background: t.panel, borderRadius: Math.min(t.radius, 8) }}>
                  <span style={{ minWidth: 38, textAlign: 'right', color: t.accent }}>{p.number}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upper(displayName(p))}</span>
                </div>
              ))}
              {!bench.length && <div style={{ color: t.muted, fontSize: 24 }}>—</div>}
            </div>
          </div>

          {info.staff.length > 0 && (
            <div>
              <SectionTitle t={t}>{upper('Cuerpo técnico')}</SectionTitle>
              {info.staff.slice(0, 4).map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 23, padding: '2px 0' }}>
                  <span style={{ color: t.muted, whiteSpace: 'nowrap' }}>{s.role}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upper(s.name)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
