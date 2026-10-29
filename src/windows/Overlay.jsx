import { useState, useEffect, useMemo } from 'react';
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
import { formatDriverName } from '../utils/formatDriverName';
import LapTimeEvolution from '../graphics/LapTimeEvolution';
import TrackAlert from '../graphics/TrackAlert';
import PenaltyAlert from '../graphics/PenaltyAlert';
import Branding from '../graphics/Branding';
import LayoutEdits from '../components/LayoutEdits';
import { getCanvasSize } from '../utils/canvasSize';
import Icon from '../components/Icon';
import { GOOGLE_FONTS_URL } from '../utils/fonts';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (e) {
    console.warn("No se pudo cargar ipcRenderer", e);
  }
}

function buildEventHandlers(setters) {
  const {
    setConfig, setPositions, setLocalIp, setDrivers, setSessionInfo,
    setIsTickerVisible, setIsTowerVisible, setGraphics, setIsGridVisible,
    setIsFinalResultsVisible, setIsWinnerVisible, setWinnerData, setActiveFlags,
    setIsFastestLapVisible, setIsDriverInfoVisible, setDriverInfoData,
    setBattleData, setCustomZocaloData, setIsVotingQRVisible, setIsVotingResultsVisible,
    setVotes, setIsLapCounterVisible, setIsVirtualChampVisible, setPitStopState,
    setStartingLightsState, setIsLapTimesHistoryVisible, setLapTimesHistory,
    setLapTimesFocus, setTrackAlert, setPenaltyAlert, setFinalResultsNav
  } = setters;

  return {
    'update-config': (data) => data && setConfig(data),
    'update-positions': (data) => data && setPositions(data),
    // OJO: acá SÍ queremos aceptar explícitamente los valores "falsy" que no sean null/undefined
    // (ej: si algún día se emite '' a propósito) — por eso chequeamos contra null/undefined en vez de "data &&"
    'update-ip': (data) => { if (data !== null && data !== undefined) setLocalIp(data); },
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
    // ANT / SIG del panel: pasan la página de los resultados finales a mano (n cuenta los pedidos para distinguir clics seguidos)
    'final-results-next': () => setFinalResultsNav(prev => ({ dir: 1, n: prev.n + 1 })),
    'final-results-prev': () => setFinalResultsNav(prev => ({ dir: -1, n: prev.n + 1 })),
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
    'update-track-alert': (data) => data && setTrackAlert(data),
    'update-penalty': (data) => data && setPenaltyAlert(data),
  };
}

export default function Overlay() {
  const [drivers, setDrivers] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({});
  const [config, setConfig] = useState({});
  const [positions, setPositions] = useState({});
  const [battleData, setBattleData] = useState({ isVisible: false, pos: 1 });
  const [isFinalResultsVisible, setIsFinalResultsVisible] = useState(false);
  const [finalResultsNav, setFinalResultsNav] = useState({ dir: 1, n: 0 });
  const [isWinnerVisible, setIsWinnerVisible] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  const [isTickerVisible, setIsTickerVisible] = useState(false);
  const [isTowerVisible, setIsTowerVisible] = useState(false);
  const [graphics, setGraphics] = useState({});
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [activeFlags, setActiveFlags] = useState({ red: false, tricolor: false, black: false, blue: false, checkered: false, green: false });
  const [isFastestLapVisible, setIsFastestLapVisible] = useState(false);
  const [isDriverInfoVisible, setIsDriverInfoVisible] = useState(false);
  const [driverInfoData, setDriverInfoData] = useState(null);
  const [customZocaloData, setCustomZocaloData] = useState({ isVisible: false, title: '', text: '' });
  const [isVotingQRVisible, setIsVotingQRVisible] = useState(false);
  const [isVotingResultsVisible, setIsVotingResultsVisible] = useState(false);
  const [votes, setVotes] = useState({});
  // FIX BUG 1: el default NO puede ser un string "válido" tipo 'localhost' — eso hace que
  // VotingQR lo trate como una URL real y genere un QR roto antes de tiempo. Arranca vacío
  // a propósito, así VotingQR muestra el estado de carga hasta que llegue el dato real.
  const [localIp, setLocalIp] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isLapCounterVisible, setIsLapCounterVisible] = useState(false);
  const [isVirtualChampVisible, setIsVirtualChampVisible] = useState(false);
  const [pitStopState, setPitStopState] = useState({ isVisible: false, driver: null, startTime: null, stoppedTime: null, isRunning: false });
  const [startingLightsState, setStartingLightsState] = useState({ isVisible: false, step: 0 });
  const [isLapTimesHistoryVisible, setIsLapTimesHistoryVisible] = useState(false);
  const [lapTimesHistory, setLapTimesHistory] = useState({});
  const [lapTimesFocus, setLapTimesFocus] = useState(null);
  const [trackAlert, setTrackAlert] = useState({ isVisible: false, curveId: null, curveName: '', type: 'yellow' });
  const [penaltyAlert, setPenaltyAlert] = useState({ isVisible: false, driverNumber: null, driverName: '', type: 'penalty', reason: '' });

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
      setLapTimesFocus, setTrackAlert, setPenaltyAlert, setFinalResultsNav
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
        setIsLapTimesHistoryVisible(!!bs.lapTimesHistory);
        setLapTimesFocus(bs.lapTimesFocus ?? null);
        if (bs.trackAlert) setTrackAlert(bs.trackAlert);
        if (bs.penaltyAlert) setPenaltyAlert(bs.penaltyAlert);
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
        // FIX BUG 2: antes esto apuntaba siempre a 'http://127.0.0.1:8080'. Si esta pantalla
        // se abre como Browser Source en OBS/vMix en OTRA PC de la red, 127.0.0.1 apunta a esa
        // PC y nunca conecta al servidor real. Usamos el HOSTNAME real desde el que se cargó
        // la página (LAN IP, localhost, etc.) pero forzando el puerto 8080, que es donde vive
        // el backend de Express/Socket.IO SIEMPRE (main.cjs: server.listen(8080, ...)).
        // OJO: no usar window.location.origin a secas — en modo dev (npm start) el frontend
        // se sirve desde el puerto 5173 de Vite, que NO tiene servidor de sockets. Copiar el
        // origin completo rompe la conexión en dev aunque funcione en el .exe empaquetado.
        const socketUrl = (typeof window !== 'undefined' && window.location && window.location.hostname)
          ? `${window.location.protocol}//${window.location.hostname}:8080`
          : 'http://127.0.0.1:8080'; // fallback sólo por si el entorno no expone window.location

        socket = io(socketUrl, {
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
  // Nombre del evento para los títulos de las gráficas: el de la sesión en vivo (por ejemplo
  // "125cc 4T Libre - 1era Manga"); si todavía no hay sesión cargada, el campeonato escrito a mano.
  const eventName = (sessionInfo && sessionInfo.name) || safeConfig.campeonato || '';
  const combinedConfig = { ...safeConfig, positions: positions || {}, eventName };
  const canvas = getCanvasSize(safeConfig); // tamaño del overlay (por defecto 1920x1080)

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
        width: `${canvas.width}px`, height: `${canvas.height}px`,
        backgroundColor: inBrowserMode ? 'transparent' : (safeConfig.chromaColor || '#00FF00'),
        color: 'white', fontFamily: safeConfig.fontFamily || 'Arial, sans-serif',
        overflow: 'hidden', position: 'relative'
      }}
    >
      <style>
        {`
          html, body, #root { background-color: transparent !important; background: transparent !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          @import url('${GOOGLE_FONTS_URL}');
        `}
      </style>

      {!inBrowserMode && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30px', WebkitAppRegion: 'drag', zIndex: 9999, display: 'flex', justifyContent: 'flex-end', opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <button onClick={() => ipcRenderer.send('overlay-control', 'minimize')} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}><Icon name="minimize" /></button>
          <button onClick={() => ipcRenderer.send('overlay-control', 'maximize')} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}><Icon name="crop_square" /></button>
          <button onClick={() => ipcRenderer.send('overlay-control', 'close')} style={{ backgroundColor: 'rgba(231, 76, 60, 0.8)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}><Icon name="close" /></button>
        </div>
      )}

      {/* Cada gráfica va dentro de LayoutEdits: aplica los objetos que se movieron desde la pestaña EDITOR */}
      <LayoutEdits id="startingLights" config={combinedConfig} visible={!!(startingLightsState?.isVisible)}>
        <StartingLights isVisible={startingLightsState?.isVisible} step={startingLightsState?.step} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="customZocalo" config={combinedConfig} visible={!!(customZocaloData?.isVisible)}>
        <CustomZocalo isVisible={customZocaloData?.isVisible} title={customZocaloData?.title} text={customZocaloData?.text} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="ticker" config={combinedConfig} visible={!!(isTickerVisible)}>
        <Ticker drivers={formattedDrivers} config={combinedConfig} isVisible={isTickerVisible} sessionInfo={sessionInfo} />
      </LayoutEdits>
      <LayoutEdits id="tower" config={combinedConfig} visible={!!(isTowerVisible)}>
        <TimingTower drivers={formattedDrivers} config={combinedConfig} isVisible={isTowerVisible} sessionInfo={sessionInfo} />
      </LayoutEdits>
      <LayoutEdits id="battle" config={combinedConfig} visible={!!(battleData?.isVisible)}>
        <Battle drivers={formattedDrivers} config={combinedConfig} isVisible={battleData?.isVisible} battleFocusPos={battleData?.pos} />
      </LayoutEdits>
      <LayoutEdits id="grid" config={combinedConfig} visible={!!(isGridVisible)}>
        <StartingGrid drivers={formattedDrivers} config={combinedConfig} isVisible={isGridVisible} />
      </LayoutEdits>
      <LayoutEdits id="finalResults" config={combinedConfig} visible={!!(isFinalResultsVisible)}>
        <FinalResults drivers={formattedDrivers} config={combinedConfig} isVisible={isFinalResultsVisible} navSignal={finalResultsNav} />
      </LayoutEdits>
      <LayoutEdits id="winner" config={combinedConfig} visible={!!(isWinnerVisible)}>
        <WinnerGraphic driver={formattedWinnerData} config={combinedConfig} isVisible={isWinnerVisible} sessionInfo={sessionInfo} />
      </LayoutEdits>
      <LayoutEdits id="flags" config={combinedConfig} visible={!!(Object.values(activeFlags).some(Boolean))}>
        <Flags activeFlags={activeFlags} config={combinedConfig} />
      </LayoutEdits>

      <LayoutEdits id="relator" config={combinedConfig} visible={!!(graphics?.relator)}>
        <LowerThird id="relator" role="Relator" name={safeConfig.relator} isVisible={graphics?.relator} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="comentarista" config={combinedConfig} visible={!!(graphics?.comentarista)}>
        <LowerThird id="comentarista" role="Comentarista" name={safeConfig.comentarista} isVisible={graphics?.comentarista} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="notero1" config={combinedConfig} visible={!!(graphics?.notero1)}>
        <LowerThird id="notero1" role="Notero" name={safeConfig.notero1} isVisible={graphics?.notero1} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="notero2" config={combinedConfig} visible={!!(graphics?.notero2)}>
        <LowerThird id="notero2" role="Notero" name={safeConfig.notero2} isVisible={graphics?.notero2} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="circuito" config={combinedConfig} visible={!!(graphics?.circuito)}>
        <LowerThird id="circuito" role="Circuito" name={safeConfig.circuito} isVisible={graphics?.circuito} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="clima" config={combinedConfig} visible={!!(graphics?.clima)}>
        <Weather data={safeConfig.weatherData} isVisible={graphics?.clima} config={combinedConfig} />
      </LayoutEdits>

      <LayoutEdits id="fastestLap" config={combinedConfig} visible={!!(isFastestLapVisible)}>
        <FastestLap drivers={formattedDrivers} config={combinedConfig} isVisible={isFastestLapVisible} />
      </LayoutEdits>
      <LayoutEdits id="driverInfo" config={combinedConfig} visible={!!(isDriverInfoVisible)}>
        <DriverInfo driver={formattedDriverInfoData} config={combinedConfig} isVisible={isDriverInfoVisible} />
      </LayoutEdits>
      <LayoutEdits id="votingQR" config={combinedConfig} visible={!!(isVotingQRVisible)}>
        <VotingQR isVisible={isVotingQRVisible} config={combinedConfig} localIp={localIp} />
      </LayoutEdits>
      <LayoutEdits id="votingResults" config={combinedConfig} visible={!!(isVotingResultsVisible)}>
        <VotingResults isVisible={isVotingResultsVisible} drivers={formattedDrivers} votes={votes} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="lapCounter" config={combinedConfig} visible={!!(isLapCounterVisible)}>
        <LapCounter isVisible={isLapCounterVisible} config={combinedConfig} sessionInfo={sessionInfo} />
      </LayoutEdits>
      <LayoutEdits id="virtualChamp" config={combinedConfig} visible={!!(isVirtualChampVisible)}>
        <VirtualChamp isVisible={isVirtualChampVisible} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="lapTimesHistory" config={combinedConfig} visible={!!(isLapTimesHistoryVisible)}>
        <LapTimeEvolution history={lapTimesHistory} drivers={formattedDrivers} config={combinedConfig} isVisible={isLapTimesHistoryVisible} focusDriver={lapTimesFocus} />
      </LayoutEdits>
      <LayoutEdits id="pitStop" config={combinedConfig} visible={!!(pitStopState?.isVisible)}>
        <PitStopTimer isVisible={pitStopState?.isVisible} pitState={pitStopState} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="trackAlert" config={combinedConfig} visible={!!(trackAlert?.isVisible)}>
        <TrackAlert alert={trackAlert} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="penaltyAlert" config={combinedConfig} visible={!!(penaltyAlert?.isVisible)}>
        <PenaltyAlert alert={penaltyAlert} config={combinedConfig} />
      </LayoutEdits>
      <LayoutEdits id="branding" config={combinedConfig} visible={!!(graphics?.branding)}>
        <Branding isVisible={graphics?.branding} config={combinedConfig} />
      </LayoutEdits>
    </div>
  );
}
