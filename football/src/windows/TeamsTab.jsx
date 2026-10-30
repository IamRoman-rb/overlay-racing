import { useRef, useState } from 'react';
import { Field, ImagePicker, ConfirmButton } from './ui';
import { Crest } from '../graphics/common';
import { POSITIONS, emptyPlayer, emptyTeam, parseRoster, uid, emptySide } from '../state';
import { sampleData } from '../sampleData';
import { downloadJSON } from '../utils/images';

// Biblioteca de equipos cargados a mano: datos generales, escudo, DT, cuerpo técnico y plantel.
export default function TeamsTab({ state, update }) {
  const [selectedId, setSelectedId] = useState(null);
  const [bulk, setBulk] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const importInput = useRef(null);

  const team = state.teams.find(t => t.id === selectedId) || state.teams[0] || null;

  const patchTeam = (patch) => update(s => ({ ...s, teams: s.teams.map(t => (t.id === team.id ? { ...t, ...patch } : t)) }));
  const patchPlayer = (id, patch) => patchTeam({ players: team.players.map(p => (p.id === id ? { ...p, ...patch } : p)) });
  const setCaptain = (id) => patchTeam({ players: team.players.map(p => ({ ...p, captain: p.id === id ? !p.captain : false })) });
  const patchStaff = (id, patch) => patchTeam({ staff: team.staff.map(m => (m.id === id ? { ...m, ...patch } : m)) });

  const addTeam = () => {
    const created = emptyTeam();
    update(s => ({ ...s, teams: [...s.teams, created] }));
    setSelectedId(created.id);
  };

  const removeTeam = () => update(s => {
    const clear = (side, key) => (s.match[key] === team.id ? { [key]: null, [side]: emptySide() } : {});
    return { ...s, teams: s.teams.filter(t => t.id !== team.id), match: { ...s.match, ...clear('home', 'homeId'), ...clear('away', 'awayId') } };
  });

  const loadSample = () => {
    const sample = sampleData();
    update(s => ({ ...s, teams: [...s.teams, ...sample.teams], match: { ...s.match, ...sample.matchPatch } }));
    setSelectedId(sample.teams[0].id);
  };

  const addBulk = () => {
    const players = parseRoster(bulk);
    if (!players.length) return;
    patchTeam({ players: [...team.players, ...players] });
    setBulk('');
  };

  const exportTeam = () => downloadJSON(`${(team.short || 'equipo').toLowerCase()}.json`, team);

  const importTeams = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const list = (Array.isArray(parsed) ? parsed : [parsed]).filter(t => t && typeof t === 'object' && Array.isArray(t.players));
      if (!list.length) throw new Error('El archivo no tiene equipos');
      // Ids nuevos: así importar dos veces el mismo archivo no pisa nada
      const fresh = list.map(t => ({
        ...emptyTeam(), ...t, id: uid(),
        players: t.players.map(p => ({ ...emptyPlayer(), ...p, id: uid() })),
        staff: (t.staff || []).map(m => ({ ...m, id: uid() }))
      }));
      update(s => ({ ...s, teams: [...s.teams, ...fresh] }));
      setSelectedId(fresh[0].id);
      setImportMsg(`Se importaron ${fresh.length} equipo(s).`);
    } catch (err) { setImportMsg(`No se pudo importar: ${err.message}`); }
  };

  return (
    <div className="split">
      <aside className="list-col">
        <button className="btn primary" onClick={addTeam}>+ Nuevo equipo</button>
        <button className="btn" onClick={() => importInput.current.click()}>Importar equipo (.json)</button>
        <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={importTeams} />
        {importMsg && <div className="hint">{importMsg}</div>}
        {state.teams.map(t => (
          <button key={t.id} className={`team-item ${team && t.id === team.id ? 'active' : ''}`} onClick={() => setSelectedId(t.id)}>
            <Crest team={{ logo: t.logo, color: t.color1, short: t.short }} size={34} />
            <span>{t.name}<small>{t.players.length} jugadores</small></span>
          </button>
        ))}
        {!state.teams.length && (
          <div className="empty">
            <p>Todavía no cargaste equipos.</p>
            <button className="btn" onClick={loadSample}>Cargar equipos de ejemplo</button>
          </div>
        )}
      </aside>

      {team ? (
        <section className="editor">
          <div className="card">
            <h3>Datos del equipo</h3>
            <div className="row">
              <Field label="Nombre" grow={3}><input value={team.name} onChange={e => patchTeam({ name: e.target.value })} /></Field>
              <Field label="Sigla (3 letras)" grow={1}><input value={team.short} maxLength={4} onChange={e => patchTeam({ short: e.target.value.toUpperCase() })} /></Field>
            </div>
            <div className="row">
              <Field label="Color principal"><input type="color" value={team.color1} onChange={e => patchTeam({ color1: e.target.value })} /></Field>
              <Field label="Color secundario"><input type="color" value={team.color2} onChange={e => patchTeam({ color2: e.target.value })} /></Field>
              <Field label="Estadio" grow={3}><input value={team.stadium} onChange={e => patchTeam({ stadium: e.target.value })} /></Field>
            </div>
            <div className="row">
              <Field label="Escudo"><ImagePicker value={team.logo} onChange={logo => patchTeam({ logo })} label="escudo" /></Field>
            </div>
            <div className="row end">
              <button className="btn small" onClick={exportTeam}>Exportar equipo (.json)</button>
              <ConfirmButton onConfirm={removeTeam}>Eliminar equipo</ConfirmButton>
            </div>
          </div>

          <div className="card">
            <h3>Cuerpo técnico</h3>
            <div className="row">
              <Field label="Director técnico" grow={3}>
                <input value={team.coach.name} onChange={e => patchTeam({ coach: { ...team.coach, name: e.target.value } })} />
              </Field>
              <Field label="Foto del DT"><ImagePicker value={team.coach.photo} onChange={photo => patchTeam({ coach: { ...team.coach, photo } })} label="foto" round /></Field>
            </div>
            {team.staff.map(m => (
              <div className="row" key={m.id}>
                <Field label="Cargo" grow={2}><input value={m.role} placeholder="Ayudante de campo" onChange={e => patchStaff(m.id, { role: e.target.value })} /></Field>
                <Field label="Nombre" grow={3}><input value={m.name} onChange={e => patchStaff(m.id, { name: e.target.value })} /></Field>
                <button className="btn small ghost" onClick={() => patchTeam({ staff: team.staff.filter(x => x.id !== m.id) })}>✕</button>
              </div>
            ))}
            <button className="btn small" onClick={() => patchTeam({ staff: [...team.staff, { id: uid(), role: '', name: '' }] })}>+ Agregar integrante</button>
          </div>

          <div className="card">
            <h3>Plantel <small>({team.players.length})</small></h3>
            <div className="players">
              <div className="players-head"><span>Foto</span><span>N°</span><span>Nombre completo</span><span>Apodo (en pantalla)</span><span>Pos.</span><span title="Capitán">C</span><span /></div>
              {team.players.map(p => (
                <div className="player-row" key={p.id}>
                  <ImagePicker value={p.photo} onChange={photo => patchPlayer(p.id, { photo })} label="foto" round max={256} compact />
                  <input value={p.number} maxLength={3} onChange={e => patchPlayer(p.id, { number: e.target.value.replace(/\D/g, '') })} />
                  <input value={p.name} onChange={e => patchPlayer(p.id, { name: e.target.value })} />
                  <input value={p.nick} placeholder="opcional" onChange={e => patchPlayer(p.id, { nick: e.target.value })} />
                  <select value={p.pos} onChange={e => patchPlayer(p.id, { pos: e.target.value })}>{POSITIONS.map(x => <option key={x}>{x}</option>)}</select>
                  <input type="checkbox" checked={!!p.captain} onChange={() => setCaptain(p.id)} />
                  <button className="btn small ghost" onClick={() => patchTeam({ players: team.players.filter(x => x.id !== p.id) })}>✕</button>
                </div>
              ))}
            </div>
            <button className="btn small" onClick={() => patchTeam({ players: [...team.players, emptyPlayer()] })}>+ Agregar jugador</button>

            <details className="bulk">
              <summary>Pegar plantel completo</summary>
              <p className="hint">Un jugador por línea: número, nombre y posición (POR, DEF, MED o DEL). Ejemplo: <code>10 Lionel Pérez DEL</code></p>
              <textarea rows={6} value={bulk} onChange={e => setBulk(e.target.value)} placeholder={'1 Matías Ledesma POR\n4 Lucas Ferrero DEF\n10 Joaquín Almada MED'} />
              <button className="btn small primary" onClick={addBulk} disabled={!bulk.trim()}>Agregar jugadores</button>
            </details>
          </div>
        </section>
      ) : <section className="editor"><div className="empty big">Creá un equipo para empezar a cargar su plantel.</div></section>}
    </div>
  );
}
