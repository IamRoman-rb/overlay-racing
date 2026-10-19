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

const ROLE_BY_ID = { relator: 'Relator', comentarista: 'Comentarista', notero1: 'Notero', notero2: 'Notero', circuito: 'Circuito' };

// Renderiza la gráfica REAL indicada por `id`, siempre visible y con datos reales (si hay) o de ejemplo.
export default function GraphicPreview({ id, config, positions, drivers, sessionInfo }) {
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
      return <Ticker drivers={list} config={fullConfig} isVisible sessionInfo={session} />;
    case 'tower':
      return <TimingTower drivers={list} config={fullConfig} isVisible sessionInfo={session} />;
    case 'grid':
      return <StartingGrid drivers={list} config={fullConfig} isVisible />;
    case 'finalResults':
      return <FinalResults drivers={list} config={fullConfig} isVisible />;
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
      return <TrackAlert alert={{ isVisible: true, type: 'yellow', curveName: 'CURVA 1', curveId: null }} config={fullConfig} />;
    case 'penaltyAlert':
      return <PenaltyAlert alert={{ isVisible: true, driverNumber: list[1]?.number, driverName: list[1]?.name, type: 'penalty', reason: 'Exceso de velocidad en boxes' }} config={fullConfig} />;
    case 'branding':
      return <Branding isVisible config={fullConfig} />;
    default:
      return null;
  }
}
