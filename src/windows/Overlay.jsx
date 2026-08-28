import { useState, useEffect } from 'react';
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
  
  // ESTADOS DE VOTACIÓN
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
    
    // HANDLERS DE VOTACIÓN
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
        color: 'white', fontFamily: 'Arial', overflow: 'hidden', position: 'relative'
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '30px',
        WebkitAppRegion: 'drag', zIndex: 9999,
        display: 'flex', justifyContent: 'flex-end',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        <button onClick={() => ipcRenderer.send('overlay-control', 'minimize')} style={controlBtnStyle}>—</button>
        <button onClick={() => ipcRenderer.send('overlay-control', 'maximize')} style={controlBtnStyle}>🗖</button>
        <button onClick={() => ipcRenderer.send('overlay-control', 'close')} style={{ ...controlBtnStyle, backgroundColor: 'rgba(231, 76, 60, 0.8)' }}>✕</button>
      </div>

      <CustomZocalo isVisible={customZocaloData.isVisible} title={customZocaloData.title} text={customZocaloData.text} config={combinedConfig} />
      <Ticker drivers={drivers} config={combinedConfig} isVisible={isTickerVisible} sessionInfo={sessionInfo} />
      <TimingTower drivers={drivers} config={combinedConfig} isVisible={isTowerVisible} sessionInfo={sessionInfo} />
      <Battle drivers={drivers} config={config} isVisible={battleData.isVisible} battleFocusPos={battleData.pos} />
      <StartingGrid drivers={drivers} config={combinedConfig} isVisible={isGridVisible} />
      <FinalResults drivers={drivers} config={combinedConfig} isVisible={isFinalResultsVisible} />
      <WinnerGraphic driver={winnerData} config={combinedConfig} isVisible={isWinnerVisible} />
      <Flags activeFlags={activeFlags} config={combinedConfig} />
      
      <LowerThird id="relator" role="Relator" name={config.relator} isVisible={graphics.relator} config={combinedConfig} />
      <LowerThird id="comentarista" role="Comentarista" name={config.comentarista} isVisible={graphics.comentarista} config={combinedConfig} />
      <LowerThird id="notero1" role="Notero" name={config.notero1} isVisible={graphics.notero1} config={combinedConfig} />
      <LowerThird id="notero2" role="Notero" name={config.notero2} isVisible={graphics.notero2} config={combinedConfig} />
      <LowerThird id="circuito" role="Circuito" name={config.circuito} isVisible={graphics.circuito} config={combinedConfig} />
      <LowerThird id="clima" role="Clima" name={config.clima} isVisible={graphics.clima} config={combinedConfig} />
      
      <FastestLap drivers={drivers} config={combinedConfig} isVisible={isFastestLapVisible} />
      <DriverInfo driver={driverInfoData} config={combinedConfig} isVisible={isDriverInfoVisible} />

      {/* COMPONENTES DE VOTACIÓN */}
      <VotingQR isVisible={isVotingQRVisible} config={combinedConfig} localIp={localIp} />
      <VotingResults isVisible={isVotingResultsVisible} drivers={drivers} votes={votes} config={combinedConfig} />
      
    </div>
  );
}