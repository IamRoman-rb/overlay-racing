import { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
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
import LapCounter from '../graphics/LapCounter'
import VirtualChamp from '../graphics/VirtualChamp';

// EL FIX: Protección absoluta para CasparCG / vMix
let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (e) {}
}

const formatDriverName = (name, format) => {
  if (!name) return '';
  if (!format || format === 'original') return name;
  if (format === 'uppercase') return name.toUpperCase();
  let first = '', last = '';
  if (name.includes(',')) {
    const parts = name.split(','); last = parts[0].trim(); first = parts[1].trim();
  } else {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return format === 'uppercase' ? name.toUpperCase() : name;
    first = parts[0]; last = parts.slice(1).join(' '); 
  }
  const cleanFirstInitial = first ? first.charAt(0).toUpperCase() : '';
  const cleanLastInitial = last ? last.charAt(0).toUpperCase() : '';
  switch (format) {
    case 'firstInitialLast': return first ? `${cleanFirstInitial}. ${last}` : last;
    case 'firstLastInitial': return last ? `${first} ${cleanLastInitial}.` : first;
    case 'lastOnly': return last || first;
    default: return name;
  }
};

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

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-config').then(setConfig).catch(()=>{});
      ipcRenderer.invoke('get-positions').then(setPositions).catch(()=>{});
      ipcRenderer.invoke('get-local-ip').then(setLocalIp).catch(()=>{});
    }

    const host = window.location.hostname || 'localhost';
    const socket = io(`http://${host}:8080`);

    socket.on('update-config', setConfig);
    socket.on('update-positions', setPositions);

    socket.on('update-ip', setLocalIp); 
    // ------------------------------------------------

    socket.on('update-leaderboard', data => {
      if (data && data.drivers) { setDrivers(data.drivers); setSessionInfo(data.session); }
    });

    socket.on('update-leaderboard', data => {
      if (data && data.drivers) { setDrivers(data.drivers); setSessionInfo(data.session); }
    });
    socket.on('set-ticker-visibility', setIsTickerVisible);
    socket.on('set-tower-visibility', setIsTowerVisible);
    socket.on('set-graphic-visibility', ({ id, visible }) => setGraphics(prev => ({ ...prev, [id]: visible })));
    socket.on('set-grid-visibility', setIsGridVisible);
    socket.on('set-final-results-visibility', setIsFinalResultsVisible);
    socket.on('set-winner-visibility', ({ isVisible, driver }) => { setIsWinnerVisible(isVisible); if (driver) setWinnerData(driver); });
    socket.on('set-flag-visibility', setActiveFlags);
    socket.on('set-fastest-lap-visibility', setIsFastestLapVisible);
    socket.on('set-driver-info-visibility', ({ isVisible, driver }) => { setIsDriverInfoVisible(isVisible); if (driver) setDriverInfoData(driver); });
    socket.on('set-battle-visibility', setBattleData);
    socket.on('set-custom-zocalo-visibility', setCustomZocaloData);
    socket.on('set-voting-qr', setIsVotingQRVisible);
    socket.on('set-voting-results', setIsVotingResultsVisible);
    socket.on('update-votes', setVotes);
    socket.on('set-lap-counter-visibility', setIsLapCounterVisible);
    socket.on('set-virtual-champ', setIsVirtualChampVisible);

    return () => socket.disconnect();
  }, []);

  const combinedConfig = { ...config, positions };

  const formattedDrivers = useMemo(() => drivers.map(d => ({ ...d, name: formatDriverName(d.name, config.nameFormat) })), [drivers, config.nameFormat]);
  const formattedDriverInfoData = useMemo(() => driverInfoData ? { ...driverInfoData, name: formatDriverName(driverInfoData.name, config.nameFormat) } : null, [driverInfoData, config.nameFormat]);
  const formattedWinnerData = useMemo(() => winnerData ? { ...winnerData, name: formatDriverName(winnerData.name, config.nameFormat) } : null, [winnerData, config.nameFormat]);

  const inBrowserMode = !ipcRenderer; 

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100vw', height: '100vh',
        backgroundColor: inBrowserMode ? 'transparent' : (config.chromaColor || '#00FF00'),
        color: 'white', fontFamily: config.fontFamily || 'Arial, sans-serif',
        overflow: 'hidden', position: 'relative'
      }}
    >
      <style>
        {`
          html, body, #root {
            background-color: transparent !important;
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          @import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,700;0,900;1,900&family=Montserrat:ital,wght@0,400;0,700;0,900;1,900&family=Oswald:wght@400;700&family=Teko:wght@400;600;700&display=swap');
        `}
      </style>

      {!inBrowserMode && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '30px', WebkitAppRegion: 'drag', zIndex: 9999,
          display: 'flex', justifyContent: 'flex-end', opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s ease'
        }}>
          <button onClick={() => ipcRenderer.send('overlay-control', 'minimize')} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}>—</button>
          <button onClick={() => ipcRenderer.send('overlay-control', 'maximize')} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}>🗖</button>
          <button onClick={() => ipcRenderer.send('overlay-control', 'close')} style={{ backgroundColor: 'rgba(231, 76, 60, 0.8)', border: 'none', color: 'white', width: '40px', height: '30px', cursor: 'pointer', WebkitAppRegion: 'no-drag' }}>✕</button>
        </div>
      )}

      <CustomZocalo isVisible={customZocaloData.isVisible} title={customZocaloData.title} text={customZocaloData.text} config={combinedConfig} />
      <Ticker drivers={formattedDrivers} config={combinedConfig} isVisible={isTickerVisible} sessionInfo={sessionInfo} />
      <TimingTower drivers={formattedDrivers} config={combinedConfig} isVisible={isTowerVisible} sessionInfo={sessionInfo} />
      <Battle drivers={formattedDrivers} config={combinedConfig} isVisible={battleData.isVisible} battleFocusPos={battleData.pos} />
      <StartingGrid drivers={formattedDrivers} config={combinedConfig} isVisible={isGridVisible} />
      <FinalResults drivers={formattedDrivers} config={combinedConfig} isVisible={isFinalResultsVisible} />
      <WinnerGraphic driver={formattedWinnerData} config={combinedConfig} isVisible={isWinnerVisible} />
      <Flags activeFlags={activeFlags} config={combinedConfig} />
      <LowerThird id="relator" role="Relator" name={config.relator} isVisible={graphics.relator} config={combinedConfig} />
      <LowerThird id="comentarista" role="Comentarista" name={config.comentarista} isVisible={graphics.comentarista} config={combinedConfig} />
      <LowerThird id="notero1" role="Notero" name={config.notero1} isVisible={graphics.notero1} config={combinedConfig} />
      <LowerThird id="notero2" role="Notero" name={config.notero2} isVisible={graphics.notero2} config={combinedConfig} />
      <LowerThird id="circuito" role="Circuito" name={config.circuito} isVisible={graphics.circuito} config={combinedConfig} />
      <LowerThird id="clima" role="Clima" name={config.clima} isVisible={graphics.clima} config={combinedConfig} />
      <FastestLap drivers={formattedDrivers} config={combinedConfig} isVisible={isFastestLapVisible} />
      <DriverInfo driver={formattedDriverInfoData} config={combinedConfig} isVisible={isDriverInfoVisible} />
      <VotingQR isVisible={isVotingQRVisible} config={combinedConfig} localIp={localIp} />
      <VotingResults isVisible={isVotingResultsVisible} drivers={formattedDrivers} votes={votes} config={combinedConfig} />
      <LapCounter isVisible={isLapCounterVisible} config={combinedConfig} sessionInfo={sessionInfo} />
      <VirtualChamp isVisible={isVirtualChampVisible} config={combinedConfig} />
    </div>
  );
}