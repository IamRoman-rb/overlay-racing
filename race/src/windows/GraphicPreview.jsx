import { useMemo } from 'react';
import TimingTower from '../graphics/TimingTower';
import Ticker from '../graphics/Ticker';
import LowerThird from '../graphics/LowerThird';
import Weather from '../graphics/Weather';
import StartingGrid from '../graphics/StartingGrid';
import FinalResults from '../graphics/FinalResults';
import WinnerGraphic from '../graphics/WinnerGraphic';
import Flags from '../graphics/Flags';
import FastestLap from '../graphics/FastestLap';
import DriverInfo from '../graphics/DriverInfo';
import Battle from '../graphics/Battle';
import CustomZocalo from './CustomZocalo';
import VotingQR from '../graphics/VotingQR';
import VotingResults from '../graphics/VotingResults';
import LapCounter from '../graphics/LapCounter';
import VirtualChamp from '../graphics/VirtualChamp';
import PitStopTimer from '../graphics/PitStopTimer';
import StartingLights from '../graphics/StartingLights';
import LapTimeEvolution from '../graphics/LapTimeEvolution';
import TrackAlert from '../graphics/TrackAlert';
import PenaltyAlert from '../graphics/PenaltyAlert';
import Branding from '../graphics/Branding';
import Evento from '../graphics/Evento';
import Sectors from '../graphics/Sectors';
import GapChart from '../graphics/GapChart';
import Gainers from '../graphics/Gainers';
import QualifyingBoard from '../graphics/QualifyingBoard';
import TrackMap from '../graphics/TrackMap';
import RaceNotice from '../graphics/RaceNotice';
import CircuitIntro from '../graphics/CircuitIntro';
import CircuitRecord from '../graphics/CircuitRecord';
import LapCompare from '../graphics/LapCompare';
import WindVectors from '../graphics/WindField';
import SponsorLive from '../graphics/SponsorLive';
import LayoutEdits from '../components/LayoutEdits';
import { formatDriverName } from '../utils/formatDriverName';

// Datos de ejemplo para mostrar la gráfica real en PERSONALIZAR cuando todavía no hay carrera cargada.
const DEMO_DRIVERS = [
  ['101', 'ROBERTO MAIN', '1:15.980'], ['10', 'CARLOS REY', '1:16.042'], ['1', 'PATRICIO LOPEZ', '1:17.074'],
  ['19', 'RUBEN ORTIZ', '1:16.958'], ['7', 'SEBASTIAN MARCELO', '1:18.614'], ['2', 'KEVIN ALCARAZ', '1:18.605'],
  ['6', 'CRISTIAN REVERDITO', '1:18.428'], ['49', 'RICHARD MORIS', '1:20.902'], ['26', 'CARRERA GARMENDIA', '1:17.197'],
  ['42', 'JERONIMO JOSEPH', '1:19.779'], ['175', 'CIOCCI TOMAS', '1:17.233'], ['36', 'RAMIRO BANCHERO', '1:22.857'],
].map((d, i) => ({
  pos: String(i + 1), number: d[0], name: d[1], lastLap: d[2], bestLap: d[2], laps: '6', make: 'Chevrolet',
  diff: i === 0 ? '-' : `+${(i * 1.37).toFixed(3)}`, totalTime: `9:${String(10 + i).padStart(2, '0')}.${String(100 + i * 37).slice(-3)}`,
  nationality: '', sector1: '', sector2: '', sector3: ''
}));

const DEMO_SESSION = { name: 'CATEGORÍA - FINAL', laps: '6', totalTime: '9:12.431' };

const DEMO_HISTORY = (() => {
  const history = {};
  DEMO_DRIVERS.slice(0, 4).forEach((d, i) => {
    history[d.number] = Array.from({ length: 6 }, (_, lap) => ({ lap: lap + 1, seconds: 76 + i * 0.9 + Math.sin(lap + i) * 0.8 }));
  });
  return history;
})();

// Historial de ejemplo para ÚLTIMAS VUELTAS con los dos primeros pilotos de la lista (reales o de ejemplo)
const demoLapCompare = (list) => {
  const history = {};
  (list || []).slice(0, 2).forEach((d, i) => {
    if (!d?.number) return;
    history[String(d.number)] = Array.from({ length: 8 }, (_, lap) => ({ lap: lap + 1, seconds: 76.2 + i * 0.15 + Math.sin(lap * 1.7 + i * 2) * 0.35 }));
  });
  return history;
};

// Datos de ejemplo de lo que calcula el análisis de carrera (sectores, grilla, vuelta en curso) para las gráficas nuevas
const DEMO_SECTOR_COLORS = [['purple', 'green', 'yellow'], ['green', 'yellow', 'purple'], ['yellow', 'green', 'green']];
const DEMO_GAINS = [2, -1, 4, -2, 0, 3, -3, 1, 5, -4, 0, -5];
const enrichDemo = (list, realDrivers) => list.map((d, i) => {
  if (realDrivers) return d;
  const pos = i + 1;
  return {
    ...d,
    sector1: d.sector1 || (24.8 + i * 0.11).toFixed(3), sector2: d.sector2 || (26.1 + i * 0.07).toFixed(3), sector3: d.sector3 || (25.0 + i * 0.09).toFixed(3),
    sectorColors: DEMO_SECTOR_COLORS[i % 3], theoreticalBest: `1:15.${String(820 + i * 41).slice(-3)}`,
    startPos: pos + DEMO_GAINS[i % DEMO_GAINS.length], posGain: DEMO_GAINS[i % DEMO_GAINS.length],
    lapProgress: { since: (i * 7) % 70, lapTime: 76 + i * 0.4 }, onTrack: i % 4 !== 3, onPushLap: i === 2, isFastest: i === 0
  };
});
const DEMO_TRACK_PATH = [
  { x: 20, y: 70 }, { x: 70, y: 72 }, { x: 85, y: 60 }, { x: 80, y: 35 }, { x: 60, y: 25 }, { x: 45, y: 40 },
  { x: 30, y: 30 }, { x: 15, y: 40 }, { x: 12, y: 58 }
];

// Datos de ejemplo del circuito (sólo los que falten) para ver la presentación y el récord en PERSONALIZAR
const demoCircuit = (config) => ({
  trackPath: (config?.trackPath && config.trackPath.length > 2) ? config.trackPath : DEMO_TRACK_PATH,
  trackSectors: (config?.trackSectors && config.trackSectors.length) ? config.trackSectors : [0.22, 0.45, 0.68, 0.84],
  trackCurves: (config?.trackCurves && config.trackCurves.length) ? config.trackCurves : [{ id: 'd1', name: 'C1', x: 70, y: 72 }, { id: 'd2', name: 'C2', x: 82, y: 50 }, { id: 'd3', name: 'C3', x: 45, y: 40 }],
  circuitName: config?.circuitName || config?.circuito || 'AUTÓDROMO DE EJEMPLO',
  circuitCity: config?.circuitCity || 'CIUDAD, PROVINCIA',
  circuitLength: config?.circuitLength || '3250',
  recordTime: config?.recordTime || '1:28.415', recordSpeed: config?.recordSpeed || '214',
  recordDate: config?.recordDate || '14 SEP 2025', recordEvent: config?.recordEvent || 'FINAL',
  recordDriver: config?.recordDriver || 'NOMBRE APELLIDO', recordNumber: config?.recordNumber || '7', recordTeam: config?.recordTeam || 'EQUIPO',
  eventTitle: config?.eventTitle || config?.campeonato || 'CAMPEONATO - FECHA 1',
  weatherData: config?.weatherData || { temp: 19, weathercode: 0, windSpeed: 7, windDir: 200, humidity: 47, precipProb: 0, place: 'CIUDAD' }
});

const ROLE_BY_ID = { relator: 'Relator', comentarista: 'Comentarista', notero1: 'Notero', notero2: 'Notero', circuito: 'Circuito' };

// Renderiza la gráfica REAL indicada por `id`, siempre visible y con datos reales (si hay) o de ejemplo.
function GraphicPreviewContent({ id, config, positions, drivers, sessionInfo }) {
  const realDrivers = Array.isArray(drivers) && drivers.length > 0;
  const session = sessionInfo && sessionInfo.name ? sessionInfo : (realDrivers ? (sessionInfo || {}) : DEMO_SESSION);
  const eventName = session.name || config?.campeonato || '';

  const fullConfig = useMemo(
    () => ({ ...config, positions: positions || {}, eventName }),
    [config, positions, eventName]
  );
  const list = useMemo(
    () => (realDrivers ? drivers : DEMO_DRIVERS).map(d => ({ ...d, name: formatDriverName(d.name, config?.nameFormat) })),
    [drivers, realDrivers, config?.nameFormat]
  );

  const demoName = config?.[id] || (id === 'circuito' ? 'AUTÓDROMO DE EJEMPLO' : 'NOMBRE DE EJEMPLO');

  switch (id) {
    case 'relator':
    case 'comentarista':
    case 'notero1':
    case 'notero2':
    case 'circuito':
      return <LowerThird id={id} role={ROLE_BY_ID[id]} name={demoName} isVisible config={fullConfig} />;
    case 'clima':
      return <Weather data={config?.weatherData || { temp: 22, weathercode: 2, windSpeed: 14, windDir: 200, precipProb: 20, feelsLike: 21 }} isVisible config={fullConfig} />;
    case 'ticker':
      return <Ticker drivers={enrichDemo(list, realDrivers)} config={fullConfig} isVisible sessionInfo={session} />;
    case 'tower':
      return <TimingTower drivers={enrichDemo(list, realDrivers)} config={fullConfig} isVisible sessionInfo={session} />;
    case 'grid':
      return <StartingGrid drivers={list} config={fullConfig} isVisible />;
    case 'finalResults':
      return <FinalResults drivers={list} config={fullConfig} isVisible sessionInfo={session} />;
    case 'winner':
      return <WinnerGraphic driver={list[1] || list[0]} config={fullConfig} isVisible sessionInfo={session} />;
    case 'flags':
      return <Flags activeFlags={{ checkered: true }} config={fullConfig} />;
    case 'fastestLap':
      return <FastestLap drivers={list} config={fullConfig} isVisible />;
    case 'driverInfo':
      return <DriverInfo driver={list[0]} config={fullConfig} isVisible />;
    case 'battle':
      return <Battle drivers={list} config={fullConfig} isVisible battleFocusPos={2} />;
    case 'customZocalo':
      return <CustomZocalo isVisible title="TÍTULO DEL ZÓCALO" text="Texto de ejemplo del zócalo libre" config={fullConfig} />;
    case 'votingQR':
      return <VotingQR isVisible config={fullConfig} localIp="http://192.168.1.10:8080/vote" />;
    case 'votingResults':
      return <VotingResults isVisible drivers={list} votes={{ [list[0]?.number]: 12, [list[1]?.number]: 8, [list[2]?.number]: 5, [list[3]?.number]: 3 }} config={fullConfig} />;
    case 'lapCounter':
      return <LapCounter isVisible config={fullConfig} sessionInfo={session} />;
    case 'virtualChamp':
      return <VirtualChamp isVisible config={fullConfig} />;
    case 'pitStop':
      return <PitStopTimer isVisible config={fullConfig} pitState={{ isVisible: true, isRunning: false, startTime: null, stoppedTime: 2870, driver: { number: list[0]?.number, name: list[0]?.name } }} />;
    case 'startingLights':
      return <StartingLights isVisible step={3} config={fullConfig} />;
    case 'lapTimesHistory':
      return <LapTimeEvolution history={DEMO_HISTORY} drivers={list} config={fullConfig} isVisible focusDriver={null} />;
    case 'trackAlert':
      return <TrackAlert alert={{ isVisible: true, type: 'yellow', curveName: config?.trackCurves?.[0]?.name || 'CURVA 1', curveId: config?.trackCurves?.[0]?.id || null }} config={fullConfig} />;
    case 'penaltyAlert':
      return <PenaltyAlert alert={{ isVisible: true, driverNumber: list[1]?.number, driverName: list[1]?.name, type: 'penalty', reason: 'Exceso de velocidad en boxes' }} config={fullConfig} />;
    case 'branding':
      return <Branding isVisible config={fullConfig} />;
    case 'sectors':
      return <Sectors drivers={enrichDemo(list, realDrivers)} config={fullConfig} state={{ isVisible: true, numbers: [list[0]?.number, list[1]?.number].filter(Boolean) }} sessionInfo={{ ...session, idealLap: session.idealLap || '1:15.690' }} />;
    case 'gapChart': {
      const series = [1.9, 1.6, 1.45, 1.2, 0.95, 0.8, 0.6].map((gap, i) => ({ lap: i + 1, gap }));
      return <GapChart config={fullConfig} data={{ isVisible: true, front: list[0]?.number, back: list[1]?.number, frontName: list[0]?.name, backName: list[1]?.name, frontPos: '1', backPos: '2', series, rate: -0.21, current: 0.6, lapsToCatch: 3 }} />;
    }
    case 'gainers':
      return <Gainers drivers={enrichDemo(list, realDrivers)} config={fullConfig} isVisible />;
    case 'qualifying':
      return <QualifyingBoard drivers={enrichDemo(list, realDrivers)} config={{ ...fullConfig, qualiCutoff: config?.qualiCutoff || 10 }} isVisible sessionInfo={session} />;
    case 'trackMap':
      return <TrackMap drivers={enrichDemo(list, realDrivers)} config={{ ...fullConfig, trackPath: (config?.trackPath && config.trackPath.length > 1) ? config.trackPath : DEMO_TRACK_PATH }} isVisible sessionInfo={session} />;
    case 'raceNotice':
      return <RaceNotice config={fullConfig} notice={{ isVisible: true, kind: 'leader', title: 'NUEVO LÍDER', text: list[1]?.name || 'NOMBRE DE EJEMPLO', number: list[1]?.number }} />;
    case 'circuitIntro':
      return <CircuitIntro config={{ ...fullConfig, ...demoCircuit(config) }} isVisible />;
    case 'circuitRecord':
      return <CircuitRecord config={{ ...fullConfig, ...demoCircuit(config) }} isVisible />;
    case 'lapCompare':
      return <LapCompare state={{ isVisible: true, a: list[0]?.number, b: list[1]?.number }} drivers={enrichDemo(list, realDrivers)} history={demoLapCompare(list)} config={fullConfig} />;
    case 'windVectors':
      return <WindVectors isVisible config={{ ...fullConfig, weatherData: config?.weatherData || { temp: 22, weathercode: 2, windSpeed: 18, windDir: 240, precipProb: 10, feelsLike: 21 } }} />;
    case 'sponsorLive':
      return <SponsorLive config={fullConfig} state={{ isVisible: true, rotate: true }} />;
    case 'evento':
      return <Evento isVisible config={{ ...fullConfig, productora: config?.productora || '', circuito: config?.circuito || '', weatherData: config?.weatherData || { temp: 22, weathercode: 2, windSpeed: 14, windDir: 200, precipProb: 20, feelsLike: 21 } }} />;
    default:
      return null;
  }
}

// Con los objetos movidos desde la pestaña EDITOR (config.layoutEdits_<id>), igual que en el overlay real.
// El tapado con logo solo se ve al pedir "probar" (coverReplay) y nunca en el editor (noCover).
export default function GraphicPreview(props) {
  return (
    <LayoutEdits id={props.id} config={props.config ? { ...props.config, positions: props.positions || props.config.positions } : props.config} coverReplay={props.coverReplay} noCover={props.noCover} noSponsors={props.noSponsors}>
      <GraphicPreviewContent {...props} />
    </LayoutEdits>
  );
}
