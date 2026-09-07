import { useState, useEffect, useMemo } from 'react';
import TimingTower from '../graphics/TimingTower';
import Ticker from '../graphics/Ticker';
import LowerThird from '../graphics/LowerThird';
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

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (e) {
    console.warn("No se pudo cargar ipcRenderer", e);
  }
}

const formatDriverName = (name, format) => {
  if (!name) return '';
  const strName = String(name);
  if (!format || format === 'original') return strName;
  if (format === 'uppercase') return strName.toUpperCase();
  let first = '', last = '';
  if (strName.includes(',')) {
    const parts = strName.split(','); last = parts[0].trim(); first = parts[1].trim();
  } else {
    const parts = strName.trim().split(/\s+/);
    if (parts.length === 1) return format === 'uppercase' ? strName.toUpperCase() : strName;
    first = parts[0]; last = parts.slice(1).join(' ');
  }
  const cleanFirstInitial = first ? first.charAt(0).toUpperCase() : '';
  const cleanLastInitial = last ? last.charAt(0).toUpperCase() : '';
  switch (format) {
    case 'firstInitialLast': return first ? `${cleanFirstInitial}. ${last}` : last;
    case 'firstLastInitial': return last ? `${first} ${cleanLastInitial}.` : first;
    case 'lastOnly': return last || first;
    default: return strName;
  }
};

function buildEventHandlers(setters) {
  const {
    setConfig, setPositions, setLocalIp, setDrivers, setSessionInfo,
    setIsTickerVisible, setIsTowerVisible, setGraphics, setIsGridVisible,
    setIsFinalResultsVisible, setIsWinnerVisible, setWinnerData, setActiveFlags,
    setIsFastestLapVisible, setIsDriverInfoVisible, setDriverInfoData,
    setBattleData, setCustomZocaloData, setIsVotingQRVisible, setIsVotingResultsVisible,
    setVotes, setIsLapCounterVisible, setIsVirtualChampVisible, setPitStopState,
    setStartingLightsState, setIsLapTimesHistoryVisible, setLapTimesHistory,
    setLapTimesFocus
  } = setters;

  return {
    'update-config': (data) => data && setConfig(data),
    'update-positions': (data) => data && setPositions(data),
    'update-ip': (data) => data && setLocalIp(data),
    'update-leaderboard': (data) => {
      if (data && data.drivers) { setDrivers(data.drivers); setSessionInfo(data.session || {}); }
    },
    'set-ticker-visibility': (data) => setIsTickerVisible(!!data),
    'set-tower-visibility': (data) => setIsTowerVisible(!!data),
    'set-graphic-visibility': (data) => {
      if (data) setGraphics(prev => ({ ...prev, [data.id]: data.visible }));
    },
    'set-grid-visibility': (data) => setIsGridVisible(!!data),
    'set-final-results-visibility': (data) => setIsFinalResultsVisible(!!data),
    'set-winner-visibility': (data) => {
      if (data) { setIsWinnerVisible(data.isVisible); if (data.driver) setWinnerData(data.driver); }
    },
    'set-flag-visibility': (data) => data && setActiveFlags(data),
    'set-fastest-lap-visibility': (data) => setIsFastestLapVisible(!!data),
    'set-driver-info-visibility': (data) => {
      if (data) { setIsDriverInfoVisible(data.isVisible); if (data.driver) setDriverInfoData(data.driver); }
    },
    'set-battle-visibility': (data) => data && setBattleData(data),
    'set-custom-zocalo-visibility': (data) => data && setCustomZocaloData(data),
    'set-voting-qr': (data) => setIsVotingQRVisible(!!data),
    'set-voting-results': (data) => setIsVotingResultsVisible(!!data),
    'update-votes': (data) => data && setVotes(data),
    'set-lap-counter-visibility': (data) => setIsLapCounterVisible(!!data),
    'set-virtual-champ': (data) => setIsVirtualChampVisible(!!data),
    'update-pitstop': (data) => data && setPitStopState(data),
    'update-starting-lights': (data) => data && setStartingLightsState(data),
    'set-lap-times-history-visibility': (data) => setIsLapTimesHistoryVisible(!!data),
    'update-lap-times-history': (data) => data && setLapTimesHistory(data),
    'update-lap-times-focus': (data) => setLapTimesFocus(data ?? null),
  };
}

export default function Overlay() {
  const [drivers, setDrivers] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({});
  const [config, setConfig] = useState({});
  const [positions, setPositions] = useState({});
  const [battleData, setBattleData] = useState({ isVisible: false, pos: 1 });
  const [isFinalResultsVisible, setIsFinalResultsVisible] = useState(false);
  const [isWinnerVisible, setIsWinnerVisible] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  const [isTickerVisible, setIsTickerVisible] = useState(false);
  const [isTowerVisible, setIsTowerVisible] = useState(false);
  const [graphics, setGraphics] = useState({});
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [activeFlags, setActiveFlags] = useState({ red: false, tricolor: false, black: false, blue: false });
  const [isFastestLapVisible, setIsFastestLapVisible] = useState(false);
  const [isDriverInfoVisible, setIsDriverInfoVisible] = useState(false);
  const [driverInfoData, setDriverInfoData] = useState(null);
  const [customZocaloData, setCustomZocaloData] = useState({ isVisible: false, title: '', text: '' });
  const [isVotingQRVisible, setIsVotingQRVisible] = useState(false);
  const [isVotingResultsVisible, setIsVotingResultsVisible] = useState(false);
  const [votes, setVotes] = useState({});
  const [localIp, setLocalIp] = useState('localhost');
  const [isHovered, setIsHovered] = useState(false);
  const [isLapCounterVisible, setIsLapCounterVisible] = useState(false);
  const [isVirtualChampVisible, setIsVirtualChampVisible] = useState(false);
  const [pitStopState, setPitStopState] = useState({ isVisible: false, driver: null, startTime: null, stoppedTime: null, isRunning: false });
  const [startingLightsState, setStartingLightsState] = useState({ isVisible: false, step: 0 });
  const [isLapTimesHistoryVisible, setIsLapTimesHistoryVisible] = useState(false); // NUEVO
  const [lapTimesHistory, setLapTimesHistory] = useState({}); // NUEVO
  const [lapTimesFocus, setLapTimesFocus] = useState(null); // NUEVO

  const inBrowserMode = !ipcRenderer;

  useEffect(() => {
    const handlers = buildEventHandlers({
      setConfig, setPositions, setLocalIp, setDrivers, setSessionInfo,
      setIsTickerVisible, setIsTowerVisible, setGraphics, setIsGridVisible,
      setIsFinalResultsVisible, setIsWinnerVisible, setWinnerData, setActiveFlags,
      setIsFastestLapVisible, setIsDriverInfoVisible, setDriverInfoData,
      setBattleData, setCustomZocaloData, setIsVotingQRVisible, setIsVotingResultsVisible,
      setVotes, setIsLapCounterVisible, setIsVirtualChampVisible, setPitStopState,
      setStartingLightsState, setIsLapTimesHistoryVisible, setLapTimesHistory,
  setLapTimesFocus
    });

    if (ipcRenderer) {
      ipcRenderer.invoke('get-initial-state').then((state) => {
        if (!state) return;
        if (state.config) setConfig(state.config);
        if (state.positions) setPositions(state.positions);
        if (state.localIp) setLocalIp(state.localIp);
        if (state.leaderboard) {
          setDrivers(state.leaderboard.drivers || []);
          setSessionInfo(state.leaderboard.session || {});
        }
        if (state.votes) setVotes(state.votes);
        if (state.lapTimesHistory) setLapTimesHistory(state.lapTimesHistory);

        const bs = state.broadcastState || {};
        setIsTickerVisible(!!bs.ticker);
        setIsTowerVisible(!!bs.tower);
        setIsGridVisible(!!bs.grid);
        setIsFinalResultsVisible(!!bs.finalResults);
        setIsFastestLapVisible(!!bs.fastestLap);
        setIsLapCounterVisible(!!bs.lapCounter);
        setIsVotingQRVisible(!!bs.votingQR);
        setIsVotingResultsVisible(!!bs.votingResults);
        setIsVirtualChampVisible(!!bs.virtualChamp);
          setIsLapTimesHistoryVisible(!!bs.lapTimesHistory); // NUEVO
  setLapTimesFocus(bs.lapTimesFocus ?? null); // NUEVO
        if (bs.pitStop) setPitStopState(bs.pitStop);
        if (bs.startingLights) setStartingLightsState(bs.startingLights);
        if (bs.graphics) setGraphics(bs.graphics);
        if (bs.winner) { setIsWinnerVisible(bs.winner.isVisible); if (bs.winner.driver) setWinnerData(bs.winner.driver); }
        if (bs.flags) setActiveFlags(bs.flags);
        if (bs.driverInfo) { setIsDriverInfoVisible(bs.driverInfo.isVisible); if (bs.driverInfo.driver) setDriverInfoData(bs.driverInfo.driver); }
        if (bs.battle) setBattleData(bs.battle);
        if (bs.customZocalo) setCustomZocaloData(bs.customZocalo);
      }).catch(err => console.error("Error cargando estado inicial", err));

      Object.entries(handlers).forEach(([event, handler]) => {
        ipcRenderer.on(event, (_e, data) => handler(data));
      });

      return () => {
        Object.keys(handlers).forEach(event => ipcRenderer.removeAllListeners(event));
      };
    } else {
      let socket;
      import('socket.io-client').then(({ io }) => {
        socket = io('http://127.0.0.1:8080', {
          reconnectionDelay: 1000,
          reconnection: true,
          transports: ['websocket', 'polling'],
        });
        Object.entries(handlers).forEach(([event, handler]) => {
          socket.on(event, handler);
        });
      });

      return () => { if (socket) socket.disconnect(); };
    }
  }, []);

  const safeConfig = config || {};
  const combinedConfig = { ...safeConfig, positions: positions || {} };

  const formattedDrivers = useMemo(() => {
    return drivers.map(d => ({ ...d, name: formatDriverName(d.name, safeConfig.nameFormat) }));
  }, [drivers, safeConfig.nameFormat]);

  const formattedDriverInfoData = useMemo(() => {
    return driverInfoData ? { ...driverInfoData, name: formatDriverName(driverInfoData.name, safeConfig.nameFormat) } : null;
  }, [driverInfoData, safeConfig.nameFormat]);

  const formattedWinnerData = useMemo(() => {
    return winnerData ? { ...winnerData, name: formatDriverName(winnerData.name, safeConfig.nameFormat) } : null;
  }, [winnerData, safeConfig.nameFormat]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100vw', height: '100vh',
        backgroundColor: inBrowserMode ? 'transparent' : (safeConfig.chromaColor || '#00FF00'),
        color: 'white', fontFamily: safeConfig.fontFamily || 'Arial, sans-serif',
        overflow: 'hidden', position: 'relative'
      }}
    >
      <style>
        {`
          html, body, #root { background-color: transparent !important; background: transparent !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          @import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,700;0,900;1,900&family=Montserrat:ital,wght@0,400;0,700;0,900;1,900&family=Oswald:wght@400;700&family=Teko:wght@400;600;700&display=swap');
        `}
      </style>

      {!inBrowserMode && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30px', WebkitAppRegion: 'drag', zIndex: 9999, display: 'flex', justifyContent: 'flex-end', opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <button onClick={() => ipcRenderer.send('overlay-control', 'minimize')} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}>—</button>
          <button onClick={() => ipcRenderer.send('overlay-control', 'maximize')} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}>🗖</button>
          <button onClick={() => ipcRenderer.send('overlay-control', 'close')} style={{ backgroundColor: 'rgba(231, 76, 60, 0.8)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}>✕</button>
        </div>
      )}

      <StartingLights isVisible={startingLightsState?.isVisible} step={startingLightsState?.step} config={combinedConfig} />
      <CustomZocalo isVisible={customZocaloData?.isVisible} title={customZocaloData?.title} text={customZocaloData?.text} config={combinedConfig} />
      <Ticker drivers={formattedDrivers} config={combinedConfig} isVisible={isTickerVisible} sessionInfo={sessionInfo} />
      <TimingTower drivers={formattedDrivers} config={combinedConfig} isVisible={isTowerVisible} sessionInfo={sessionInfo} />
      <Battle drivers={formattedDrivers} config={combinedConfig} isVisible={battleData?.isVisible} battleFocusPos={battleData?.pos} />
      <StartingGrid drivers={formattedDrivers} config={combinedConfig} isVisible={isGridVisible} />
      <FinalResults drivers={formattedDrivers} config={combinedConfig} isVisible={isFinalResultsVisible} />
      <WinnerGraphic driver={formattedWinnerData} config={combinedConfig} isVisible={isWinnerVisible} />
      <Flags activeFlags={activeFlags} config={combinedConfig} />

      <LowerThird id="relator" role="Relator" name={safeConfig.relator} isVisible={graphics?.relator} config={combinedConfig} />
      <LowerThird id="comentarista" role="Comentarista" name={safeConfig.comentarista} isVisible={graphics?.comentarista} config={combinedConfig} />
      <LowerThird id="notero1" role="Notero" name={safeConfig.notero1} isVisible={graphics?.notero1} config={combinedConfig} />
      <LowerThird id="notero2" role="Notero" name={safeConfig.notero2} isVisible={graphics?.notero2} config={combinedConfig} />
      <LowerThird id="circuito" role="Circuito" name={safeConfig.circuito} isVisible={graphics?.circuito} config={combinedConfig} />
      <LowerThird id="clima" role="Clima" name={safeConfig.clima} isVisible={graphics?.clima} config={combinedConfig} />

      <FastestLap drivers={formattedDrivers} config={combinedConfig} isVisible={isFastestLapVisible} />
      <DriverInfo driver={formattedDriverInfoData} config={combinedConfig} isVisible={isDriverInfoVisible} />
      <VotingQR isVisible={isVotingQRVisible} config={combinedConfig} localIp={localIp} />
      <VotingResults isVisible={isVotingResultsVisible} drivers={formattedDrivers} votes={votes} config={combinedConfig} />
      <LapCounter isVisible={isLapCounterVisible} config={combinedConfig} sessionInfo={sessionInfo} />
      <VirtualChamp isVisible={isVirtualChampVisible} config={combinedConfig} />
      <LapTimeEvolution history={lapTimesHistory} drivers={formattedDrivers} config={combinedConfig} isVisible={isLapTimesHistoryVisible} focusDriver={lapTimesFocus} /> 
      <PitStopTimer isVisible={pitStopState?.isVisible} pitState={pitStopState} config={combinedConfig} />
    </div>
  );
}