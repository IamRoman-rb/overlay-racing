import { Anim, Place } from './common';
import { useNow } from '../useNow';
import Scorebug from './Scorebug';
import Lineup from './Lineup';
import MatchIntro from './MatchIntro';
import EventAlert from './EventAlert';
import { getLeague, applyStyle } from '../leagues';
import { teamOfSide, teamInfo, playerById, clockText, CANVAS, DEFAULT_LAYOUT } from '../state';

// Lienzo de 1920x1080 con todas las gráficas. Lo usan el overlay (en vivo) y la vista previa del panel.
// `live` permite forzar qué se ve (la vista previa muestra una gráfica aunque no esté al aire).
// `instant` saca las transiciones de entrada y salida (PERSONALIZAR mide cada gráfica ya asentada).
export default function Stage({ state, live = state.live, instant }) {
  const now = useNow(250);
  const { match } = state;
  const t = applyStyle(getLeague(match.league), state.style);
  const place = (id) => ({ ...DEFAULT_LAYOUT[id], ...(state.layout?.[id] || {}) });

  const homeTeam = teamOfSide(state, 'home');
  const awayTeam = teamOfSide(state, 'away');
  const home = teamInfo(homeTeam, 'Local', 'LOC', '#c8102e');
  const away = teamInfo(awayTeam, 'Visitante', 'VIS', '#0b5ed7');
  const comp = { name: match.competition || t.name, round: match.round, logo: match.competitionLogo, tag: t.tag };

  const bug = {
    home, away, hs: match.score.home, as: match.score.away,
    clock: clockText(match.clock, t.clock, now), added: match.clock.added, comp
  };

  // Un evento está al aire entre que se mostró y se cumple su duración
  const alert = live.alert;
  const alertVisible = !!alert && now < alert.shownAt + alert.duration * 1000;
  const alertSide = alert?.side === 'away' ? 'away' : 'home';
  const alertTeam = alertSide === 'away' ? awayTeam : homeTeam;

  const lineupSide = live.lineup.side === 'away' ? 'away' : 'home';
  const lineupTeam = lineupSide === 'away' ? awayTeam : homeTeam;

  return (
    <div style={{ width: CANVAS.width, height: CANVAS.height, position: 'relative', overflow: 'hidden', fontFamily: t.font }}>
      <Anim visible={!!live.intro} kind="scale" instant={instant}>
        <Place id="intro" pos={place('intro')}>
          <MatchIntro home={home} away={away} match={match} comp={comp} theme={t} />
        </Place>
      </Anim>
      <Anim visible={!!live.lineup.visible} kind="left" instant={instant}>
        <Place id="lineup" pos={place('lineup')}>
          <Lineup info={lineupSide === 'away' ? away : home} roster={lineupTeam} sideData={match[lineupSide]} theme={t} comp={comp} />
        </Place>
      </Anim>
      <Anim visible={!!live.scorebug} kind="left" instant={instant}>
        <Place id="scorebug" pos={place('scorebug')}>
          <Scorebug bug={bug} theme={t} />
        </Place>
      </Anim>
      <Anim visible={alertVisible} kind="up" instant={instant}>
        {alert && (
          <Place id="alert" pos={place('alert')}>
            <EventAlert
              alert={alert} theme={t} info={alertSide === 'away' ? away : home}
              player={playerById(alertTeam, alert.playerId)} outPlayer={playerById(alertTeam, alert.outId)}
              score={match.score}
            />
          </Place>
        )}
      </Anim>
    </div>
  );
}
