import { Crest } from './common';

// Marcador + reloj. Cada liga tiene su propio diseño (theme.bug); todos reciben lo mismo:
//   b = { home, away, hs, as, clock, period, added, comp: { logo, tag } }
const SHADOW = '0 8px 22px rgba(0,0,0,0.45)';

// Logo de la competición (si se cargó) o la sigla de la liga
function CompMark({ b, t, size, color }) {
  return b.comp.logo
    ? <img src={b.comp.logo} alt="" style={{ maxWidth: size, maxHeight: size, objectFit: 'contain' }} />
    : <span style={{ color, fontSize: size * 0.5, letterSpacing: 1 }}>{b.comp.tag || t.tag}</span>;
}

// Texto extra del reloj: tiempo agregado (+3) si lo hay
const Added = ({ b, style }) => (b.added > 0 ? <span style={style}>+{b.added}</span> : null);

function Bundesliga({ b, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: 60, boxShadow: SHADOW, textTransform: 'uppercase' }}>
      <div style={{ width: 70, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CompMark b={b} t={t} size={46} color={t.onAccent} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 0 12px', background: '#fff', color: '#111', borderLeft: `7px solid ${b.home.color}` }}>
        <Crest team={b.home} size={40} /><span style={{ fontSize: 34 }}>{b.home.short}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', background: '#111', color: '#fff', fontSize: 42 }}>
        <span>{b.hs}</span><span style={{ color: t.accent }}>:</span><span>{b.as}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 0 16px', background: '#fff', color: '#111', borderRight: `7px solid ${b.away.color}` }}>
        <span style={{ fontSize: 34 }}>{b.away.short}</span><Crest team={b.away} size={40} />
      </div>
      {b.clock && (
        <div style={{ minWidth: 128, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px', background: '#2a2a2f', color: '#fff', fontSize: 34 }}>
          {b.clock}<Added b={b} style={{ color: t.accent, fontSize: 26 }} />
        </div>
      )}
    </div>
  );
}

function Premier({ b, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 68, borderRadius: t.radius, background: t.bg, boxShadow: SHADOW, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ width: 72, height: '100%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CompMark b={b} t={t} size={44} color="#fff" />
      </div>
      <div style={{ width: 8, height: '100%', background: b.home.color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', fontSize: 30 }}>
        <span>{b.home.short}</span><Crest team={b.home} size={42} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', height: 48, borderRadius: 10, background: '#fff', color: t.onAccent, fontSize: 36 }}>
        <span>{b.hs}</span><span style={{ opacity: 0.4 }}>–</span><span>{b.as}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', fontSize: 30 }}>
        <Crest team={b.away} size={42} /><span>{b.away.short}</span>
      </div>
      <div style={{ width: 8, height: '100%', background: b.away.color }} />
      {b.clock && (
        <div style={{ minWidth: 118, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 18px', background: t.accent, color: t.onAccent, fontSize: 30 }}>
          {b.clock}<Added b={b} style={{ fontSize: 22 }} />
        </div>
      )}
    </div>
  );
}

function LaLiga({ b, t }) {
  const digit = { width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#111', fontSize: 34, borderRadius: 2 };
  return (
    <div style={{ boxShadow: SHADOW }}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }} />
      <div style={{ display: 'flex', alignItems: 'center', height: 64, background: '#121216', textTransform: 'uppercase' }}>
        <div style={{ width: 74, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
          <CompMark b={b} t={t} size={46} color={t.accent} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px' }}>
          <Crest team={b.home} size={42} /><span style={{ fontSize: 28 }}>{b.home.short}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}><div style={digit}>{b.hs}</div><div style={digit}>{b.as}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px' }}>
          <span style={{ fontSize: 28 }}>{b.away.short}</span><Crest team={b.away} size={42} />
        </div>
        {b.clock && (
          <div style={{ minWidth: 120, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px', background: t.accent, fontSize: 28 }}>
            {b.clock}<Added b={b} style={{ fontSize: 20 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function Argentina({ b, t }) {
  const cut = 'polygon(0 0, 100% 0, calc(100% - 22px) 100%, 22px 100%)';
  return (
    <div style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.45))' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 66, padding: '0 34px', gap: 14, background: `linear-gradient(180deg, #9cc6ec 0%, ${t.accent} 100%)`, color: t.onAccent, clipPath: cut, textTransform: 'uppercase', borderBottom: `5px solid ${t.accent2}` }}>
        <Crest team={b.home} size={44} /><span style={{ fontSize: 32 }}>{b.home.short}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 48, background: t.onAccent, color: '#fff', fontSize: 38 }}>
          <span>{b.hs}</span><span style={{ color: t.accent2 }}>-</span><span>{b.as}</span>
        </div>
        <span style={{ fontSize: 32 }}>{b.away.short}</span><Crest team={b.away} size={44} />
        {b.clock && (
          <div style={{ marginLeft: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 48, background: t.accent2, color: t.onAccent, fontSize: 30 }}>
            {b.clock}<Added b={b} style={{ fontSize: 22 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function Mls({ b, t }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, height: 68, padding: '0 14px', borderRadius: 999, boxShadow: SHADOW,
      background: 'rgba(14,14,18,0.78)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <Crest team={b.home} size={46} />
      <span style={{ fontSize: 28 }}>{b.home.short}</span>
      <span style={{ fontSize: 42, minWidth: 34, textAlign: 'center' }}>{b.hs}</span>
      <span style={{ width: 2, height: 30, background: 'rgba(255,255,255,0.25)' }} />
      <span style={{ fontSize: 42, minWidth: 34, textAlign: 'center' }}>{b.as}</span>
      <span style={{ fontSize: 28 }}>{b.away.short}</span>
      <Crest team={b.away} size={46} />
      {b.clock && (
        <div style={{ marginLeft: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 999, background: t.accent2, fontSize: 26 }}>
          {b.clock}<Added b={b} style={{ fontSize: 20, opacity: 0.85 }} />
        </div>
      )}
    </div>
  );
}

const VARIANTS = { bundesliga: Bundesliga, premier: Premier, laliga: LaLiga, argentina: Argentina, mls: Mls };

export default function Scorebug({ bug, theme: t }) {
  const Variant = VARIANTS[t.bug] || Premier;
  return (
    <div style={{ fontFamily: t.font, fontWeight: t.weight, color: t.text, lineHeight: 1 }}>
      <Variant b={bug} t={t} />
    </div>
  );
}
