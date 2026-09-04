import { useState, useEffect, useRef, useMemo } from 'react';
import circuitosData from '../data/circuitos.json';
import SettingsPanel from '../windows/SettingsPanel';
import CustomizePanel from '../windows/CustomizePanel';
import DriversTable from '../windows/DriversTable';

// EL FIX: Protegemos ipcRenderer para que CasparCG no colapse al leer este archivo por culpa del Router de React
let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (e) {}
}

const colors = {
  bgApp: '#121212', bgPanel: '#1a1a1a', bgInput: '#242424', border: '#333333',
  textMain: '#ffffff', textMuted: '#888888', yellow: '#ffcc00', red: '#e74c3c', green: '#2ecc71'
};

const inputStyle = { backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.textMain, padding: '8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', width: '100%', boxSizing: 'border-box', outline: 'none' };
const btnStyle = (isActive = false) => ({ backgroundColor: isActive ? colors.yellow : colors.bgInput, color: isActive ? '#000' : colors.textMain, border: `1px solid ${isActive ? colors.yellow : colors.border}`, padding: '12px 10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', width: '100%', textAlign: 'center', transition: 'all 0.2s ease' });
const sectionTitleStyle = { fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', marginTop: '20px' };

const GraphicControl = ({ id, label, value, isActive, onChange, onBlur, onToggle }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}> <button onClick={() => onToggle(id)} style={btnStyle(isActive)}>{label}</button> <input name={id} value={value || ''} onChange={onChange} onBlur={onBlur} style={inputStyle} placeholder={`NOMBRE...`} /> </div>);
const SelectControl = ({ id, label, value, options, isActive, onChange, onBlur, onToggle }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}> <button onClick={() => onToggle(id)} style={btnStyle(isActive)}>{label}</button> <select name={id} value={value || ''} onChange={onChange} onBlur={onBlur} style={inputStyle}> <option value="">SELECCIONAR...</option> {options.map((opt, i) => (<option key={i} value={opt.nombre}>{opt.nombre.toUpperCase()}</option>))} </select> </div>);
const WeatherControl = ({ id, label, config, isActive, onChange, onBlur, onToggle, setConfig }) => {
  const [loading, setLoading] = useState(false);
  const fetchWeather = async () => { const circuitoSeleccionado = circuitosData.find(c => c.nombre === config.circuito); if (!circuitoSeleccionado) { alert("⚠️ Selecciona un Circuito primero."); return; } setLoading(true); try { const { lat, lon } = circuitoSeleccionado; const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`); const weatherData = await weatherRes.json(); const temp = Math.round(weatherData.current_weather.temperature); const code = weatherData.current_weather.weathercode; let desc = "DESPEJADO"; if (code >= 1 && code <= 3) desc = "NUBLADO"; if (code >= 51 && code <= 67) desc = "LLUVIA"; if (code >= 95) desc = "TORMENTA"; const weatherString = `${temp}°C - ${desc}`; const newConfig = { ...config, [id]: weatherString }; setConfig(newConfig); if(ipcRenderer) await ipcRenderer.invoke('save-config', newConfig); } catch (error) { console.error(error); } setLoading(false); };
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}> <div style={{ display: 'flex', gap: '2px' }}> <button onClick={() => onToggle(id)} style={{ ...btnStyle(isActive), flex: 1 }}>{label}</button> <button onClick={fetchWeather} disabled={loading} style={{ backgroundColor: colors.bgInput, color: colors.yellow, border: `1px solid ${colors.border}`, cursor: 'pointer', padding: '0 10px' }}> {loading ? '⏳' : '☁️'} </button> </div> <input name={id} value={config[id] || ''} onChange={onChange} onBlur={onBlur} style={inputStyle} placeholder={`DATOS DEL CLIMA...`} /> </div>);
};

export const defaultPositions = {
  relator: { x: 20, y: 560, scale: 1 }, comentarista: { x: 20, y: 480, scale: 1 }, notero1: { x: 20, y: 400, scale: 1 },
  notero2: { x: 20, y: 320, scale: 1 }, circuito: { x: 20, y: 240, scale: 1 }, clima: { x: 20, y: 160, scale: 1 },
  ticker: { x: 0, y: 660, scale: 1 }, grid: { x: 0, y: 0, scale: 1 }, finalResults: { x: 240, y: 40, scale: 1 },
  tower: { x: 20, y: 20, scale: 1 }, winner: { x: 440, y: 550, scale: 1 }, flags: { x: 320, y: 50, scale: 1 },
  fastestLap: { x: 440, y: 150, scale: 1 }, battle: { x: 50, y: 50, scale: 1 }, customZocalo: { x: 20, y: 580, scale: 1 }
};

const allGraphicsList = [
  { id: 'relator', label: 'RELATOR' }, { id: 'comentarista', label: 'COMENTARISTA' }, { id: 'notero1', label: 'NOTERO 1' }, { id: 'notero2', label: 'NOTERO 2' },
  { id: 'circuito', label: 'CIRCUITO' }, { id: 'clima', label: 'CLIMA' }, { id: 'ticker', label: 'TIRA INFERIOR' }, { id: 'tower', label: 'TORRE POSICIONES' },
  { id: 'grid', label: 'GRILLA PARTIDA' }, { id: 'finalResults', label: 'RESULTADOS FINALES' }, { id: 'winner', label: 'GANADOR' },
  { id: 'flags', label: 'BANDERAS DE ALERTA' }, { id: 'fastestLap', label: 'RECORD DE VUELTA' },
  { id: 'driverInfo', label: 'INFO DEL PILOTO' }, { id: 'battle', label: 'BATALLA (F1)' }, { id: 'customZocalo', label: 'ZÓCALO LIBRE' },
  { id: 'votingQR', label: 'QR DE VOTACIÓN' }, { id: 'votingResults', label: 'RESULTADOS DE VOTACIÓN' }
];

export default function ControlPanel() {
  const [config, setConfig] = useState({
    relator: '', comentarista: '', notero1: '', notero2: '', circuito: '', clima: '', speedhiveCode: '', chromaColor: '#00FF00', logo: null, blackFlagNumber: '', categoryLogo: null,
    zocalos: Array(6).fill({ title: '', text: '' })
  });

  const [showBattle, setShowBattle] = useState(false);
  const [battleTarget, setBattleTarget] = useState(1);
  const [positions, setPositions] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({});

  const [activeTab, setActiveTab] = useState('PANEL');
  const [showTicker, setShowTicker] = useState(false);
  const [showTower, setShowTower] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [activeDriverInfo, setActiveDriverInfo] = useState(null);
  const [showWinner, setShowWinner] = useState(false);
  const [showFastestLap, setShowFastestLap] = useState(false);
  const [activeFlags, setActiveFlags] = useState({ red: false, tricolor: false, black: false, blue: false });
  const [graphics, setGraphics] = useState({ relator: false, comentarista: false, notero1: false, notero2: false, circuito: false, clima: false });
  
  const [activeZocaloIndex, setActiveZocaloIndex] = useState(null);

  const [autoScrape, setAutoScrape] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const configRef = useRef(config);
  const isScrapingRef = useRef(false);

  const [newRecordAlert, setNewRecordAlert] = useState(false);
  const bestLapRef = useRef(Infinity);
  const recordTimeoutRef = useRef(null);

  const [showVotingQR, setShowVotingQR] = useState(false);
  const [showVotingResults, setShowVotingResults] = useState(false);
  const [localIp, setLocalIp] = useState('');
  
  const [votes, setVotes] = useState({});

  useEffect(() => { configRef.current = config; }, [config]);

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-config').then(configData => {
        ipcRenderer.invoke('get-positions').then(savedPositions => {
          const mergedPositions = { ...defaultPositions };
          Object.keys(defaultPositions).forEach(key => { if (savedPositions[key]) mergedPositions[key] = savedPositions[key]; });
          setConfig({ chromaColor: '#00FF00', zocalos: Array(6).fill({ title: '', text: '' }), ...configData });
          setPositions(mergedPositions);
        });
      });
      ipcRenderer.invoke('get-local-ip').then(setLocalIp);
      ipcRenderer.invoke('get-votes').then(v => { if(v) setVotes(v) }).catch(() => {});
      const handleUpdateIp = (event, newIp) => setLocalIp(newIp); 

      const handleUpdateVotes = (event, newVotes) => setVotes(newVotes);
      ipcRenderer.on('update-votes', handleUpdateVotes);

      return () => {
        ipcRenderer.removeListener('update-votes', handleUpdateVotes);
      }
    }
  }, []);

  useEffect(() => {
    if (drivers.length === 0) return;
    const parseTime = (str) => {
      if (!str || str === '-') return Infinity;
      const parts = str.split(':');
      let val = parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseFloat(parts[1]) : parseFloat(str);
      if (isNaN(val) || val <= 0) return Infinity; 
      return val;
    };
    
    let currentBest = Infinity;
    drivers.forEach(d => {
      const t = parseTime(d.bestLap);
      if (t < currentBest) currentBest = t;
    });

    if (currentBest < Infinity) {
      if (currentBest < bestLapRef.current && bestLapRef.current !== Infinity) {
        setNewRecordAlert(true);
        if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
        recordTimeoutRef.current = setTimeout(() => { setNewRecordAlert(false); }, 6000);
      }
      bestLapRef.current = currentBest;
    }
  }, [drivers]);

  const fastestDriver = useMemo(() => {
    if (!drivers || drivers.length === 0) return null;
    let best = null;
    let minTime = Infinity;

    const parseTime = (str) => {
      if (!str || str === '-') return Infinity;
      const parts = str.split(':');
      let val = parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseFloat(parts[1]) : parseFloat(str);
      if (isNaN(val) || val <= 0) return Infinity; 
      return val;
    };

    drivers.forEach(d => {
      const t = parseTime(d.bestLap);
      if (t < minTime) { minTime = t; best = d; }
    });

    return best;
  }, [drivers]);

  const handleToggleVotingQR = () => { const newState = !showVotingQR; setShowVotingQR(newState); if(ipcRenderer) ipcRenderer.send('toggle-voting-qr', newState); };
  const handleToggleVotingResults = () => { const newState = !showVotingResults; setShowVotingResults(newState); if(ipcRenderer) ipcRenderer.send('toggle-voting-results', newState); };
  const handleResetVotes = () => { if(window.confirm('⚠️ ¿Estás seguro de que quieres borrar todos los votos actuales?')) { if(ipcRenderer) ipcRenderer.send('reset-votes'); } };

  const handleSaveBackup = async () => {
    if (drivers.length === 0) return alert("⚠️ No hay datos en pantalla para guardar.");
    if(ipcRenderer) {
      const success = await ipcRenderer.invoke('save-backup', { drivers, session: sessionInfo });
      if (success) alert("✅ Datos de la carrera guardados correctamente en memoria.");
      else alert("❌ Error al guardar los datos.");
    }
  };

  const handleLoadBackup = async () => {
    if(ipcRenderer) {
      const data = await ipcRenderer.invoke('load-backup');
      if (data && data.drivers) {
        setAutoScrape(false); setDrivers(data.drivers); setSessionInfo(data.session);
        ipcRenderer.send('force-update-leaderboard', data);
        alert("📂 Datos en memoria cargados. La actualización 'EN VIVO' ha sido pausada.");
      } else alert("⚠️ No hay datos guardados previamente.");
    }
  };

  const handleToggleFinalResults = () => { setShowFinalResults(!showFinalResults); if(ipcRenderer) ipcRenderer.send('toggle-final-results', !showFinalResults); };
  const handleToggleWinner = () => { const newState = !showWinner; setShowWinner(newState); const winnerDriver = drivers.find(d => String(d.pos) === '1') || drivers[0]; if(ipcRenderer) ipcRenderer.send('toggle-winner', { isVisible: newState, driver: winnerDriver }); };
  const handleChange = (e) => setConfig({ ...config, [e.target.name]: e.target.value });
  const handleSave = async () => { if(ipcRenderer) await ipcRenderer.invoke('save-config', config); };
  const handleToggleBattle = () => { const newState = !showBattle; setShowBattle(newState); if(ipcRenderer) ipcRenderer.send('toggle-battle', { isVisible: newState, pos: battleTarget }); };

  const handleToggleDriverInfo = (driver) => {
    if (activeDriverInfo && activeDriverInfo.number === driver.number) {
      setActiveDriverInfo(null); if(ipcRenderer) ipcRenderer.send('toggle-driver-info', { isVisible: false, driver: null });
    } else {
      setActiveDriverInfo(driver); if(ipcRenderer) ipcRenderer.send('toggle-driver-info', { isVisible: true, driver });
    }
  };
  
  const handleDirectSave = async (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    if(ipcRenderer) await ipcRenderer.invoke('save-config', newConfig);
  };

  const handleUpdatePositions = async (newPositions, shouldSaveToDisk) => {
    setPositions(newPositions);
    if (shouldSaveToDisk) { if(ipcRenderer) await ipcRenderer.invoke('save-positions', newPositions); }
    else { if(ipcRenderer) ipcRenderer.send('preview-positions', newPositions); }
  };

  const handleScrape = async () => {
    if (isScrapingRef.current) return;
    let rawCode = configRef.current.speedhiveCode || '';
    rawCode = rawCode.trim();
    const provider = configRef.current.timingProvider || 'speedhive';
    
    if (!rawCode) { alert("⚠️ Ingresa el código de la carrera en la pestaña AJUSTES primero."); setAutoScrape(false); return; }

    let finalCode = rawCode;
    if (provider === 'speedhive') {
      if (rawCode.includes('speedhive.mylaps.com')) {
        const match = rawCode.match(/livetiming\/([a-zA-Z0-9\-]+)/);
        if (match) finalCode = match[1];
      }
      finalCode = finalCode.replace(/\/active\/?$/i, '').replace(/^\/+|\/+$/g, '');
    } else if (provider === 'racemonitor') {
      if (rawCode.includes('race-monitor.com')) {
        const match = rawCode.match(/Race\/(\d+)/);
        if (match) finalCode = match[1];
      }
    }
    
    isScrapingRef.current = true;
    try {
      if(ipcRenderer) {
        const data = await ipcRenderer.invoke('scrape-timing', { provider, code: finalCode });
        if (data && data.drivers) { setDrivers(data.drivers); if (data.session) setSessionInfo(data.session); }
      }
    } catch (e) { console.error("Error scrapeando:", e); }
    isScrapingRef.current = false;
  };

  const handleSelectCategoryLogo = async () => {
    if(ipcRenderer) {
      const logoData = await ipcRenderer.invoke('select-category-logo');
      if (logoData) handleDirectSave('categoryLogo', logoData);
    }
  };

  const currentZocalos = config.zocalos && config.zocalos.length === 6 ? config.zocalos : Array(6).fill({ title: '', text: '' });

  const handleZocaloChange = (index, field, value) => {
    const newZocalos = [...currentZocalos];
    newZocalos[index] = { ...newZocalos[index], [field]: value };
    setConfig({ ...config, zocalos: newZocalos });
    if (activeZocaloIndex === index) {
      if(ipcRenderer) ipcRenderer.send('toggle-custom-zocalo', { isVisible: true, title: newZocalos[index].title, text: newZocalos[index].text });
    }
  };

  const handleToggleZocalo = (index) => {
    if (activeZocaloIndex === index) {
      setActiveZocaloIndex(null); if(ipcRenderer) ipcRenderer.send('toggle-custom-zocalo', { isVisible: false, title: '', text: '' });
    } else {
      setActiveZocaloIndex(index);
      const z = currentZocalos[index];
      if(ipcRenderer) ipcRenderer.send('toggle-custom-zocalo', { isVisible: true, title: z.title, text: z.text });
    }
  };

  useEffect(() => {
    let progressInterval;
    let scrapeInterval;
    if (autoScrape) {
      handleScrape();
      setScrapeProgress(0);
      progressInterval = setInterval(() => { setScrapeProgress(prev => (prev >= 100 ? 0 : prev + 1)); }, 10);
      scrapeInterval = setInterval(() => { handleScrape(); setScrapeProgress(0); }, 1000);
    } else {
      setScrapeProgress(0);
    }
    return () => { clearInterval(progressInterval); clearInterval(scrapeInterval); };
  }, [autoScrape]);

  const handleToggleTicker = () => { setShowTicker(!showTicker); if(ipcRenderer) ipcRenderer.send('toggle-ticker', !showTicker); };
  const handleToggleTower = () => { setShowTower(!showTower); if(ipcRenderer) ipcRenderer.send('toggle-tower', !showTower); };
  const handleToggleGrid = () => { setShowGrid(!showGrid); if(ipcRenderer) ipcRenderer.send('toggle-grid', !showGrid); };
  const handleToggleGraphic = (id) => { const newState = !graphics[id]; setGraphics({ ...graphics, [id]: newState }); if(ipcRenderer) ipcRenderer.send('toggle-graphic', { id, visible: newState }); };
  const handleSelectLogo = async () => { if(ipcRenderer) { const logoData = await ipcRenderer.invoke('select-logo'); if (logoData) handleDirectSave('logo', logoData); } };
  const handleToggleFastestLap = () => { setShowFastestLap(!showFastestLap); setNewRecordAlert(false); if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current); if(ipcRenderer) ipcRenderer.send('toggle-fastest-lap', !showFastestLap); };

  const handleToggleFlag = (type) => {
    const newFlags = { red: false, tricolor: false, black: false, blue: false };
    if (!activeFlags[type]) newFlags[type] = true;
    setActiveFlags(newFlags);
    if(ipcRenderer) ipcRenderer.send('toggle-flag', newFlags);
  };
  
  const handleSelectPhotosFolder = async () => {
    try {
      if(ipcRenderer) {
        const folderPath = await ipcRenderer.invoke('select-photos-folder');
        if (folderPath) handleDirectSave('photosPath', folderPath);
      }
    } catch (error) { console.error("Error al seleccionar carpeta:", error); }
  };  

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: colors.bgApp, color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes pulseRecordAlert {
          0% { background-color: #e74c3c !important; border-color: #c0392b !important; box-shadow: 0 0 15px rgba(231, 76, 60, 0.8) !important; color: white !important; }
          50% { background-color: #c0392b !important; border-color: #922b21 !important; box-shadow: none !important; color: white !important; }
          100% { background-color: #e74c3c !important; border-color: #c0392b !important; box-shadow: 0 0 15px rgba(231, 76, 60, 0.8) !important; color: white !important; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '15px', height: '15px', backgroundColor: colors.yellow }}></div>
          <h1 style={{ fontSize: '16px', margin: 0, letterSpacing: '1px' }}>RACE DYNAMICS DASHBOARD</h1>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          
          {fastestDriver && fastestDriver.bestLap !== '-' && (
            <div style={{ textAlign: 'right', borderRight: `1px solid ${colors.border}`, paddingRight: '20px' }}>
              <div style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>
                MEJOR VUELTA {newRecordAlert && '🔥'}
              </div>
              <div style={{ fontSize: '14px', color: newRecordAlert ? colors.red : colors.yellow, fontWeight: 'bold', transition: 'color 0.3s' }}>
                #{fastestDriver.number} {fastestDriver.name.toUpperCase()} <span style={{ color: colors.textMain, marginLeft: '5px' }}>{fastestDriver.bestLap}</span>
              </div>
            </div>
          )}

          {sessionInfo?.laps && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>VUELTAS</div>
              <div style={{ fontSize: '14px', color: colors.textMain, fontWeight: 'bold' }}>{sessionInfo.laps}</div>
            </div>
          )}
          {sessionInfo?.totalTime && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>TIEMPO TOTAL</div>
              <div style={{ fontSize: '14px', color: colors.textMain, fontWeight: 'bold' }}>{sessionInfo.totalTime}</div>
            </div>
          )}
          <div style={{ border: `1px solid ${autoScrape ? colors.green : colors.textMuted}`, color: autoScrape ? colors.green : colors.textMuted, backgroundColor: autoScrape ? 'rgba(46, 204, 113, 0.1)' : 'transparent', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', letterSpacing: '1px', marginLeft: '10px' }}>
            {autoScrape ? '🟢 EN VIVO' : 'PAUSADO'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
        {['PANEL', 'VOTACIONES', 'ZÓCALOS', 'DISEÑOS', 'AJUSTES', 'PERSONALIZAR'].map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 25px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', borderBottom: activeTab === tab ? `3px solid ${colors.textMain}` : '3px solid transparent', color: activeTab === tab ? colors.textMain : colors.textMuted }}>
            {tab}
          </div>
        ))}
      </div>

      {activeTab === 'PANEL' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: '320px', backgroundColor: colors.bgPanel, padding: '0 15px', overflowY: 'auto', borderRight: `1px solid ${colors.border}` }}>
            
            <div style={sectionTitleStyle}>BANDERAS DE CARRERA</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '20px' }}>
              <button onClick={() => handleToggleFlag('red')} style={{ ...btnStyle(activeFlags.red), backgroundColor: activeFlags.red ? '#e74c3c' : colors.bgInput, color: activeFlags.red ? '#fff' : colors.textMain, borderColor: activeFlags.red ? '#c0392b' : colors.border }}>ROJA</button>
              <button onClick={() => handleToggleFlag('tricolor')} style={{ ...btnStyle(activeFlags.tricolor), background: activeFlags.tricolor ? 'linear-gradient(90deg, #0033a0, #fff, #ff8200)' : colors.bgInput, color: activeFlags.tricolor ? '#000' : colors.textMain, textShadow: activeFlags.tricolor ? '0 0 3px #fff' : 'none' }}>TRICOLOR</button>
              <button onClick={() => handleToggleFlag('blue')} style={{ ...btnStyle(activeFlags.blue), backgroundColor: activeFlags.blue ? '#3498db' : colors.bgInput, color: activeFlags.blue ? '#fff' : colors.textMain, borderColor: activeFlags.blue ? '#2980b9' : colors.border }}>AZUL (PASO)</button>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={() => handleToggleFlag('black')} style={{ ...btnStyle(activeFlags.black), flex: 1, backgroundColor: activeFlags.black ? '#111' : colors.bgInput, color: activeFlags.black ? '#fff' : colors.textMain, borderColor: activeFlags.black ? '#000' : colors.border, padding: '12px 5px' }}>NEGRA</button>
                <input name="blackFlagNumber" value={config.blackFlagNumber || ''} onChange={(e) => handleDirectSave('blackFlagNumber', e.target.value)} style={{ ...inputStyle, width: '45px', textAlign: 'center', padding: '0', fontSize: '14px' }} placeholder="Nº" title="Escribe el número del auto a excluir" />
              </div>
            </div>

            <div style={sectionTitleStyle}>PERSONAL / ENTORNO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <GraphicControl id="relator" label="RELATOR" value={config.relator} isActive={graphics.relator} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} />
              <GraphicControl id="comentarista" label="COMENTARISTA" value={config.comentarista} isActive={graphics.comentarista} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} />
              <GraphicControl id="notero1" label="NOTERO 1" value={config.notero1} isActive={graphics.notero1} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} />
              <GraphicControl id="notero2" label="NOTERO 2" value={config.notero2} isActive={graphics.notero2} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} />
              <SelectControl id="circuito" label="CIRCUITO" value={config.circuito} options={circuitosData} isActive={graphics.circuito} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} />
              <WeatherControl id="clima" label="CLIMA" config={config} setConfig={setConfig} isActive={graphics.clima} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} />
            </div>

            <div style={sectionTitleStyle}>GRILLA</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
              <button onClick={() => ipcRenderer.send('grid-prev')} style={{ ...btnStyle(), flex: 1 }}>◀ ANT</button>
              <button onClick={handleToggleGrid} style={{ ...btnStyle(showGrid), flex: 2 }}>MOSTRAR GRILLA</button>
              <button onClick={() => ipcRenderer.send('grid-next')} style={{ ...btnStyle(), flex: 1 }}>SIG ▶</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px' }}>
              <button onClick={() => setAutoScrape(!autoScrape)} style={{ ...btnStyle(autoScrape), color: autoScrape ? '#000' : colors.green, borderColor: autoScrape ? colors.yellow : colors.green }}>
                {autoScrape ? '⏹ DETENER (1s)' : '▶ AUTO-CARGA'}
              </button>
            </div>

            <div style={sectionTitleStyle}>GRÁFICOS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
              <button onClick={handleToggleTicker} style={btnStyle(showTicker)}>TIRA INFERIOR</button>
              <button onClick={handleToggleTower} style={btnStyle(showTower)}>TORRE</button>
              
              <button 
                onClick={handleToggleFastestLap} 
                style={{ 
                  ...btnStyle(showFastestLap), 
                  ...(newRecordAlert ? { animation: 'pulseRecordAlert 1s infinite' } : {}) 
                }}
              >
                RECORD VUELTA
              </button>
            </div>

            <div style={sectionTitleStyle}>BATALLA EN PISTA</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, padding: '0 10px', borderRadius: '4px' }}>
                <span style={{ color: colors.textMuted, fontSize: '12px', marginRight: '5px' }}>POS:</span>
                <input
                  type="number" min="1" value={battleTarget}
                  onChange={(e) => setBattleTarget(e.target.value)}
                  style={{ ...inputStyle, width: '40px', border: 'none', padding: 0 }}
                />
              </div>
              <button onClick={handleToggleBattle} style={{ ...btnStyle(showBattle), flex: 1 }}>
                {showBattle ? 'OCULTAR BATALLA' : 'MOSTRAR BATALLA'}
              </button>
            </div>

            <div style={sectionTitleStyle}>INTERACTIVIDAD (VOTOS)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
              <button onClick={handleToggleVotingQR} style={btnStyle(showVotingQR)}>QR DE VOTACIÓN</button>
              <button onClick={handleToggleVotingResults} style={btnStyle(showVotingResults)}>RESULTADOS EN VIVO</button>
            </div>

            <div style={sectionTitleStyle}>MEMORIA DE CARRERA (BACKUP)</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <button onClick={handleSaveBackup} style={{ ...btnStyle(), flex: 1, backgroundColor: '#8e44ad', color: '#fff', borderColor: '#9b59b6' }}>
                💾 GUARDAR ACTUAL
              </button>
              <button onClick={handleLoadBackup} style={{ ...btnStyle(), flex: 1, backgroundColor: '#d35400', color: '#fff', borderColor: '#e67e22' }}>
                📂 CARGAR GUARDADA
              </button>
            </div>

            <div style={sectionTitleStyle}>CIERRE (ACTIVO)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
              <button onClick={handleToggleFinalResults} style={btnStyle(showFinalResults)}>RESULTADO FINAL</button>
              <button onClick={handleToggleWinner} style={btnStyle(showWinner)}>MOSTRAR GANADOR</button>
            </div>
          </div>

          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: colors.bgApp, position: 'relative' }}>
            {autoScrape && (
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '3px',
                backgroundColor: colors.green, width: `${scrapeProgress}%`,
                boxShadow: `0 0 10px ${colors.green}`, transition: scrapeProgress === 0 ? 'none' : 'width 10ms linear', zIndex: 10
              }} />
            )}
            <DriversTable drivers={drivers} colors={colors} activeDriverNumber={activeDriverInfo?.number} onToggleInfo={handleToggleDriverInfo} />
          </div>
        </div>
      )}

      {activeTab === 'VOTACIONES' && (
        <div style={{ padding: '30px', flex: 1, backgroundColor: colors.bgApp, overflowY: 'auto' }}>
          
          <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📊 PANEL DE VOTACIONES EN VIVO</span>
            <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: 'normal' }}>
              TOTAL VOTOS: <span style={{ color: colors.textMain, fontWeight: 'bold' }}>{Object.values(votes).reduce((a,b)=>a+b, 0)}</span>
            </span>
          </h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <button onClick={handleToggleVotingQR} style={{ ...btnStyle(showVotingQR), flex: 1 }}>{showVotingQR ? 'OCULTAR QR' : 'MOSTRAR QR EN PANTALLA'}</button>
            <button onClick={handleToggleVotingResults} style={{ ...btnStyle(showVotingResults), flex: 1 }}>{showVotingResults ? 'OCULTAR RESULTADOS' : 'MOSTRAR RESULTADOS EN PANTALLA'}</button>
            <button onClick={handleResetVotes} style={{ ...btnStyle(), backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c', flex: 1 }}>🗑️ REINICIAR VOTOS</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(() => {
              const totalVotes = Object.values(votes).reduce((a,b) => a+b, 0);
              const topDrivers = [...drivers]
                .filter(d => votes[d.number] > 0)
                .sort((a,b) => (votes[b.number] || 0) - (votes[a.number] || 0));

              if (topDrivers.length === 0) {
                return <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, fontStyle: 'italic' }}>No hay votos registrados en esta sesión aún. Activa el QR para comenzar.</div>;
              }

              return topDrivers.map((driver, index) => {
                const percentage = Math.round((votes[driver.number] / totalVotes) * 100);
                const voteCount = votes[driver.number];
                const isWinner = index === 0;

                return (
                  <div key={driver.number} style={{ backgroundColor: colors.bgPanel, padding: '15px 20px', borderRadius: '8px', border: `1px solid ${isWinner ? colors.yellow : colors.border}`, display: 'flex', alignItems: 'center', gap: '20px', boxShadow: isWinner ? `0 0 15px rgba(255, 204, 0, 0.15)` : 'none' }}>
                    
                    <div style={{ fontSize: '24px', fontWeight: '900', color: isWinner ? colors.yellow : colors.textMuted, width: '30px', textAlign: 'center' }}>
                      {index + 1}
                    </div>
                    
                    <div style={{ backgroundColor: colors.bgInput, color: colors.textMain, padding: '8px 15px', borderRadius: '6px', fontSize: '18px', fontWeight: '900', border: `1px solid ${colors.border}` }}>
                      #{driver.number}
                    </div>
                    
                    <div style={{ fontSize: '20px', fontWeight: 'bold', width: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {driver.name}
                    </div>
                    
                    <div style={{ flex: 1, backgroundColor: colors.bgInput, height: '24px', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: `1px solid ${colors.border}` }}>
                      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: isWinner ? colors.yellow : colors.red, transition: 'width 0.5s ease' }} />
                      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '11px', fontWeight: 'bold', color: percentage > 50 ? '#000' : '#fff', textShadow: percentage <= 50 ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none' }}>
                        {percentage}%
                      </span>
                    </div>

                    <div style={{ width: '100px', textAlign: 'right', fontSize: '14px', color: colors.textMuted, fontWeight: 'bold' }}>
                      {voteCount} VOTOS
                    </div>

                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {activeTab === 'AJUSTES' && (
        <SettingsPanel config={config} handleDirectSave={handleDirectSave} handleScrape={handleScrape} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} />
      )}

      {activeTab === 'PERSONALIZAR' && (
        <CustomizePanel config={config} positions={positions} defaultPositions={defaultPositions} onUpdatePositions={handleUpdatePositions} onSelectLogo={handleSelectLogo} onSelectCategoryLogo={handleSelectCategoryLogo} onSelectPhotosFolder={handleSelectPhotosFolder} onClearLogo={() => handleDirectSave('logo', null)} onClearCategoryLogo={() => handleDirectSave('categoryLogo', null)} onClearPhotosFolder={() => handleDirectSave('photosPath', null)} onConfigChange={handleDirectSave} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} />
      )}

      {activeTab === 'ZÓCALOS' && (
        <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', overflowY: 'auto', flex: 1 }}>
          {currentZocalos.map((zocalo, index) => (
            <div key={index} style={{ backgroundColor: colors.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${activeZocaloIndex === index ? colors.red : colors.border}`, display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: activeZocaloIndex === index ? `0 0 15px rgba(231, 76, 60, 0.2)` : 'none' }}>
              <h3 style={{ margin: 0, color: colors.yellow, fontSize: '13px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}> ZÓCALO PRESETEADO {index + 1} </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>TÍTULO (Ej: NOTICIA, ENTREVISTA)</label>
                <input type="text" value={zocalo.title} onChange={(e) => handleZocaloChange(index, 'title', e.target.value)} onBlur={handleSave} style={{ ...inputStyle, fontSize: '12px', padding: '10px' }} placeholder="Escribe un título..." />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>TEXTO PRINCIPAL</label>
                <textarea value={zocalo.text} onChange={(e) => handleZocaloChange(index, 'text', e.target.value)} onBlur={handleSave} style={{ ...inputStyle, fontSize: '14px', padding: '10px', flex: 1, minHeight: '80px', resize: 'vertical' }} placeholder="Escribe la información..." />
              </div>
              <button onClick={() => handleToggleZocalo(index)} style={{ ...btnStyle(activeZocaloIndex === index), padding: '12px', fontSize: '13px', marginTop: '5px', backgroundColor: activeZocaloIndex === index ? colors.red : colors.bgInput, color: activeZocaloIndex === index ? '#fff' : colors.textMain, borderColor: activeZocaloIndex === index ? colors.red : colors.border }}>
                {activeZocaloIndex === index ? '🔴 QUITAR DEL AIRE' : '▶ PONER EN EL AIRE'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'DISEÑOS' && (
        <div style={{ padding: '30px', overflowY: 'auto', flex: 1, backgroundColor: colors.bgApp, display: 'block' }}>
          <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>DISEÑOS DE GRÁFICAS (PNG/SVG)</h2>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '25px' }}>
            Carga imágenes con transparencia para reemplazar la caja clásica de colores por tu propio diseño.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {allGraphicsList.map(graphic => {
              const configKey = `design_${graphic.id}`;
              const hasDesign = !!config[configKey];
              return (
                <div key={graphic.id} style={{ backgroundColor: colors.bgPanel, padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: colors.textMain, fontWeight: 'bold', textAlign: 'center' }}>{graphic.label}</span>
                  <div style={{ backgroundColor: '#000', height: '80px', borderRadius: '4px', border: `1px dashed ${hasDesign ? colors.green : colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {hasDesign ? <img src={config[configKey]} alt={graphic.label} style={{ maxHeight: '70px', maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{fontSize: '10px', color: '#444'}}>DISEÑO ESTÁNDAR</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={async () => { if(ipcRenderer) { const imgData = await ipcRenderer.invoke('select-design-image', graphic.label); if (imgData) handleDirectSave(configKey, imgData); } }} style={{...btnStyle(false), flex: 1, padding: '8px', fontSize: '10px'}}>📷 CARGAR PNG/SVG</button>
                    {hasDesign && <button onClick={() => handleDirectSave(configKey, null)} style={{...btnStyle(false), flex: 1, backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '8px', fontSize: '10px'}}>🗑️ QUITAR</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
    </div>
  );
}