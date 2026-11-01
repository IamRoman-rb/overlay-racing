import { Graphic } from './common';
import { useNow } from '../useNow';
import Scorebug from './Scorebug';
import Lineup from './Lineup';
import MatchIntro from './MatchIntro';
import EventAlert from './EventAlert';
import Branding from './Branding';
import { getLeague, applyLook } from '../leagues';
import { teamOfSide, teamInfo, playerById, clockText, CANVAS, DEFAULT_LAYOUT } from '../state';

// Lienzo de 1920x1080 con todas las gráficas. Lo usan el overlay (en vivo) y la vista previa del panel.
// Cada gráfica es independiente: tiene su propia posición, tamaño, transición, tapado con logo y estilo (state.layout / state.look).
// `live` permite forzar qué se ve (la vista previa muestra una gráfica aunque no esté al aire).
// `instant` saca las transiciones y el tapado (PERSONALIZAR mide cada gráfica ya asentada); `instantExcept` deja una con transición
// para probarla.
export default function Stage({ state, live = state.live, instant, instantExcept }) {
  const now = useNow(250);
  const { match } = state;
  const league = getLeague(match.league);
  const themeOf = (id) => applyLook(league, state.look?.[id]);
  const placeOf = (id) => ({ ...DEFAULT_LAYOUT[id], ...(state.layout?.[id] || {}) });
  const isInstant = (id) => !!instant && id !== instantExcept;

  const homeTeam = teamOfSide(state, 'home');
  const awayTeam = teamOfSide(state, 'away');
  const home = teamInfo(homeTeam, 'Local', 'LOC', '#c8102e');
  const away = teamInfo(awayTeam, 'Visitante', 'VIS', '#0b5ed7');
  const comp = { name: match.competition || league.name, round: match.round, logo: match.competitionLogo, tag: league.tag };
  const producerLogo = state.brand?.producerLogo || null;

  // Logos con los que se tapa cada gráfica al aparecer
  const coverLogos = (id) => {
    const cover = placeOf(id).cover;
    return [cover === 'league' || cover === 'both' ? comp.logo : null, cover === 'producer' || cover === 'both' ? producerLogo : null].filter(Boolean);
  };
  // Estilo propio de la gráfica (t) y lo que necesita <Graphic> para ubicarla, animarla y taparla con logo (props)
  const setup = (id, visible, radiusKey) => {
    const t = themeOf(id);
    return {
      t,
      props: {
        id, pos: placeOf(id), visible, instant: isInstant(id), radius: t[radiusKey], logos: coverLogos(id), color: t.accent,
        edits: state.edits?.[id], textSizes: state.textSizes?.[id]
      }
    };
  };

  const bugTheme = themeOf('scorebug');
  const bug = {
    home, away, hs: match.score.home, as: match.score.away,
    clock: clockText(match.clock, bugTheme.clock, now), added: match.clock.added, comp
  };

  // Un evento está al aire entre que se mostró y se cumple su duración
  const alert = live.alert;
  const alertVisible = !!alert && now < alert.shownAt + alert.duration * 1000;
  const alertSide = alert?.side === 'away' ? 'away' : 'home';
  const alertTeam = alertSide === 'away' ? awayTeam : homeTeam;

  const lineupSide = live.lineup.side === 'away' ? 'away' : 'home';
  const lineupTeam = lineupSide === 'away' ? awayTeam : homeTeam;

  const gIntro = setup('intro', !!live.intro, 'panelRadius');
  const gLineup = setup('lineup', !!live.lineup.visible, 'panelRadius');
  const gBug = setup('scorebug', !!live.scorebug, 'barRadius');
  const gAlert = setup('alert', alertVisible, 'panelRadius');
  const gBrand = setup('branding', !!live.branding?.visible, 'panelRadius');

  return (
    <div style={{ width: CANVAS.width, height: CANVAS.height, position: 'relative', overflow: 'hidden', fontFamily: league.font }}>
      <Graphic {...gIntro.props}>
        <MatchIntro home={home} away={away} match={match} comp={comp} theme={gIntro.t} />
      </Graphic>
      <Graphic {...gLineup.props}>
        <Lineup info={lineupSide === 'away' ? away : home} roster={lineupTeam} sideData={match[lineupSide]} theme={gLineup.t} comp={comp} />
      </Graphic>
      <Graphic {...gBrand.props}>
        <Branding mode={live.branding?.mode || 'both'} comp={comp} producerLogo={producerLogo} theme={gBrand.t} />
      </Graphic>
      <Graphic {...gBug.props}>
        <Scorebug bug={bug} theme={gBug.t} />
      </Graphic>
      <Graphic {...gAlert.props}>
        {alert && (
          <EventAlert
            alert={alert} theme={gAlert.t} info={alertSide === 'away' ? away : home}
            player={playerById(alertTeam, alert.playerId)} outPlayer={playerById(alertTeam, alert.outId)}
            score={match.score}
          />
        )}
      </Graphic>
    </div>
  );
}
