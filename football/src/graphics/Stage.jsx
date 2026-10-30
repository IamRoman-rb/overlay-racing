import { Anim } from './common';
import { useNow } from '../useNow';
import Scorebug from './Scorebug';
import Lineup from './Lineup';
import MatchIntro from './MatchIntro';
import EventAlert from './EventAlert';
import { getLeague } from '../leagues';
import { teamOfSide, teamInfo, playerById, clockText, CANVAS } from '../state';

// Lienzo de 1920x1080 con todas las gráficas. Lo usan el overlay (en vivo) y la vista previa del panel.
// `live` permite forzar qué se ve (la vista previa muestra una gráfica aunque no esté al aire).
export default function Stage({ state, live = state.live }) {
  const now = useNow(250);
  const { match } = state;
  const t = getLeague(match.league);

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
      <Anim visible={!!live.intro} kind="scale">
        <MatchIntro home={home} away={away} match={match} comp={comp} theme={t} />
      </Anim>
      <Anim visible={!!live.lineup.visible} kind="left">
        <Lineup info={lineupSide === 'away' ? away : home} roster={lineupTeam} sideData={match[lineupSide]} theme={t} comp={comp} />
      </Anim>
      <Anim visible={!!live.scorebug} kind="left">
        <Scorebug bug={bug} theme={t} />
      </Anim>
      <Anim visible={alertVisible} kind="up">
        {alert && (
          <EventAlert
            alert={alert} theme={t} info={alertSide === 'away' ? away : home}
            player={playerById(alertTeam, alert.playerId)} outPlayer={playerById(alertTeam, alert.outId)}
            score={match.score}
          />
        )}
      </Anim>
    </div>
  );
}
