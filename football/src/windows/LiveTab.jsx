import { useState } from 'react';
import { Field, ConfirmButton } from './ui';
import { Crest } from '../graphics/common';
import { useNow } from '../useNow';
import {
  PERIODS, EVENT_KINDS, uid, clockSeconds, clockText, matchMinute, teamOfSide, teamInfo, playerById, displayName
} from '../state';

// Control en vivo: marcador, reloj, qué gráficas están al aire y eventos del partido.
export default function LiveTab({ state, update }) {
  const now = useNow(250);
  const { match, live } = state;
  const clock = match.clock;
  const home = teamInfo(teamOfSide(state, 'home'), 'Local', 'LOC', '#c8102e');
  const away = teamInfo(teamOfSide(state, 'away'), 'Visitante', 'VIS', '#0b5ed7');

  const patchMatch = (patch) => update(s => ({ ...s, match: { ...s.match, ...patch } }));
  const patchLive = (patch) => update(s => ({ ...s, live: { ...s.live, ...patch } }));

  // ---------- Marcador ----------
  const addScore = (side, delta) => patchMatch({ score: { ...match.score, [side]: Math.max(0, match.score[side] + delta) } });

  // ---------- Reloj ----------
  const patchClock = (patch) => patchMatch({ clock: { ...clock, ...patch } });
  // Iniciar en la previa arranca el 1T y en el entretiempo el 2T
  const startClock = () => {
    if (clock.running) return;
    const next = clock.period === 'PRE' ? PERIODS.find(p => p.id === '1T') : clock.period === 'ET' ? PERIODS.find(p => p.id === '2T') : null;
    patchClock({ running: true, startedAt: Date.now(), ...(next ? { period: next.id, base: next.start, added: 0 } : {}) });
  };
  const pauseClock = () => { if (clock.running) patchClock({ running: false, base: clockSeconds(clock), startedAt: null }); };
  const setPeriod = (p) => patchClock({ period: p.id, base: p.start, running: false, startedAt: null, added: 0 });
  const nudge = (seconds) => patchClock({ base: Math.max(0, clockSeconds(clock) + seconds), startedAt: clock.running ? Date.now() : null });
  const [minuteInput, setMinuteInput] = useState('');
  const applyMinute = () => {
    const m = parseInt(minuteInput, 10);
    if (Number.isNaN(m) || m < 0) return;
    patchClock({ base: m * 60, startedAt: clock.running ? Date.now() : null });
    setMinuteInput('');
  };

  // ---------- Gráficas al aire ----------
  const toggleScorebug = () => patchLive({ scorebug: !live.scorebug });
  const toggleIntro = () => patchLive({ intro: !live.intro, lineup: { ...live.lineup, visible: false } });
  const toggleLineup = (side) => {
    const same = live.lineup.visible && live.lineup.side === side;
    patchLive({ lineup: { side, visible: !same }, intro: false });
  };
  // Logos: liga, productora o ambos. Pulsar el que ya está al aire lo saca.
  const toggleBranding = (mode) => {
    const same = live.branding.visible && live.branding.mode === mode;
    patchLive({ branding: { mode, visible: !same } });
  };
  const hideAll = () => patchLive({ scorebug: false, intro: false, branding: { ...live.branding, visible: false }, lineup: { ...live.lineup, visible: false }, alert: live.alert ? { ...live.alert, shownAt: 0 } : null });

  // ---------- Eventos ----------
  const [draft, setDraft] = useState({ kind: 'goal', side: 'home', playerId: '', outId: '', minute: '', ownGoal: false, duration: 7 });
  const patchDraft = (patch) => setDraft(d => ({ ...d, ...patch }));
  const draftTeam = teamOfSide(state, draft.side);
  const sd = match[draft.side];
  const roster = draftTeam ? [...draftTeam.players].sort((a, b) => (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999)) : [];
  const onField = roster.filter(p => sd.xi.includes(p.id));
  const optionLabel = (p) => `${p.number ? `${p.number} · ` : ''}${p.name || displayName(p)}`;
  const needsOut = draft.kind === 'sub';
  const canTrigger = !!draft.playerId && (!needsOut || !!draft.outId);
  const autoMinute = matchMinute(clock, now);

  const showAlert = (event) => update(s => ({ ...s, live: { ...s.live, alert: { ...event, shownAt: Date.now(), duration: draft.duration } } }));

  const triggerEvent = () => {
    const event = {
      id: uid(), kind: draft.kind, side: draft.side, playerId: draft.playerId, outId: needsOut ? draft.outId : null,
      minute: draft.minute.trim() || autoMinute, ownGoal: draft.kind === 'goal' && draft.ownGoal
    };
    update(s => {
      let score = s.match.score;
      if (event.kind === 'goal') {
        const scoring = event.ownGoal ? (event.side === 'home' ? 'away' : 'home') : event.side;
        score = { ...score, [scoring]: score[scoring] + 1 };
      }
      // Un cambio también actualiza la alineación: entra al puesto del que sale y el que sale pasa al banco
      let sideData = s.match[event.side];
      if (event.kind === 'sub') {
        sideData = { ...sideData, xi: sideData.xi.map(id => (id === event.outId ? event.playerId : id)), bench: [...sideData.bench.filter(id => id !== event.playerId), event.outId] };
      }
      return {
        ...s,
        match: { ...s.match, score, [event.side]: sideData, events: [...s.match.events, event] },
        live: { ...s.live, alert: { ...event, shownAt: Date.now(), duration: draft.duration } }
      };
    });
    patchDraft({ playerId: '', outId: '', minute: '', ownGoal: false });
  };

  const removeEvent = (event) => update(s => {
    let score = s.match.score;
    if (event.kind === 'goal') {
      const scoring = event.ownGoal ? (event.side === 'home' ? 'away' : 'home') : event.side;
      score = { ...score, [scoring]: Math.max(0, score[scoring] - 1) };
    }
    return { ...s, match: { ...s.match, score, events: s.match.events.filter(e => e.id !== event.id) } };
  });

  const eventLine = (e) => {
    const team = teamOfSide(state, e.side);
    const p = playerById(team, e.playerId);
    const out = playerById(team, e.outId);
    const kind = EVENT_KINDS.find(k => k.id === e.kind)?.label;
    const who = e.kind === 'sub' ? `${displayName(p)} por ${displayName(out)}` : displayName(p);
    return `${e.minute}' ${kind}${e.ownGoal ? ' (en contra)' : ''} · ${(team?.short || '').toUpperCase()} · ${who}`;
  };

  const periodNow = PERIODS.find(p => p.id === clock.period);

  return (
    <div className="stack">
      <div className="card">
        <h3>Marcador</h3>
        <div className="scoreboard">
          {[['home', home], ['away', away]].map(([side, info]) => (
            <div className="score-side" key={side}>
              <Crest team={info} size={46} />
              <div className="score-name">{info.name}</div>
              <div className="score-ctl">
                <button className="btn small" onClick={() => addScore(side, -1)}>−</button>
                <span className="score-num">{match.score[side]}</span>
                <button className="btn small primary" onClick={() => addScore(side, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Reloj <small>{periodNow?.label}</small></h3>
        <div className="clock-row">
          <div className="clock-display">{clockText({ ...clock, period: ['PRE', 'ET', 'FIN'].includes(clock.period) ? '1T' : clock.period }, 'mmss', now)}</div>
          <button className="btn primary" onClick={startClock} disabled={clock.running}>▶ Iniciar</button>
          <button className="btn" onClick={pauseClock} disabled={!clock.running}>❚❚ Pausar</button>
          <button className="btn small" onClick={() => nudge(-1)}>−1s</button>
          <button className="btn small" onClick={() => nudge(1)}>+1s</button>
          <button className="btn small" onClick={() => nudge(60)}>+1min</button>
        </div>
        <div className="row end">
          <div className="seg">
            {PERIODS.map(p => <button key={p.id} className={`btn small ${clock.period === p.id ? 'primary' : ''}`} onClick={() => setPeriod(p)}>{p.label}</button>)}
          </div>
        </div>
        <div className="row end">
          <Field label="Ir al minuto">
            <div className="inline">
              <input type="number" min="0" value={minuteInput} placeholder="Ej: 46" onChange={e => setMinuteInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyMinute()} style={{ width: 90 }} />
              <button className="btn small" onClick={applyMinute}>Aplicar</button>
            </div>
          </Field>
          <Field label="Tiempo agregado">
            <div className="inline">
              <button className="btn small" onClick={() => patchClock({ added: Math.max(0, clock.added - 1) })}>−</button>
              <strong style={{ minWidth: 26, textAlign: 'center' }}>{clock.added}</strong>
              <button className="btn small" onClick={() => patchClock({ added: clock.added + 1 })}>+</button>
            </div>
          </Field>
        </div>
      </div>

      <div className="card">
        <h3>Gráficas al aire</h3>
        <div className="toggles">
          <button className={`toggle ${live.scorebug ? 'on' : ''}`} onClick={toggleScorebug}>Marcador</button>
          <button className={`toggle ${live.lineup.visible && live.lineup.side === 'home' ? 'on' : ''}`} onClick={() => toggleLineup('home')}>Alineación local</button>
          <button className={`toggle ${live.lineup.visible && live.lineup.side === 'away' ? 'on' : ''}`} onClick={() => toggleLineup('away')}>Alineación visitante</button>
          <button className={`toggle ${live.intro ? 'on' : ''}`} onClick={toggleIntro}>Presentación</button>
          <button className="toggle off" onClick={hideAll}>Sacar todo</button>
        </div>
        <h3 style={{ marginTop: 16 }}>Logos en pantalla</h3>
        <div className="toggles">
          <button className={`toggle ${live.branding.visible && live.branding.mode === 'league' ? 'on' : ''}`} onClick={() => toggleBranding('league')}>Logo de la liga</button>
          <button className={`toggle ${live.branding.visible && live.branding.mode === 'producer' ? 'on' : ''}`} onClick={() => toggleBranding('producer')}>Logo de la productora</button>
          <button className={`toggle ${live.branding.visible && live.branding.mode === 'both' ? 'on' : ''}`} onClick={() => toggleBranding('both')}>Ambos logos</button>
        </div>
      </div>

      <div className="card">
        <h3>Eventos del partido</h3>
        <div className="seg">
          {EVENT_KINDS.map(k => <button key={k.id} className={`btn small ${draft.kind === k.id ? 'primary' : ''}`} onClick={() => patchDraft({ kind: k.id, playerId: '', outId: '' })}>{k.label}</button>)}
        </div>
        <div className="row">
          <Field label="Equipo">
            <select value={draft.side} onChange={e => patchDraft({ side: e.target.value, playerId: '', outId: '' })}>
              <option value="home">{home.name}</option>
              <option value="away">{away.name}</option>
            </select>
          </Field>
          <Field label={needsOut ? 'Entra' : 'Jugador'} grow={2}>
            <select value={draft.playerId} onChange={e => patchDraft({ playerId: e.target.value })}>
              <option value="">— elegir —</option>
              {(needsOut ? roster.filter(p => !sd.xi.includes(p.id)) : roster).map(p => <option key={p.id} value={p.id}>{optionLabel(p)}</option>)}
            </select>
          </Field>
          {needsOut && (
            <Field label="Sale" grow={2}>
              <select value={draft.outId} onChange={e => patchDraft({ outId: e.target.value })}>
                <option value="">— elegir —</option>
                {onField.map(p => <option key={p.id} value={p.id}>{optionLabel(p)}</option>)}
              </select>
            </Field>
          )}
        </div>
        <div className="row end">
          <Field label="Minuto"><input value={draft.minute} placeholder={`auto: ${autoMinute}`} onChange={e => patchDraft({ minute: e.target.value })} style={{ width: 110 }} /></Field>
          <Field label="Segundos en pantalla"><input type="number" min="2" max="30" value={draft.duration} onChange={e => patchDraft({ duration: Math.max(2, Number(e.target.value) || 7) })} style={{ width: 90 }} /></Field>
          {draft.kind === 'goal' && <label className="check"><input type="checkbox" checked={draft.ownGoal} onChange={e => patchDraft({ ownGoal: e.target.checked })} /> En contra</label>}
          <button className="btn primary" onClick={triggerEvent} disabled={!canTrigger}>Registrar y mostrar</button>
        </div>
        <p className="hint">El gol suma al marcador y el cambio actualiza la alineación automáticamente. Quitar un gol del registro lo resta del marcador.</p>

        <div className="events">
          {[...match.events].reverse().map(e => (
            <div className="event-row" key={e.id}>
              <span>{eventLine(e)}</span>
              <span className="inline">
                <button className="btn small" onClick={() => showAlert(e)}>Mostrar</button>
                <ConfirmButton className="btn small ghost" onConfirm={() => removeEvent(e)}>✕</ConfirmButton>
              </span>
            </div>
          ))}
          {!match.events.length && <div className="hint">Sin eventos todavía.</div>}
        </div>
      </div>
    </div>
  );
}
