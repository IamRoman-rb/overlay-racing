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

const { ipcRenderer } = window.require('electron');

// --- LA MAGIA: TRADUCTOR AUTOMÁTICO DE NOMBRES ---
const formatDriverName = (name, format) => {
  if (!name) return '';
  if (!format || format === 'original') return name;
  if (format === 'uppercase') return name.toUpperCase();
  
  let first = '', last = '';
  
  // Detectar si el nombre viene separado por coma (ej: "BORLA, ROMAN")
  if (name.includes(',')) {
    const parts = name.split(',');
    last = parts[0].trim();
    first = parts[1].trim();
  } else {
    // Si viene normal (ej: "Roman Borla")
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return format === 'uppercase' ? name.toUpperCase() : name;
    first = parts[0];
    last = parts.slice(1).join(' '); // El resto de palabras asume que son apellido
  }

  // Evitamos errores si falta uno
  if (!first) first = '';
  if (!last) last = '';

  // Estandarizar la primera letra en mayúscula
  const cleanFirstInitial = first ? first.charAt(0).toUpperCase() : '';
  const cleanLastInitial = last ? last.charAt(0).toUpperCase() : '';

  switch (format) {
    case 'firstInitialLast':
      return first ? `${cleanFirstInitial}. ${last}` : last;
    case 'firstLastInitial':
      return last ? `${first} ${cleanLastInitial}.` : first;
    case 'lastOnly':
      return last || first;
    default:
      return name;
  }
};

export default function Overlay() {
  const [drivers, setDrivers] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({});
  const [config, setConfig] = useState({ relator: '', comentarista: '', notero1: '', notero2: '', circuito: '', clima: '' });
  const [positions, setPositions] = useState({});
  const [battleData, setBattleData] = useState({ isVisible: false, pos: 1 });
  const [isFinalResultsVisible, setIsFinalResultsVisible] = useState(false);
  const [isWinnerVisible, setIsWinnerVisible] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  const [isTickerVisible, setIsTickerVisible] = useState(false);
  const [isTowerVisible, setIsTowerVisible] = useState(false);
  const [graphics, setGraphics] = useState({ relator: false, comentarista: false, notero1: false, notero2: false, circuito: false, clima: false });
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

  useEffect(() => {
    ipcRenderer.invoke('get-config').then(setConfig);
    ipcRenderer.invoke('get-positions').then(setPositions);
    ipcRenderer.invoke('get-local-ip').then(setLocalIp);

    const handleConfigUpdate = (event, data) => setConfig(data);
    const handlePositionsUpdate = (event, data) => setPositions(data);

    const handleLeaderboardUpdate = (event, data) => {
      if (data && data.drivers) {
        setDrivers(data.drivers);
        setSessionInfo(data.session);
      }
    };

    const handleDriverInfoVisibility = (event, { isVisible, driver }) => {
      setIsDriverInfoVisible(isVisible);
      if (driver) setDriverInfoData(driver);
    };

    const handleTickerVisibility = (event, isVisible) => setIsTickerVisible(isVisible);
    const handleTowerVisibility = (event, isVisible) => setIsTowerVisible(isVisible);
    const handleGridVisibility = (event, isVisible) => setIsGridVisible(isVisible);
    const handleGraphicVisibility = (event, { id, visible }) => { setGraphics(prev => ({ ...prev, [id]: visible })); };
    const handleFinalResultsVisibility = (event, isVisible) => setIsFinalResultsVisible(isVisible);
    const handleWinnerVisibility = (event, { isVisible, driver }) => { setIsWinnerVisible(isVisible); if (driver) setWinnerData(driver); };
    const handleFlagVisibility = (event, data) => setActiveFlags(data);
    const handleFastestLapVisibility = (event, isVisible) => setIsFastestLapVisible(isVisible);
    const handleVotingQR = (event, isVisible) => setIsVotingQRVisible(isVisible);
    const handleVotingResults = (event, isVisible) => setIsVotingResultsVisible(isVisible);
    const handleUpdateVotes = (event, newVotes) => setVotes(newVotes);

    ipcRenderer.on('update-config', handleConfigUpdate);
    ipcRenderer.on('update-positions', handlePositionsUpdate);
    ipcRenderer.on('update-leaderboard', handleLeaderboardUpdate);
    ipcRenderer.on('set-ticker-visibility', handleTickerVisibility);
    ipcRenderer.on('set-tower-visibility', handleTowerVisibility);
    ipcRenderer.on('set-graphic-visibility', handleGraphicVisibility);
    ipcRenderer.on('set-grid-visibility', handleGridVisibility);
    ipcRenderer.on('set-final-results-visibility', handleFinalResultsVisibility);
    ipcRenderer.on('set-winner-visibility', handleWinnerVisibility);
    ipcRenderer.on('set-flag-visibility', handleFlagVisibility);
    ipcRenderer.on('set-fastest-lap-visibility', handleFastestLapVisibility);
    ipcRenderer.on('set-driver-info-visibility', handleDriverInfoVisibility);
    ipcRenderer.on('set-battle-visibility', (event, data) => setBattleData(data));
    ipcRenderer.on('set-custom-zocalo-visibility', (event, data) => setCustomZocaloData(data));
    ipcRenderer.on('set-voting-qr', handleVotingQR);
    ipcRenderer.on('set-voting-results', handleVotingResults);
    ipcRenderer.on('update-votes', handleUpdateVotes);

    return () => {
      ipcRenderer.removeListener('update-config', handleConfigUpdate);
      ipcRenderer.removeListener('update-positions', handlePositionsUpdate);
      ipcRenderer.removeListener('update-leaderboard', handleLeaderboardUpdate);
      ipcRenderer.removeListener('set-ticker-visibility', handleTickerVisibility);
      ipcRenderer.removeListener('set-tower-visibility', handleTowerVisibility);
      ipcRenderer.removeListener('set-graphic-visibility', handleGraphicVisibility);
      ipcRenderer.removeListener('set-grid-visibility', handleGridVisibility);
      ipcRenderer.removeListener('set-final-results-visibility', handleFinalResultsVisibility);
      ipcRenderer.removeListener('set-winner-visibility', handleWinnerVisibility);
      ipcRenderer.removeListener('set-flag-visibility', handleFlagVisibility);
      ipcRenderer.removeListener('set-fastest-lap-visibility', handleFastestLapVisibility);
      ipcRenderer.removeListener('set-driver-info-visibility', handleDriverInfoVisibility);
      ipcRenderer.removeListener('set-voting-qr', handleVotingQR);
      ipcRenderer.removeListener('set-voting-results', handleVotingResults);
      ipcRenderer.removeListener('update-votes', handleUpdateVotes);
    };
  }, []);

  const combinedConfig = { ...config, positions };

  // --- APLICAR EL FORMATO ANTES DE DIBUJAR ---
  const formattedDrivers = useMemo(() => {
    return drivers.map(d => ({
      ...d,
      name: formatDriverName(d.name, config.nameFormat)
    }));
  }, [drivers, config.nameFormat]);

  const formattedDriverInfoData = useMemo(() => {
    if (!driverInfoData) return null;
    return { ...driverInfoData, name: formatDriverName(driverInfoData.name, config.nameFormat) };
  }, [driverInfoData, config.nameFormat]);

  const formattedWinnerData = useMemo(() => {
    if (!winnerData) return null;
    return { ...winnerData, name: formatDriverName(winnerData.name, config.nameFormat) };
  }, [winnerData, config.nameFormat]);
  // -------------------------------------------

  const controlBtnStyle = {
    backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: 'white',
    width: '40px', height: '30px', cursor: 'pointer', fontSize: '14px',
    WebkitAppRegion: 'no-drag'
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100vw', height: '100vh',
        backgroundColor: config.chromaColor || '#00FF00',
        color: 'white', 
        fontFamily: config.fontFamily || 'Arial, sans-serif',
        overflow: 'hidden', position: 'relative'
      }}
    >
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,700;0,900;1,900&family=Montserrat:ital,wght@0,400;0,700;0,900;1,900&family=Oswald:wght@400;700&family=Teko:wght@400;600;700&display=swap');`}
      </style>

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '30px',
        WebkitAppRegion: 'drag', zIndex: 9999,
        display: 'flex', justifyContent: 'flex-end',
        opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s ease'
      }}>
        <button onClick={() => ipcRenderer.send('overlay-control', 'minimize')} style={controlBtnStyle}>—</button>
        <button onClick={() => ipcRenderer.send('overlay-control', 'maximize')} style={controlBtnStyle}>🗖</button>
        <button onClick={() => ipcRenderer.send('overlay-control', 'close')} style={{ ...controlBtnStyle, backgroundColor: 'rgba(231, 76, 60, 0.8)' }}>✕</button>
      </div>

      <CustomZocalo isVisible={customZocaloData.isVisible} title={customZocaloData.title} text={customZocaloData.text} config={combinedConfig} />
      
      {/* Pasamos los datos formateados a todas las gráficas */}
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
    </div>
  );
}