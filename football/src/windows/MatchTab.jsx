import { Field, ImagePicker } from './ui';
import { Crest } from '../graphics/common';
import { LEAGUE_LIST } from '../leagues';
import { FORMATIONS, formationSlots, autoLineup, emptySide, teamById, displayName } from '../state';

// Configuración del partido: liga (estilo gráfico), datos del encuentro, equipos y alineaciones.
export default function MatchTab({ state, update }) {
  const { match } = state;
  const patchMatch = (patch) => update(s => ({ ...s, match: { ...s.match, ...patch } }));
  const patchSide = (side, patch) => update(s => ({ ...s, match: { ...s.match, [side]: { ...s.match[side], ...patch } } }));

  // Al elegir un equipo se arma solo una alineación tentativa por posiciones (se corrige a mano después)
  const chooseTeam = (side, teamId) => {
    const key = side === 'home' ? 'homeId' : 'awayId';
    const team = teamById(state, teamId);
    const formation = match[side].formation;
    update(s => ({
      ...s,
      match: {
        ...s.match, [key]: teamId || null,
        [side]: team ? { formation, ...autoLineup(team, formation) } : emptySide(),
        stadium: side === 'home' && team?.stadium && !s.match.stadium ? team.stadium : s.match.stadium
      }
    }));
  };

  const swapTeams = () => update(s => ({
    ...s, match: { ...s.match, homeId: s.match.awayId, awayId: s.match.homeId, home: s.match.away, away: s.match.home }
  }));

  return (
    <div className="stack">
      <div className="card">
        <h3>Estilo gráfico de la liga</h3>
        <div className="league-grid">
          {LEAGUE_LIST.map(l => (
            <button key={l.id} className={`league-card ${match.league === l.id ? 'active' : ''}`} onClick={() => patchMatch({ league: l.id })}>
              <span className="swatch">{l.swatch.map(c => <i key={c} style={{ background: c }} />)}</span>
              <strong>{l.name}</strong>
              <small>{l.country}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Datos del partido</h3>
        <div className="row">
          <Field label="Competición (texto en las gráficas)" grow={3}><input value={match.competition} placeholder="Ej: Liga Profesional" onChange={e => patchMatch({ competition: e.target.value })} /></Field>
          <Field label="Fecha / ronda" grow={2}><input value={match.round} placeholder="Ej: Fecha 12" onChange={e => patchMatch({ round: e.target.value })} /></Field>
          <Field label="Logo de la competición"><ImagePicker value={match.competitionLogo} onChange={competitionLogo => patchMatch({ competitionLogo })} label="logo" /></Field>
        </div>
        <div className="row">
          <Field label="Estadio" grow={3}><input value={match.stadium} onChange={e => patchMatch({ stadium: e.target.value })} /></Field>
          <Field label="Día" grow={2}><input type="date" value={match.date} onChange={e => patchMatch({ date: e.target.value })} /></Field>
          <Field label="Hora" grow={1}><input type="time" value={match.time} onChange={e => patchMatch({ time: e.target.value })} /></Field>
          <Field label="Árbitro" grow={3}><input value={match.referee} onChange={e => patchMatch({ referee: e.target.value })} /></Field>
        </div>
      </div>

      <div className="card">
        <h3>Equipos</h3>
        {!state.teams.length && <p className="hint">Primero cargá los equipos en la pestaña EQUIPOS.</p>}
        <div className="row">
          <Field label="Local" grow={1}>
            <select value={match.homeId || ''} onChange={e => chooseTeam('home', e.target.value)}>
              <option value="">— elegir —</option>
              {state.teams.map(t => <option key={t.id} value={t.id} disabled={t.id === match.awayId}>{t.name}</option>)}
            </select>
          </Field>
          <button className="btn small swap" onClick={swapTeams} title="Intercambiar local y visitante">⇄</button>
          <Field label="Visitante" grow={1}>
            <select value={match.awayId || ''} onChange={e => chooseTeam('away', e.target.value)}>
              <option value="">— elegir —</option>
              {state.teams.map(t => <option key={t.id} value={t.id} disabled={t.id === match.homeId}>{t.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="two-col">
        {['home', 'away'].map(side => (
          <SideLineup key={side} side={side} state={state} patchSide={patchSide} />
        ))}
      </div>
    </div>
  );
}

function SideLineup({ side, state, patchSide }) {
  const sd = state.match[side];
  const team = teamById(state, state.match[side === 'home' ? 'homeId' : 'awayId']);

  if (!team) {
    return <div className="card"><h3>{side === 'home' ? 'Local' : 'Visitante'}</h3><p className="hint">Elegí el equipo para armar su alineación.</p></div>;
  }

  const slots = formationSlots(sd.formation);
  const players = [...team.players].sort((a, b) => (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999));
  const used = new Set(sd.xi.filter(Boolean));
  const label = (p) => `${p.number ? `${p.number} · ` : ''}${p.name || displayName(p)} (${p.pos})`;

  const setSlot = (i, id) => {
    const xi = sd.xi.map((x, idx) => (idx === i ? (id || null) : x));
    // Un titular no puede estar a la vez en el banco
    patchSide(side, { xi, bench: sd.bench.filter(b => b !== id) });
  };
  const toggleBench = (id) => patchSide(side, { bench: sd.bench.includes(id) ? sd.bench.filter(b => b !== id) : [...sd.bench, id] });
  const setFormation = (formation) => patchSide(side, { formation });

  return (
    <div className="card">
      <h3 className="side-title"><Crest team={{ logo: team.logo, color: team.color1, short: team.short }} size={30} /> {team.name} <small>({side === 'home' ? 'local' : 'visitante'})</small></h3>
      <div className="row end">
        <Field label="Formación" grow={1}>
          <select value={sd.formation} onChange={e => setFormation(e.target.value)}>{FORMATIONS.map(f => <option key={f}>{f}</option>)}</select>
        </Field>
        <button className="btn small" onClick={() => patchSide(side, autoLineup(team, sd.formation))}>Autocompletar</button>
      </div>

      <div className="slots">
        {slots.map((s, i) => (
          <label key={i} className="slot">
            <span>{s.label}</span>
            <select value={sd.xi[i] || ''} onChange={e => setSlot(i, e.target.value)}>
              <option value="">—</option>
              {players.map(p => <option key={p.id} value={p.id} disabled={used.has(p.id) && sd.xi[i] !== p.id}>{label(p)}</option>)}
            </select>
          </label>
        ))}
      </div>

      <h4>Suplentes <small>({sd.bench.length})</small></h4>
      <div className="bench">
        {players.filter(p => !used.has(p.id)).map(p => (
          <label key={p.id} className={`chip ${sd.bench.includes(p.id) ? 'on' : ''}`}>
            <input type="checkbox" checked={sd.bench.includes(p.id)} onChange={() => toggleBench(p.id)} />
            {label(p)}
          </label>
        ))}
      </div>
    </div>
  );
}
