import { useState, useEffect, useRef, useMemo } from 'react';
import circuitosData from '../data/circuitos.json';
import SettingsPanel from '../windows/SettingsPanel';
import CustomizePanel from '../windows/CustomizePanel';
import DriversTable from '../windows/DriversTable';
import TrackMapPanel from '../windows/TrackMapPanel';
import UserManual from '../windows/UserManual';
import VoteHistory from '../windows/VoteHistory';
import GraphicEditor from '../windows/GraphicEditor';
import Icon from '../components/Icon';
import banderaCuadrosImg from '../assets/bandera cuadros.jpg';
import { createTranslator } from '../i18n/translations';

let ipcRenderer = null;
if (typeof window !== 'undefined' && typeof window.require === 'function') {
  try {
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (e) { }
}

const colors = {
  bgApp: '#121212', bgPanel: '#1a1a1a', bgInput: '#242424', border: '#333333',
  textMain: '#ffffff', textMuted: '#888888', yellow: '#ffcc00', red: '#e74c3c', green: '#2ecc71'
};

const inputStyle = { backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.textMain, padding: '8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', width: '100%', boxSizing: 'border-box', outline: 'none' };
// Botón encendido (isActive) = "hundido" y de color; apagado = "en relieve". Además index.css les da feedback al pasar el mouse y al presionarlos.
const btnStyle = (isActive = false, glow = 'rgba(255,204,0,0.35)') => ({
  backgroundColor: isActive ? colors.yellow : colors.bgInput, color: isActive ? '#000' : colors.textMain,
  border: `1px solid ${isActive ? colors.yellow : colors.border}`, padding: '12px 10px', fontSize: '11px', fontWeight: 'bold',
  textTransform: 'uppercase', cursor: 'pointer', width: '100%', textAlign: 'center',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  boxShadow: isActive ? `inset 0 3px 8px rgba(0,0,0,0.4), 0 0 12px ${glow}` : '0 2px 0 rgba(0,0,0,0.55)',
  transition: 'transform 0.08s ease, filter 0.12s ease, box-shadow 0.12s ease, background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
});
const NO_FLAGS = { red: false, tricolor: false, black: false, blue: false, checkered: false, green: false };
const sectionTitleStyle = { fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', marginTop: 0 };

// Distribuciones de la pestaña PANEL (se elige en PERSONALIZAR): dónde van los botones respecto de la tabla de pilotos.
const PANEL_LAYOUTS = ['left', 'right', 'top', 'bottom'];

const GraphicControl = ({ id, label, value, isActive, onChange, onBlur, onToggle, t }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}> <button onClick={() => onToggle(id)} style={btnStyle(isActive)}>{label}</button> <input name={id} value={value || ''} onChange={onChange} onBlur={onBlur} style={inputStyle} placeholder={t('panel.namePlaceholder')} /> </div>);
// Buscador con lista: se escribe parte del nombre (sin importar tildes ni mayúsculas) y se filtran los guardados.
// También acepta texto libre que no esté en la lista.
const normalizeText = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const SearchSelectControl = ({ id, label, value, options, isActive, onChange, onCommit, onToggle, t }) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const normalizedValue = normalizeText(value).trim();
  const isExact = options.some(o => normalizeText(o.nombre) === normalizedValue);
  const words = normalizedValue.split(/\s+/).filter(Boolean);
  // Con un valor ya elegido (o vacío) se muestra la lista completa para poder cambiarlo.
  const matches = (isExact || words.length === 0)
    ? options
    : options.filter(o => { const n = normalizeText(o.nombre); return words.every(w => n.includes(w)); });

  const pick = (name) => { onChange(name); onCommit(name); setOpen(false); setHighlight(-1); };
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(matches.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlight >= 0 && matches[highlight]) pick(matches[highlight].nombre);
      else { onCommit(value || ''); setOpen(false); }
    }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <button onClick={() => onToggle(id)} style={btnStyle(isActive)}>{label}</button>
      <div style={{ position: 'relative' }}>
        <input
          name={id} value={value || ''} autoComplete="off" placeholder={t('common.searchPlaceholder')}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setOpen(false); onCommit(value || ''); }}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, paddingRight: value ? '26px' : '8px' }}
        />
        {value ? (
          <span
            onMouseDown={(e) => { e.preventDefault(); pick(''); }}
            style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted, cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
          ><Icon name="close" /></span>
        ) : null}
        {open && matches.length > 0 && (
          <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, margin: 0, padding: 0, listStyle: 'none', maxHeight: '220px', overflowY: 'auto', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, borderTop: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.6)' }}>
            {matches.map((o, i) => (
              <li
                key={o.nombre}
                ref={i === highlight ? (el) => { if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); } : undefined}
                onMouseDown={(e) => { e.preventDefault(); pick(o.nombre); }}
                onMouseEnter={() => setHighlight(i)}
                style={{ padding: '7px 8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', color: normalizeText(o.nombre) === normalizedValue ? colors.yellow : colors.textMain, backgroundColor: i === highlight ? colors.border : 'transparent' }}
              >
                {o.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>
      {value && !isExact && matches.length === 0 && (
        <span style={{ fontSize: '9px', color: colors.textMuted, lineHeight: 1.3 }}>{t('common.noMatches')}</span>
      )}
    </div>
  );
};
// Marcadores de consumo de la PC (CPU, GPU, RAM, temperatura) para vigilar que la transmisión no sature la máquina.
const usageColor = (pct) => pct >= 90 ? colors.red : pct >= 70 ? colors.yellow : colors.green;
const tempColor = (c) => c >= 85 ? colors.red : c >= 70 ? colors.yellow : colors.green;

const Meter = ({ label, value, text, color, title }) => (
  <div title={title} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px' }}>
    <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', color: colors.textMuted, width: '30px' }}>{label}</span>
    <div style={{ flex: 1, height: '6px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}` }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%`, height: '100%', backgroundColor: color, transition: 'width 0.5s ease, background-color 0.5s ease' }} />
    </div>
    <span style={{ fontSize: '10px', fontWeight: 'bold', color: value === null ? colors.textMuted : color, width: '38px', textAlign: 'right' }}>{text}</span>
  </div>
);

const SystemMonitor = ({ t }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!ipcRenderer) return;
    let alive = true;
    const tick = () => ipcRenderer.invoke('get-system-stats').then(s => { if (alive) setStats(s); }).catch(() => {});
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!ipcRenderer) return null;
  const pct = (v) => v === null || v === undefined ? '--' : `${Math.round(v)}%`;
  const temp = stats?.cpuTemp ?? stats?.gpuTemp ?? null;
  const tempTitle = stats && temp !== null
    ? `CPU: ${stats.cpuTemp !== null ? Math.round(stats.cpuTemp) + '°C' : '-'} · GPU: ${stats.gpuTemp !== null ? Math.round(stats.gpuTemp) + '°C' : '-'}`
    : t('header.sysTempHint');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', padding: '4px 20px', backgroundColor: colors.bgPanel, borderBottom: `1px solid ${colors.border}` }}>
      <Meter label="CPU" value={stats?.cpu ?? null} text={pct(stats?.cpu)} color={usageColor(stats?.cpu ?? 0)} />
      <Meter label="GPU" value={stats?.gpu ?? null} text={pct(stats?.gpu)} color={usageColor(stats?.gpu ?? 0)} />
      <Meter label="RAM" value={stats?.ram ?? null} text={pct(stats?.ram)} color={usageColor(stats?.ram ?? 0)}
        title={stats ? `${stats.ramUsedGb.toFixed(1)} / ${stats.ramTotalGb.toFixed(1)} GB` : undefined} />
      <Meter label="TEMP" value={temp} text={temp === null ? '--' : `${Math.round(temp)}°C`} color={tempColor(temp ?? 0)} title={tempTitle} />
    </div>
  );
};

// Semáforo en vivo: repite en el panel lo que sale al aire (luces rojas que se encienden de a una y el cambio a verde al largar)
const StartingLightsIndicator = ({ visible, step, t }) => {
  const isGo = visible && step >= 6;
  const label = !visible ? t('panel.lightsOff')
    : isGo ? t('panel.lightsGreen')
    : step === 0 ? t('panel.lightsPreparing')
    : step === 5 ? t('panel.lightsReadyToGo')
    : t('panel.lightsRedCount', { step });
  const labelColor = !visible ? colors.textMuted : isGo ? colors.green : '#ff5533';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', backgroundColor: '#0c0c0c', border: `1px solid ${isGo ? colors.green : colors.border}`, borderRadius: '6px', padding: '10px 8px', marginBottom: '8px', transition: 'border-color 0.2s ease, box-shadow 0.2s ease', boxShadow: isGo ? '0 0 14px rgba(46,204,113,0.45)' : 'none' }}>
      <div style={{ display: 'flex', gap: '10px', backgroundColor: '#111', padding: '8px 12px', borderRadius: '24px', border: '2px solid #000' }}>
        {[1, 2, 3, 4, 5].map(i => {
          const lit = visible && (isGo || step >= i);
          const on = isGo ? '#2ecc71' : '#ff2200';
          const glow = isGo ? '46,204,113' : '255,34,0';
          return (
            <span key={i} style={{
              width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #000', boxSizing: 'border-box',
              backgroundColor: lit ? on : '#3a0a0a',
              boxShadow: lit ? `0 0 12px 3px rgba(${glow},0.8)` : 'inset 0 0 6px rgba(0,0,0,0.8)',
              transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
            }} />
          );
        })}
      </div>
      <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', color: labelColor, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
};

const WeatherControl = ({ id, label, config, isActive, onToggle, setConfig, t }) => {
  const [loading, setLoading] = useState(false);

  const fetchWeatherAt = async (lat, lon, place = null) => {
    setLoading(true);
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m,apparent_temperature,precipitation_probability&windspeed_unit=kmh&timezone=auto`
      );
      const weatherData = await weatherRes.json();
      const cw = weatherData.current_weather;

      // Buscamos el índice de la hora actual dentro del array horario para sacar humedad/ST/lluvia
      const hourIdx = weatherData.hourly?.time?.findIndex(t => t === cw.time?.slice(0, 13) + ':00' || t.startsWith(cw.time?.slice(0, 13)));
      const idx = hourIdx >= 0 ? hourIdx : 0;

      const newWeatherData = {
        temp: cw.temperature,
        windSpeed: cw.windspeed,
        windDir: cw.winddirection,
        weathercode: cw.weathercode,
        feelsLike: weatherData.hourly?.apparent_temperature?.[idx] ?? null,
        humidity: weatherData.hourly?.relative_humidity_2m?.[idx] ?? null,
        precipProb: weatherData.hourly?.precipitation_probability?.[idx] ?? null,
        place,
      };

      const newConfig = { ...config, weatherData: newWeatherData };
      setConfig(newConfig);
      if (ipcRenderer) await ipcRenderer.invoke('save-config', newConfig);
    } catch (error) {
      console.error(error);
      alert(t('panel.weatherError'));
    }
    setLoading(false);
  };

  const fetchWeather = () => {
    const circuitoSeleccionado = circuitosData.find(c => c.nombre === config.circuito);
    if (!circuitoSeleccionado) { alert(t('panel.weatherNeedCircuit')); return; }
    return fetchWeatherAt(circuitoSeleccionado.lat, circuitoSeleccionado.lon);
  };

  // Ubicación aproximada de la PC por IP (navigator.geolocation en Electron/Windows
  // depende de una API key de Google y suele fallar). Se prueban dos servicios por si uno cae.
  const fetchWeatherHere = async () => {
    setLoading(true);
    let loc = null;
    try {
      const r = await fetch('https://ipwho.is/');
      const d = await r.json();
      if (d.success !== false && typeof d.latitude === 'number') loc = { lat: d.latitude, lon: d.longitude, place: [d.city, d.country_code].filter(Boolean).join(', ') };
    } catch (e) { console.error(e); }
    if (!loc) {
      try {
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        if (typeof d.latitude === 'number') loc = { lat: d.latitude, lon: d.longitude, place: [d.city, d.country_code].filter(Boolean).join(', ') };
      } catch (e) { console.error(e); }
    }
    setLoading(false);
    if (!loc) { alert(t('panel.weatherLocError')); return; }
    return fetchWeatherAt(loc.lat, loc.lon, loc.place);
  };

  const wd = config.weatherData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        <button onClick={() => onToggle(id)} style={{ ...btnStyle(isActive), flex: 1 }}>{label}</button>
        <button onClick={fetchWeather} disabled={loading} title={t('panel.weatherCircuitTitle')} style={{ backgroundColor: colors.bgInput, color: colors.yellow, border: `1px solid ${colors.border}`, cursor: 'pointer', padding: '0 10px', boxShadow: '0 2px 0 rgba(0,0,0,0.55)' }}>
          <Icon name={loading ? 'hourglass_top' : 'cloud'} size="1.5em" />
        </button>
        <button onClick={fetchWeatherHere} disabled={loading} title={t('panel.weatherHereTitle')} style={{ backgroundColor: colors.bgInput, color: colors.yellow, border: `1px solid ${colors.border}`, cursor: 'pointer', padding: '0 10px', boxShadow: '0 2px 0 rgba(0,0,0,0.55)' }}>
          <Icon name="location_on" size="1.5em" />
        </button>
      </div>
      <div style={{ ...inputStyle, textTransform: 'none', cursor: 'default', display: 'flex', alignItems: 'center', minHeight: '32px' }}>
        {wd ? (
          <span style={{ fontSize: '10px' }}>
            {Math.round(wd.temp)}°C · ST {wd.feelsLike !== null ? Math.round(wd.feelsLike) + '°' : '-'} · <Icon name="air" /> {wd.windSpeed !== undefined ? Math.round(wd.windSpeed) : '-'}km/h · <Icon name="water_drop" /> {wd.humidity !== null ? Math.round(wd.humidity) + '%' : '-'} · <Icon name="rainy" /> {wd.precipProb !== null ? Math.round(wd.precipProb) + '%' : '-'}{wd.place ? <> · <Icon name="location_on" /> {wd.place}</> : ''}
          </span>
        ) : (
          <span style={{ color: colors.textMuted, fontSize: '10px' }}>{t('panel.weatherNoData')}</span>
        )}
      </div>
    </div>
  );
};

// Debe quedar idéntico al defaultPositions de main.cjs (ahí vive la copia que se usa
// para sembrar posiciones.json en el primer arranque).
export const defaultPositions = {
  relator: { x: 380, y: 935, scale: 1 }, comentarista: { x: 380, y: 860, scale: 1 }, notero1: { x: 380, y: 785, scale: 1 },
  notero2: { x: 380, y: 710, scale: 1 }, circuito: { x: 380, y: 635, scale: 1 }, clima: { x: 380, y: 520, scale: 1 },
  ticker: { x: 0, y: 1020, scale: 1 }, grid: { x: 320, y: 180, scale: 1 }, finalResults: { x: 395, y: 190, scale: 1 },
  tower: { x: 20, y: 20, scale: 1 }, winner: { x: 680, y: 800, scale: 1 }, flags: { x: 640, y: 30, scale: 1 },
  fastestLap: { x: 1440, y: 110, scale: 1 }, battle: { x: 730, y: 140, scale: 1 }, customZocalo: { x: 380, y: 420, scale: 1 },
  votingQR: { x: 20, y: 745, scale: 1 }, votingResults: { x: 1440, y: 655, scale: 1 }, lapCounter: { x: 1740, y: 20, scale: 1 },
  virtualChamp: { x: 1440, y: 235, scale: 1 }, pitStop: { x: 850, y: 900, scale: 1 },
  startingLights: { x: 775, y: 470, scale: 1 }, lapTimesHistory: { x: 950, y: 350, scale: 1 },
  trackAlert: { x: 950, y: 610, scale: 1 }, penaltyAlert: { x: 950, y: 500, scale: 1 },
  driverInfo: { x: 380, y: 335, scale: 1 },
  branding: { x: 1640, y: 900, scale: 1 }
};

const GRAPHIC_IDS = [
  'relator', 'comentarista', 'notero1', 'notero2', 'circuito', 'clima', 'ticker', 'tower',
  'grid', 'finalResults', 'winner', 'flags', 'fastestLap', 'driverInfo', 'battle', 'customZocalo',
  'votingQR', 'votingResults', 'lapCounter', 'virtualChamp', 'startingLights',
  'lapTimesHistory', 'trackAlert', 'penaltyAlert', 'branding'
];

const TAB_IDS = ['panel', 'campeonato', 'votaciones', 'sanciones', 'cloud', 'zocalos', 'disenos', 'circuito', 'ajustes', 'personalizar', 'editor', 'manual'];

export default function ControlPanel() {
  const [config, setConfig] = useState({
    relator: '', comentarista: '', notero1: '', notero2: '', circuito: '', clima: '', speedhiveCode: '', chromaColor: '#00FF00', logo: null, blackFlagNumber: '', categoryLogo: null,
    zocalos: Array(6).fill({ title: '', text: '' })
  });

  const language = config.language || 'es';
  const t = useMemo(() => createTranslator(language), [language]);
  const setLanguage = (lang) => handleDirectSave('language', lang);

  const [showBattle, setShowBattle] = useState(false);
  const [battleTarget, setBattleTarget] = useState(1);
  const [positions, setPositions] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({});

  const [activeTab, setActiveTab] = useState('panel');
  const [showTicker, setShowTicker] = useState(false);
  const [showTower, setShowTower] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [activeDriverInfo, setActiveDriverInfo] = useState(null);
  const [showWinner, setShowWinner] = useState(false);
  const [showFastestLap, setShowFastestLap] = useState(false);
  const [activeFlags, setActiveFlags] = useState(NO_FLAGS);
  const [graphics, setGraphics] = useState({ relator: false, comentarista: false, notero1: false, notero2: false, circuito: false, clima: false });
  const [showLapCounter, setShowLapCounter] = useState(false);
  const panelContainerRef = useRef(null);
  const panelButtonsRef = useRef(null);
  const [panelSplitDrag, setPanelSplitDrag] = useState(null); // tamaño provisorio (px) mientras se arrastra el divisor
  const [showVirtualChamp, setShowVirtualChamp] = useState(false);
  const [championship, setChampionship] = useState([]);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [activeZocaloIndex, setActiveZocaloIndex] = useState(null);
  const [showLapTimesHistory, setShowLapTimesHistory] = useState(false);
  const [selectedCurveId, setSelectedCurveId] = useState(null);
  const [trackAlertType, setTrackAlertType] = useState('yellow');
  const [trackAlertVisible, setTrackAlertVisible] = useState(false); // la alerta de curva está al aire
  const [selectedLapTimesDriver, setSelectedLapTimesDriver] = useState(null);
  const [autoScrape, setAutoScrape] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapeError, setScrapeError] = useState(null);
  const scrapeErrorKeys = {
    SCRAPER_NO_BROWSER: 'panel.scrapeErrNoBrowser',
    SCRAPER_LAUNCH_FAILED: 'panel.scrapeErrLaunchFailed',
    SCRAPER_NAV_FAILED: 'panel.scrapeErrNavFailed',
    SCRAPER_RACE_NOT_LIVE: 'panel.scrapeErrRaceNotLive',
    NO_DRIVERS: 'panel.scrapeErrNoDrivers'
  };
  const scrapeErrorText = scrapeError
    ? t(scrapeErrorKeys[scrapeError.code] || 'panel.scrapeErrGeneric') + (scrapeError.message && scrapeError.code !== 'NO_DRIVERS' ? ` (${scrapeError.message})` : '')
    : '';
  const configRef = useRef(config);
  const activeFlagsRef = useRef(null);      // espejo de activeFlags para leerlo desde el scraper sin closures viejas
  const lastRmFlagRef = useRef(null);       // último estado de pista que informó Race Monitor ('green', 'yellow', 'red'...)
  const autoFlagRef = useRef(null);         // bandera que puso el modo automático ('red' | 'tricolor'), null si la puso el operador
  const isScrapingRef = useRef(false);

  const [newRecordAlert, setNewRecordAlert] = useState(false);
  const bestLapRef = useRef(Infinity);
  const recordTimeoutRef = useRef(null);
  const autoHideFastestLapRef = useRef(null);

  const [showVotingQR, setShowVotingQR] = useState(false);
  const [showVotingResults, setShowVotingResults] = useState(false);
  const [localIp, setLocalIp] = useState('');

  const [votes, setVotes] = useState({});

  // --- NUEVO: SEMÁFORO DE LARGADA ---
  const [startingLightsVisible, setStartingLightsVisible] = useState(false);
  const [startingLightsStep, setStartingLightsStep] = useState(0);

  // --- NUEVO: SANCIONES / BAJO INVESTIGACIÓN (COMISARIOS DEPORTIVOS) ---
  const [penaltyDriverNumber, setPenaltyDriverNumber] = useState('');
  const [penaltyType, setPenaltyType] = useState('investigation'); // 'investigation' | 'penalty'
  const [penaltyReason, setPenaltyReason] = useState('');
  const [penaltyAutoHideSeconds, setPenaltyAutoHideSeconds] = useState(10);
  const [penaltyAlertState, setPenaltyAlertState] = useState({ isVisible: false, driverNumber: null, driverName: '', type: 'investigation', reason: '' });

  // --- NUEVO: SERVIDOR CLOUD (overlayracing.site) — tokens del evento activo ---
  const [cloudQrToken, setCloudQrToken] = useState('');
  const [cloudComisarioToken, setCloudComisarioToken] = useState('');
  const [cloudConnected, setCloudConnected] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSavedFlash, setCloudSavedFlash] = useState(false);

  // --- NUEVO: ESTADO DEL TÚNEL DE VOTACIÓN (para avisar cuando el QR ya es escaneable) ---
  const isTunnelReady = typeof localIp === 'string' && localIp.trim() !== '';
  // El panel de comisarios comparte el mismo túnel público que la votación: mismo dominio, distinto path.
  const stewardUrl = isTunnelReady ? localIp.replace('/votar', '/comisarios') : '';

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { activeFlagsRef.current = activeFlags; }, [activeFlags]);

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
      ipcRenderer.invoke('get-votes').then(v => { if (v) setVotes(v) }).catch(() => { });
      ipcRenderer.invoke('get-championship').then(data => { if (data) setChampionship(data); }).catch(() => { });

      // Restaura si el semáforo o una sanción ya estaban corriendo al abrir/reabrir el panel
      ipcRenderer.invoke('get-initial-state').then(state => {
        const sl = state?.broadcastState?.startingLights;
        if (sl) { setStartingLightsVisible(sl.isVisible); setStartingLightsStep(sl.step); }
        setTrackAlertVisible(!!state?.broadcastState?.trackAlert?.isVisible);
        const pa = state?.broadcastState?.penaltyAlert;
        if (pa) setPenaltyAlertState(pa);
      }).catch(() => { });

      // Carga los tokens del evento cloud ya guardados (si los hay) y el estado de conexión actual
      ipcRenderer.invoke('get-cloud-config').then(cloudData => {
        setCloudQrToken(cloudData?.qrToken || '');
        setCloudComisarioToken(cloudData?.comisarioToken || '');
        setCloudConnected(!!cloudData?.connected);
      }).catch(() => { });

      const handleUpdateIp = (event, newIp) => setLocalIp(newIp);
      const handleUpdateVotes = (event, newVotes) => setVotes(newVotes);
      const handleStartingLights = (event, data) => {
        if (data) { setStartingLightsVisible(data.isVisible); setStartingLightsStep(data.step); }
      };
      const handleUpdatePenalty = (event, data) => { if (data) setPenaltyAlertState(data); };
      const handleUpdateTrackAlert = (event, data) => { if (data) setTrackAlertVisible(!!data.isVisible); };
      const handleCloudStatus = (event, data) => { if (data) setCloudConnected(!!data.connected); };
      const handleUpdateChampionship = (event, data) => { if (data) setChampionship(data); };

      ipcRenderer.on('update-votes', handleUpdateVotes);
      ipcRenderer.on('update-ip', handleUpdateIp);
      ipcRenderer.on('update-starting-lights', handleStartingLights);
      ipcRenderer.on('update-penalty', handleUpdatePenalty);
      ipcRenderer.on('update-track-alert', handleUpdateTrackAlert);
      ipcRenderer.on('cloud-status', handleCloudStatus);
      ipcRenderer.on('update-championship', handleUpdateChampionship);

      return () => {
        ipcRenderer.removeListener('update-votes', handleUpdateVotes);
        ipcRenderer.removeListener('update-ip', handleUpdateIp);
        ipcRenderer.removeListener('update-starting-lights', handleStartingLights);
        ipcRenderer.removeListener('update-penalty', handleUpdatePenalty);
        ipcRenderer.removeListener('update-track-alert', handleUpdateTrackAlert);
        ipcRenderer.removeListener('cloud-status', handleCloudStatus);
        ipcRenderer.removeListener('update-championship', handleUpdateChampionship);
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

        // --- NUEVO: mostrar automáticamente la gráfica de récord de vuelta ---
        setShowFastestLap(true);
        if (ipcRenderer) ipcRenderer.send('toggle-fastest-lap', true);
        if (autoHideFastestLapRef.current) clearTimeout(autoHideFastestLapRef.current);
        autoHideFastestLapRef.current = setTimeout(() => {
          setShowFastestLap(false);
          if (ipcRenderer) ipcRenderer.send('toggle-fastest-lap', false);
        }, 8000); // se oculta sola a los 8s — ajustá este número a gusto
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

  const handleToggleVotingQR = () => {
    const newState = !showVotingQR;
    // Si están por ENCENDER el QR y el túnel todavía no tiene una URL válida, avisamos antes de salir al aire
    if (newState && !isTunnelReady) {
      const proceed = window.confirm(t('panel.confirmShowQrNoTunnel'));
      if (!proceed) return;
    }
    setShowVotingQR(newState);
    if (ipcRenderer) ipcRenderer.send('toggle-voting-qr', newState);
  };
  const handleToggleVotingResults = () => { const newState = !showVotingResults; setShowVotingResults(newState); if (ipcRenderer) ipcRenderer.send('toggle-voting-results', newState); };
  const handleResetVotes = () => { if (window.confirm(t('panel.confirmResetVotes'))) { if (ipcRenderer) ipcRenderer.send('reset-votes'); } };

  const handleSaveBackup = async () => {
    if (drivers.length === 0) return alert(t('panel.alertNoDataToSave'));
    if (ipcRenderer) {
      const success = await ipcRenderer.invoke('save-backup', { drivers, session: sessionInfo });
      if (success) alert(t('panel.alertSaveSuccess'));
      else alert(t('panel.alertSaveError'));
    }
  };

  const handleLoadBackup = async () => {
    if (ipcRenderer) {
      const data = await ipcRenderer.invoke('load-backup');
      if (data && data.drivers) {
        setAutoScrape(false); setDrivers(data.drivers); setSessionInfo(data.session);
        ipcRenderer.send('force-update-leaderboard', data);
        alert(t('panel.alertLoadSuccess'));
      } else alert(t('panel.alertNoSavedData'));
    }
  };

  const handleToggleFinalResults = () => { setShowFinalResults(!showFinalResults); if (ipcRenderer) ipcRenderer.send('toggle-final-results', !showFinalResults); };
  const handleToggleWinner = () => { const newState = !showWinner; setShowWinner(newState); const winnerDriver = drivers.find(d => String(d.pos) === '1') || drivers[0]; if (ipcRenderer) ipcRenderer.send('toggle-winner', { isVisible: newState, driver: winnerDriver }); };
  const handleChange = (e) => setConfig({ ...config, [e.target.name]: e.target.value });

  // Distribución de la pestaña PANEL: el orden de los bloques se resuelve con `order`, sin mover el JSX.
  const panelLayout = PANEL_LAYOUTS.includes(config.panelLayout) ? config.panelLayout : 'left';
  const panelSideBySide = panelLayout === 'left' || panelLayout === 'right';
  const panelButtonsFirst = panelLayout === 'left' || panelLayout === 'top';
  // Tamaño de la zona de botones, ajustable arrastrando el divisor (ancho si van lado a lado, alto si van apilados)
  // Apilados, el alto es automático (se ajusta al contenido) hasta que se arrastra el divisor.
  const SPLIT_MIN = panelSideBySide ? 240 : 90;
  const splitKey = panelSideBySide ? 'panelSplitSide' : 'panelSplitStack';
  const savedSplit = parseInt(config[splitKey], 10);
  const panelSplitSize = panelSplitDrag !== null ? panelSplitDrag : (savedSplit > 0 ? savedSplit : (panelSideBySide ? 350 : null));

  const handlePanelSplitMouseDown = (e) => {
    e.preventDefault();
    const container = panelContainerRef.current;
    if (!container) return;
    const startPos = panelSideBySide ? e.clientX : e.clientY;
    const zone = panelButtonsRef.current;
    const startSize = zone ? Math.round(panelSideBySide ? zone.getBoundingClientRect().width : zone.getBoundingClientRect().height) : (panelSplitSize || SPLIT_MIN);
    const max = Math.max(SPLIT_MIN, (panelSideBySide ? container.clientWidth - 320 : container.clientHeight * 0.8));
    // Si los botones están a la derecha / abajo, arrastrar hacia el otro lado los agranda
    const sign = panelButtonsFirst ? 1 : -1;
    let latest = startSize;
    const onMove = (ev) => {
      const delta = ((panelSideBySide ? ev.clientX : ev.clientY) - startPos) * sign;
      latest = Math.round(Math.min(max, Math.max(SPLIT_MIN, startSize + delta)));
      setPanelSplitDrag(latest);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setPanelSplitDrag(null);
      handleDirectSave(splitKey, latest);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const handlePanelSplitReset = () => handleDirectSave(splitKey, null);

  // Las secciones (y los botones dentro de cada una) fluyen como flex: al ensanchar la zona se acomodan
  // en más columnas y al angostarla se apilan, en vez de estirarse.
  const panelButtonsBase = {
    display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', alignContent: 'flex-start', gap: '18px 24px',
    boxSizing: 'border-box', flexShrink: 0, backgroundColor: colors.bgPanel, overflowY: 'auto', overflowX: 'hidden',
    order: panelButtonsFirst ? 0 : 2
  };
  const panelSectionStyle = { flex: '1 1 235px', minWidth: 0, maxWidth: '460px' };
  const panelSectionWideStyle = { ...panelSectionStyle, flexBasis: '300px' };
  const panelButtonsStyle = panelSideBySide
    ? {
        ...panelButtonsBase, width: `${panelSplitSize}px`, padding: '18px 15px',
        borderRight: panelLayout === 'left' ? `1px solid ${colors.border}` : 'none',
        borderLeft: panelLayout === 'right' ? `1px solid ${colors.border}` : 'none'
      }
    : {
        ...panelButtonsBase, padding: '16px 20px 14px', ...(panelSplitSize ? { height: `${panelSplitSize}px` } : {}),
        borderBottom: panelLayout === 'top' ? `1px solid ${colors.border}` : 'none',
        borderTop: panelLayout === 'bottom' ? `1px solid ${colors.border}` : 'none'
      };
  const panelTableStyle = {
    flex: panelSideBySide ? 1 : '1 0 auto', minHeight: panelSideBySide ? undefined : '320px', padding: '20px',
    overflowY: panelSideBySide ? 'auto' : 'visible', backgroundColor: colors.bgApp, position: 'relative',
    order: panelButtonsFirst ? 2 : 0
  };
  const panelDividerStyle = {
    order: 1, flexShrink: 0, boxSizing: 'border-box', zIndex: 5,
    ...(panelSideBySide
      ? { width: '8px', cursor: 'col-resize', backgroundImage: `linear-gradient(to right, transparent 3px, ${colors.border} 3px, ${colors.border} 5px, transparent 5px)` }
      : { height: '8px', cursor: 'row-resize', backgroundImage: `linear-gradient(to bottom, transparent 3px, ${colors.border} 3px, ${colors.border} 5px, transparent 5px)` }),
    backgroundColor: panelSplitDrag !== null ? colors.yellow : 'transparent'
  };
  const handleSave = async () => { if (ipcRenderer) await ipcRenderer.invoke('save-config', config); };
  const handleCommitCircuit = async (name) => { const next = { ...config, circuito: name }; setConfig(next); if (ipcRenderer) await ipcRenderer.invoke('save-config', next); };
  const handleToggleBattle = () => { const newState = !showBattle; setShowBattle(newState); if (ipcRenderer) ipcRenderer.send('toggle-battle', { isVisible: newState, pos: battleTarget }); };
  const handleToggleVirtualChamp = () => { setShowVirtualChamp(!showVirtualChamp); if (ipcRenderer) ipcRenderer.send('toggle-virtual-champ', !showVirtualChamp); };
  const handleToggleLapTimesHistory = () => {
    const newState = !showLapTimesHistory;
    setShowLapTimesHistory(newState);
    if (ipcRenderer) ipcRenderer.send('toggle-lap-times-history', newState);

    // El botón del panel siempre muestra la comparativa de TODOS los pilotos: limpiamos cualquier foco activo
    if (newState) {
      setSelectedLapTimesDriver(null);
      if (ipcRenderer) ipcRenderer.send('set-lap-times-focus', null);
    }
  };

  const handleToggleLapTimesSelect = (driver) => {
    const newSelection = selectedLapTimesDriver === driver.number ? null : driver.number;
    setSelectedLapTimesDriver(newSelection);
    if (ipcRenderer) ipcRenderer.send('set-lap-times-focus', newSelection);
    if (newSelection) {
      setShowLapTimesHistory(true);
      if (ipcRenderer) ipcRenderer.send('toggle-lap-times-history', true);
    } else {
      setShowLapTimesHistory(false);
      if (ipcRenderer) ipcRenderer.send('toggle-lap-times-history', false);
    }
  };

  const handleResetLapTimesHistory = () => { if (window.confirm(t('panel.confirmResetLapTimes'))) { if (ipcRenderer) ipcRenderer.send('reset-lap-times-history'); } };
  const handleStartLights = () => { if (ipcRenderer) ipcRenderer.send('starting-lights-action', 'start'); };
  const handleGoLights = () => { if (ipcRenderer) ipcRenderer.send('starting-lights-action', 'go'); };
  const handleHideLights = () => { if (ipcRenderer) ipcRenderer.send('starting-lights-action', 'hide'); };
  const handleToggleDriverInfo = (driver) => {
    if (activeDriverInfo && activeDriverInfo.number === driver.number) {
      setActiveDriverInfo(null); if (ipcRenderer) ipcRenderer.send('toggle-driver-info', { isVisible: false, driver: null });
    } else {
      setActiveDriverInfo(driver); if (ipcRenderer) ipcRenderer.send('toggle-driver-info', { isVisible: true, driver });
    }
  };

  // key puede ser un objeto { clave: valor, ... } para guardar varias claves juntas
  const handleDirectSave = async (key, value) => {
    const patch = key !== null && typeof key === 'object' ? key : { [key]: value };
    const newConfig = { ...config, ...patch };
    setConfig(newConfig);
    if (ipcRenderer) await ipcRenderer.invoke('save-config', newConfig);
  };

  const handleUpdatePositions = async (newPositions, shouldSaveToDisk) => {
    setPositions(newPositions);
    if (shouldSaveToDisk) { if (ipcRenderer) await ipcRenderer.invoke('save-positions', newPositions); }
    else { if (ipcRenderer) ipcRenderer.send('preview-positions', newPositions); }
  };

  const handleScrape = async () => {
    // Devuelve 'ok' | 'error' | 'busy' | 'nocode' para que el botón de AJUSTES pueda animar el resultado
    if (isScrapingRef.current) return 'busy';
    let rawCode = configRef.current.speedhiveCode || '';
    rawCode = rawCode.trim();
    const provider = configRef.current.timingProvider || 'speedhive';

    if (!rawCode) { alert(t('panel.alertNoRaceCode')); setAutoScrape(false); return 'nocode'; }

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
    let status = 'ok';
    try {
      if (ipcRenderer) {
        const data = await ipcRenderer.invoke('scrape-timing', { provider, code: finalCode });
        if (data?.error) {
          // Se conservan los últimos datos buenos en pantalla; solo se avisa del problema
          setScrapeError(data.error);
          status = 'error';
        } else if (data && data.drivers) {
          setDrivers(data.drivers);
          if (data.session) setSessionInfo(data.session);
          handleAutoFlag(data.session?.flag);
          setScrapeError(data.drivers.length === 0 ? { code: 'NO_DRIVERS' } : null);
          if (data.drivers.length === 0) status = 'error';
        }
      }
    } catch (e) {
      console.error("Error scrapeando:", e);
      setScrapeError({ code: 'SCRAPER_ERROR', message: e?.message || '' });
      status = 'error';
    }
    isScrapingRef.current = false;
    return status;
  };

  const handleSelectCategoryLogo = async () => {
    if (ipcRenderer) {
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
      if (ipcRenderer) ipcRenderer.send('toggle-custom-zocalo', { isVisible: true, title: newZocalos[index].title, text: newZocalos[index].text });
    }
  };

  const handleToggleZocalo = (index) => {
    if (activeZocaloIndex === index) {
      setActiveZocaloIndex(null); if (ipcRenderer) ipcRenderer.send('toggle-custom-zocalo', { isVisible: false, title: '', text: '' });
    } else {
      setActiveZocaloIndex(index);
      const z = currentZocalos[index];
      if (ipcRenderer) ipcRenderer.send('toggle-custom-zocalo', { isVisible: true, title: z.title, text: z.text });
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

  const handleToggleTicker = () => { setShowTicker(!showTicker); if (ipcRenderer) ipcRenderer.send('toggle-ticker', !showTicker); };
  const handleToggleTower = () => { setShowTower(!showTower); if (ipcRenderer) ipcRenderer.send('toggle-tower', !showTower); };
  const handleToggleGrid = () => { setShowGrid(!showGrid); if (ipcRenderer) ipcRenderer.send('toggle-grid', !showGrid); };
  const handleToggleGraphic = (id) => { const newState = !graphics[id]; setGraphics({ ...graphics, [id]: newState }); if (ipcRenderer) ipcRenderer.send('toggle-graphic', { id, visible: newState }); };
  const handleSelectLogo = async () => { if (ipcRenderer) { const logoData = await ipcRenderer.invoke('select-logo'); if (logoData) handleDirectSave('logo', logoData); } };
  const handleToggleFastestLap = () => {
    setShowFastestLap(!showFastestLap);
    setNewRecordAlert(false);
    if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    if (autoHideFastestLapRef.current) clearTimeout(autoHideFastestLapRef.current);
    if (ipcRenderer) ipcRenderer.send('toggle-fastest-lap', !showFastestLap);
  };
  const handleToggleLapCounter = () => { setShowLapCounter(!showLapCounter); if (ipcRenderer) ipcRenderer.send('toggle-lap-counter', !showLapCounter); };
  const handleLoadExcel = () => {
    if (!ipcRenderer) return;
    setLoadingExcel(true);
    ipcRenderer.invoke('load-excel')
      .then(res => {
        if (!res) alert(t('campeonato.alertExcelError'));
      })
      .finally(() => setLoadingExcel(false));
  };

  const handleSaveExcelTemplate = async () => {
    if (!ipcRenderer) return;
    const saved = await ipcRenderer.invoke('save-excel-template', language);
    if (saved === false) alert(t('campeonato.alertTemplateError'));
  };

  const applyFlags = (newFlags) => {
    activeFlagsRef.current = newFlags;
    setActiveFlags(newFlags);
    if (ipcRenderer) ipcRenderer.send('toggle-flag', newFlags);
  };

  const handleToggleFlag = (type) => {
    const newFlags = { ...NO_FLAGS };
    if (!activeFlags[type]) newFlags[type] = true;
    autoFlagRef.current = null; // el operador toma el control: el modo automático ya no toca esta bandera
    applyFlags(newFlags);
  };

  // BANDERAS AUTOMÁTICAS (Race Monitor): amarilla -> auto de seguridad, roja -> bandera roja, verde -> las baja.
  // Solo reacciona cuando el estado de pista CAMBIA y solo baja las banderas que puso él mismo, así no pisa
  // lo que el operador active a mano (azul, negra, cuadros) ni una bandera manual.
  const handleAutoFlag = (rawFlag) => {
    const flag = (rawFlag || '').toLowerCase();
    if (!flag || flag === lastRmFlagRef.current) return;
    lastRmFlagRef.current = flag;
    if (configRef.current.autoFlags === false) return;

    const target = flag.includes('red') ? 'red' : (flag.includes('yellow') ? 'tricolor' : null);
    if (target) {
      autoFlagRef.current = target;
      applyFlags({ ...NO_FLAGS, [target]: true });
    } else if (autoFlagRef.current) {
      const own = autoFlagRef.current;
      autoFlagRef.current = null;
      if (activeFlagsRef.current?.[own]) applyFlags({ ...NO_FLAGS });
    }
  };

  const handleSelectPhotosFolder = async () => {
    try {
      if (ipcRenderer) {
        const folderPath = await ipcRenderer.invoke('select-photos-folder');
        if (folderPath) handleDirectSave('photosPath', folderPath);
      }
    } catch (error) { console.error("Error al seleccionar carpeta:", error); }
  };

  const handleTriggerTrackAlert = () => {
    const curve = (config.trackCurves || []).find(c => c.id === selectedCurveId);
    if (!curve) { alert(t('panel.alertSelectCurveFirst')); return; }
    if (ipcRenderer) ipcRenderer.send('trigger-track-alert', { curveId: curve.id, curveName: curve.name, type: trackAlertType });
  };
  const handleHideTrackAlert = () => { if (ipcRenderer) ipcRenderer.send('hide-track-alert'); };

  // --- NUEVO: SANCIONES / BAJO INVESTIGACIÓN ---
  const handleTriggerPenalty = () => {
    const driver = drivers.find(d => String(d.number) === String(penaltyDriverNumber));
    if (!driver) { alert(t('sanciones.alertSelectDriverFirst')); return; }

    const seconds = Number(penaltyAutoHideSeconds);
    const finalSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 10;

    if (ipcRenderer) {
      ipcRenderer.send('trigger-penalty', {
        driverNumber: driver.number,
        driverName: driver.name,
        type: penaltyType,
        reason: penaltyReason,
        autoHideSeconds: finalSeconds
      });
    }
  };
  const handleHidePenalty = () => { if (ipcRenderer) ipcRenderer.send('hide-penalty'); };

  // --- DIAGNÓSTICO (AJUSTES): información del scraper y log para PCs de clientes ---
  const handleGetNetworkUrls = async () => (ipcRenderer ? ipcRenderer.invoke('get-network-urls') : []);
  const handleGetDiagnostics = async () => (ipcRenderer ? ipcRenderer.invoke('get-diagnostics') : null);
  const handleOpenLogs = () => { if (ipcRenderer) ipcRenderer.invoke('open-logs-folder'); };

  // --- NUEVO: RESTABLECER TODAS LAS POSICIONES AL LAYOUT PRECONFIGURADO ---
  const handleResetAllPositions = () => {
    if (!window.confirm(t('ajustes.confirmResetAllPositions'))) return;
    handleUpdatePositions(defaultPositions, true);
    alert(t('ajustes.alertPositionsReset'));
  };

  // --- NUEVO: COPIA DE SEGURIDAD DE LA CONFIGURACIÓN (database.json + posiciones.json) ---
  const handleExportSettings = async () => {
    if (!ipcRenderer) return;
    const ok = await ipcRenderer.invoke('export-settings');
    alert(ok ? t('ajustes.alertExportSuccess') : t('ajustes.alertExportError'));
  };

  const handleImportSettings = async () => {
    if (!ipcRenderer) return;
    if (!window.confirm(t('ajustes.confirmImportSettings'))) return;
    const result = await ipcRenderer.invoke('import-settings');
    if (!result) { alert(t('ajustes.alertImportNothing')); return; }

    if (result.config) setConfig({ chromaColor: '#00FF00', zocalos: Array(6).fill({ title: '', text: '' }), ...result.config });
    if (result.positions) setPositions(result.positions);

    if (result.imported.config && result.imported.positions) alert(t('ajustes.alertImportBoth'));
    else if (result.imported.config) alert(t('ajustes.alertImportConfigOnly'));
    else alert(t('ajustes.alertImportPositionsOnly'));
  };

  // --- NUEVO: GUARDAR TOKENS DEL SERVIDOR CLOUD ---
  const handleSaveCloudConfig = async () => {
    setCloudSaving(true);
    try {
      if (ipcRenderer) {
        const ok = await ipcRenderer.invoke('save-cloud-config', {
          qrToken: cloudQrToken?.trim() || '',
          comisarioToken: cloudComisarioToken?.trim() || ''
        });
        if (ok) {
          setCloudSavedFlash(true);
          setTimeout(() => setCloudSavedFlash(false), 2000);
        } else {
          alert(t('cloud.alertSaveTokensError'));
        }
      }
    } catch (e) {
      console.error('Error guardando config cloud:', e);
      alert(t('cloud.alertSaveTokensCatchError'));
    }
    setCloudSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: colors.bgApp, color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes pulseRecordAlert {
          0% { background-color: #e74c3c !important; border-color: #c0392b !important; box-shadow: 0 0 15px rgba(231, 76, 60, 0.8) !important; color: white !important; }
          50% { background-color: #c0392b !important; border-color: #922b21 !important; box-shadow: none !important; color: white !important; }
          100% { background-color: #e74c3c !important; border-color: #c0392b !important; box-shadow: 0 0 15px rgba(231, 76, 60, 0.8) !important; color: white !important; }
        }
        @keyframes pulseStartingLights {
          0% { box-shadow: 0 0 15px rgba(255, 34, 0, 0.6) !important; }
          50% { box-shadow: none !important; }
          100% { box-shadow: 0 0 15px rgba(255, 34, 0, 0.6) !important; }
        }
        @keyframes pulseTunnelDot {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        @keyframes pulsePenaltyDot {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>

      <SystemMonitor t={t} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '15px', height: '15px', backgroundColor: colors.yellow }}></div>
          <h1 style={{ fontSize: '16px', margin: 0, letterSpacing: '1px' }}>{t('header.title')}</h1>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>

          {fastestDriver && fastestDriver.bestLap !== '-' && (
            <div style={{ textAlign: 'right', borderRight: `1px solid ${colors.border}`, paddingRight: '20px' }}>
              <div style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>
                {t('header.bestLap')} {newRecordAlert && <Icon name="local_fire_department" color={colors.red} />}
              </div>
              <div style={{ fontSize: '14px', color: newRecordAlert ? colors.red : colors.yellow, fontWeight: 'bold', transition: 'color 0.3s' }}>
                #{fastestDriver.number} {fastestDriver.name.toUpperCase()} <span style={{ color: colors.textMain, marginLeft: '5px' }}>{fastestDriver.bestLap}</span>
              </div>
            </div>
          )}

          {sessionInfo?.laps && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>{t('header.laps')}</div>
              <div style={{ fontSize: '14px', color: colors.textMain, fontWeight: 'bold' }}>{sessionInfo.laps}</div>
            </div>
          )}
          {sessionInfo?.totalTime && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '1px' }}>{t('header.totalTime')}</div>
              <div style={{ fontSize: '14px', color: colors.textMain, fontWeight: 'bold' }}>{sessionInfo.totalTime}</div>
            </div>
          )}
          <div style={{ border: `1px solid ${autoScrape ? colors.green : colors.textMuted}`, color: autoScrape ? colors.green : colors.textMuted, backgroundColor: autoScrape ? 'rgba(46, 204, 113, 0.1)' : 'transparent', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', letterSpacing: '1px', marginLeft: '10px' }}>
            {autoScrape ? t.i('header.live') : t('header.paused')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', flexShrink: 0, borderBottom: `1px solid ${colors.border}` }}>
        {TAB_IDS.map(tabId => (
          <div key={tabId} onClick={() => setActiveTab(tabId)} style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, borderBottom: activeTab === tabId ? `3px solid ${colors.textMain}` : '3px solid transparent', color: activeTab === tabId ? colors.textMain : colors.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {t(`tabs.${tabId}`)}
            {tabId === 'sanciones' && penaltyAlertState.isVisible && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: colors.red, animation: 'pulsePenaltyDot 1s infinite' }} />
            )}
            {tabId === 'cloud' && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: cloudConnected ? colors.green : colors.textMuted }} />
            )}
          </div>
        ))}
      </div>

      {activeTab === 'panel' && (
        <div ref={panelContainerRef} style={{ display: 'flex', flexDirection: panelSideBySide ? 'row' : 'column', flex: 1, overflow: panelSideBySide ? 'hidden' : 'auto' }}>
          <style>{`.panel-section > :last-child { margin-bottom: 0 !important; }`}</style>
          <div ref={panelButtonsRef} style={panelButtonsStyle}>
            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('panel.flagsSection')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '5px', marginBottom: '20px' }}>
              <button onClick={() => handleToggleFlag('red')} style={{ ...btnStyle(activeFlags.red), backgroundColor: activeFlags.red ? '#e74c3c' : colors.bgInput, color: activeFlags.red ? '#fff' : colors.textMain, borderColor: activeFlags.red ? '#c0392b' : colors.border }}><Icon name="flag" color={activeFlags.red ? '#fff' : '#e74c3c'} />{t('panel.flagRed')}</button>
              <button onClick={() => handleToggleFlag('tricolor')} style={{ ...btnStyle(activeFlags.tricolor), background: activeFlags.tricolor ? 'linear-gradient(90deg, #0033a0, #fff, #ff8200)' : colors.bgInput, color: activeFlags.tricolor ? '#000' : colors.textMain, textShadow: activeFlags.tricolor ? '0 0 3px #fff' : 'none' }}><Icon name="flag" color={activeFlags.tricolor ? '#000' : '#f1c40f'} />{t('panel.flagTricolor')}</button>
              <button onClick={() => handleToggleFlag('blue')} style={{ ...btnStyle(activeFlags.blue), backgroundColor: activeFlags.blue ? '#3498db' : colors.bgInput, color: activeFlags.blue ? '#fff' : colors.textMain, borderColor: activeFlags.blue ? '#2980b9' : colors.border }}><Icon name="flag" color={activeFlags.blue ? '#fff' : '#3498db'} />{t('panel.flagBlue')}</button>
              <button onClick={() => handleToggleFlag('green')} style={{ ...btnStyle(activeFlags.green, 'rgba(39,174,96,0.55)'), backgroundColor: activeFlags.green ? '#27ae60' : colors.bgInput, color: activeFlags.green ? '#fff' : colors.textMain, borderColor: activeFlags.green ? '#1e8449' : colors.border }}><Icon name="flag" color={activeFlags.green ? '#fff' : '#2ecc71'} />{t('panel.flagGreen')}</button>
              <button
                onClick={() => handleToggleFlag('checkered')}
                style={{
                  ...btnStyle(activeFlags.checkered),
                  backgroundImage: activeFlags.checkered ? `url(${banderaCuadrosImg})` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  backgroundColor: activeFlags.checkered ? undefined : colors.bgInput,
                  color: '#fff',
                  textShadow: activeFlags.checkered ? '0 0 4px #000, 0 0 6px #000' : 'none',
                  fontWeight: 'bold'
                }}
              >
                <Icon name="sports_score" />{t('panel.flagCheckered')}
              </button>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={() => handleToggleFlag('black')} style={{ ...btnStyle(activeFlags.black), flex: 1, backgroundColor: activeFlags.black ? '#111' : colors.bgInput, color: activeFlags.black ? '#fff' : colors.textMain, borderColor: activeFlags.black ? '#000' : colors.border, padding: '12px 5px' }}><Icon name="flag" color={activeFlags.black ? '#fff' : '#bbb'} />{t('panel.flagBlack')}</button>
                <input name="blackFlagNumber" value={config.blackFlagNumber || ''} onChange={(e) => handleDirectSave('blackFlagNumber', e.target.value)} style={{ ...inputStyle, width: '45px', textAlign: 'center', padding: '0', fontSize: '14px' }} placeholder={t('panel.flagNumberPlaceholder')} title={t('panel.flagNumberTitle')} />
              </div>
              <label title={t('panel.autoFlagsHint')} style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMuted, cursor: 'pointer' }}>
                <input type="checkbox" checked={config.autoFlags !== false} onChange={(e) => handleDirectSave('autoFlags', e.target.checked)} />
                {t('panel.autoFlags')}
              </label>
            </div>
            </div>

            <div className="panel-section" style={panelSectionWideStyle}>
            <div style={sectionTitleStyle}>{t('panel.personalSection')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              <GraphicControl id="relator" label={t('graphics.relator')} value={config.relator} isActive={graphics.relator} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} t={t} />
              <GraphicControl id="comentarista" label={t('graphics.comentarista')} value={config.comentarista} isActive={graphics.comentarista} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} t={t} />
              <GraphicControl id="notero1" label={t('graphics.notero1')} value={config.notero1} isActive={graphics.notero1} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} t={t} />
              <GraphicControl id="notero2" label={t('graphics.notero2')} value={config.notero2} isActive={graphics.notero2} onChange={handleChange} onBlur={handleSave} onToggle={handleToggleGraphic} t={t} />
              <SearchSelectControl id="circuito" label={t('graphics.circuito')} value={config.circuito} options={circuitosData} isActive={graphics.circuito} onChange={(v) => setConfig({ ...config, circuito: v })} onCommit={handleCommitCircuit} onToggle={handleToggleGraphic} t={t} />
              <WeatherControl id="clima" label={t('graphics.clima')} config={config} setConfig={setConfig} isActive={graphics.clima} onToggle={handleToggleGraphic} t={t} />
            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('graphics.trackAlert')}</div>
<div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
  <select
    value={selectedCurveId || ''}
    onChange={(e) => setSelectedCurveId(e.target.value || null)}
    style={{ ...inputStyle, padding: '10px', fontSize: '11px', cursor: 'pointer' }}
  >
    <option value="">{t('common.selectCurvePlaceholder')}</option>
    {(config.trackCurves || []).map(c => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))}
  </select>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
    <button
      onClick={() => setTrackAlertType('yellow')}
      style={{ ...btnStyle(trackAlertType === 'yellow'), backgroundColor: trackAlertType === 'yellow' ? '#f1c40f' : colors.bgInput, color: trackAlertType === 'yellow' ? '#000' : colors.textMain }}
    >{t.i('panel.trackAlertYellow')}</button>
    <button
      onClick={() => setTrackAlertType('incident')}
      style={{ ...btnStyle(trackAlertType === 'incident'), backgroundColor: trackAlertType === 'incident' ? '#e74c3c' : colors.bgInput, color: '#fff' }}
    >{t.i('panel.trackAlertIncident')}</button>
  </div>
  <div style={{ display: 'flex', gap: '5px' }}>
    <button onClick={handleTriggerTrackAlert} style={{ ...btnStyle(trackAlertVisible, 'rgba(46,204,113,0.6)'), flex: 2, backgroundColor: trackAlertVisible ? '#1e8449' : '#2ecc71', color: '#fff', borderColor: '#27ae60' }}>
      {t.i('panel.emitAlert')}
    </button>
    <button onClick={handleHideTrackAlert} style={{ ...btnStyle(false), flex: 1, backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c' }}>
      {t('common.hide')}
    </button>
  </div>
</div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('panel.gridSection')}</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
              <button onClick={() => { if (ipcRenderer) ipcRenderer.send('grid-prev'); }} style={{ ...btnStyle(), flex: 1 }}>{t.i('panel.gridPrev')}</button>
              <button onClick={handleToggleGrid} style={{ ...btnStyle(showGrid), flex: 2 }}>{t('panel.showGrid')}</button>
              <button onClick={() => { if (ipcRenderer) ipcRenderer.send('grid-next'); }} style={{ ...btnStyle(), flex: 1 }}>{t.i('panel.gridNext')}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px' }}>
              <button onClick={() => setAutoScrape(!autoScrape)} style={{ ...btnStyle(autoScrape), color: autoScrape ? '#000' : colors.green, borderColor: autoScrape ? colors.yellow : colors.green }}>
                {autoScrape ? t.i('panel.autoScrapeStop') : t.i('panel.autoScrapeStart')}
              </button>
            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('graphics.startingLights')}</div>
            <StartingLightsIndicator visible={startingLightsVisible} step={startingLightsStep} t={t} />
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              {startingLightsStep === 5 ? (
                <button
                  onClick={handleGoLights}
                  style={{ ...btnStyle(true), flex: 2, backgroundColor: '#2ecc71', color: '#fff', borderColor: '#27ae60', animation: 'pulseStartingLights 0.8s infinite' }}
                >
                  {t.i('panel.lightsGo')}
                </button>
              ) : (
                <button
                  onClick={handleStartLights}
                  disabled={startingLightsVisible}
                  style={{
                    ...btnStyle(startingLightsVisible), flex: 2,
                    backgroundColor: startingLightsVisible && startingLightsStep < 6 ? '#ff2200' : '#2ecc71',
                    color: '#fff',
                    borderColor: startingLightsVisible ? '#c0392b' : '#27ae60',
                    cursor: startingLightsVisible ? 'default' : 'pointer', opacity: 1
                  }}
                >
                  {startingLightsVisible ? (startingLightsStep >= 6 ? t('panel.lightsGreen') : t.i('panel.lightsCounting', { step: startingLightsStep })) : t.i('panel.lightsStart')}
                </button>
              )}
              <button onClick={handleHideLights} style={{ ...btnStyle(false), flex: 1, backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c' }}>
                {t('common.hide')}
              </button>
            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('panel.graphicsSection')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '5px' }}>
              <button onClick={handleToggleTicker} style={btnStyle(showTicker)}>{t('graphics.ticker')}</button>
              <button onClick={handleToggleTower} style={btnStyle(showTower)}>{t('panel.towerShort')}</button>
              <button onClick={handleToggleLapCounter} style={btnStyle(showLapCounter)}>{t('panel.lapsShort')}</button>
              <button
                onClick={handleToggleFastestLap}
                style={{
                  ...btnStyle(showFastestLap),
                  ...(newRecordAlert ? { animation: 'pulseRecordAlert 1s infinite' } : {})
                }}
              >
                {t('panel.recordLapShort')}
              </button>

            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('graphics.branding')}</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
              <button onClick={() => handleToggleGraphic('branding')} style={{ ...btnStyle(!!graphics.branding), flex: 1 }}>
                {graphics.branding ? t('panel.hideBranding') : t('panel.showBranding')}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))', gap: '5px', marginBottom: '8px' }}>
              {['both', 'producer', 'category'].map(opt => (
                <button key={opt} onClick={() => handleDirectSave('brandingShow', opt)} style={{ ...btnStyle((config.brandingShow || 'both') === opt), padding: '8px 4px', fontSize: '10px' }}>
                  {t(`panel.branding_${opt}`)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '10px', color: (config.logo || config.categoryLogo) ? colors.textMuted : '#e67e22', marginBottom: '15px' }}>
              {(config.logo || config.categoryLogo) ? t('panel.brandingNote', { tab: t('tabs.personalizar') }) : t.i('panel.brandingNoLogos', { tab: t('tabs.personalizar') })}
            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('panel.battleSection')}</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, padding: '0 10px', borderRadius: '4px' }}>
                <span style={{ color: colors.textMuted, fontSize: '12px', marginRight: '5px' }}>{t('panel.posLabel')}</span>
                <input
                  type="number" min="1" value={battleTarget}
                  onChange={(e) => setBattleTarget(e.target.value)}
                  style={{ ...inputStyle, width: '40px', border: 'none', padding: 0 }}
                />
              </div>
              <button onClick={handleToggleBattle} style={{ ...btnStyle(showBattle), flex: 1 }}>
                {showBattle ? t('panel.hideBattle') : t('panel.showBattle')}
              </button>
            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('graphics.virtualChamp')}</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <button onClick={handleToggleVirtualChamp} style={{ ...btnStyle(showVirtualChamp), flex: 1 }}>
                {showVirtualChamp ? t('panel.hideChampTable') : t('panel.showChampTable')}
              </button>
            </div>
            <div style={{ fontSize: '10px', color: colors.textMuted, marginTop: '-10px', marginBottom: '15px' }}>
              {t('panel.champNote', { tab: t('tabs.campeonato') })}
            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('graphics.lapTimesHistory')}</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <button onClick={handleToggleLapTimesHistory} style={{ ...btnStyle(showLapTimesHistory), flex: 2 }}>
                {showLapTimesHistory ? t('panel.hideChart') : t('panel.showChart')}
              </button>
              <button onClick={handleResetLapTimesHistory} style={{ ...btnStyle(false), flex: 1, backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c' }}>
                {t.i('panel.resetShort')}
              </button>
            </div>
            {selectedLapTimesDriver && (
              <div style={{ fontSize: '10px', color: '#00b8cc', fontWeight: 'bold', marginTop: '-8px', marginBottom: '15px' }}>
                {t.i('panel.lapTimesFocusNote', { number: selectedLapTimesDriver })}
              </div>
            )}
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('panel.votingSection')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: isTunnelReady ? colors.green : colors.yellow,
                display: 'inline-block',
                animation: isTunnelReady ? 'none' : 'pulseTunnelDot 1.2s infinite'
              }} />
              <span style={{ fontSize: '9px', color: colors.textMuted, fontWeight: 'bold', letterSpacing: '0.5px' }}>
                {isTunnelReady ? t('panel.tunnelReady') : t('panel.tunnelGenerating')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
              <button onClick={handleToggleVotingQR} style={btnStyle(showVotingQR)}>{t('graphics.votingQR')}</button>
              <button onClick={handleToggleVotingResults} style={btnStyle(showVotingResults)}>{t('panel.votingResultsLive')}</button>
            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('panel.backupSection')}</div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <button onClick={handleSaveBackup} style={{ ...btnStyle(), flex: 1, backgroundColor: '#8e44ad', color: '#fff', borderColor: '#9b59b6' }}>
                {t.i('panel.saveCurrent')}
              </button>
              <button onClick={handleLoadBackup} style={{ ...btnStyle(), flex: 1, backgroundColor: '#d35400', color: '#fff', borderColor: '#e67e22' }}>
                {t.i('panel.loadSaved')}
              </button>
            </div>
            </div>

            <div className="panel-section" style={panelSectionStyle}>
            <div style={sectionTitleStyle}>{t('panel.closingSection')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => { if (ipcRenderer) ipcRenderer.send('final-results-prev'); }} title={t('panel.finalPrevTitle')} style={{ ...btnStyle(), flex: 1 }}>{t.i('panel.gridPrev')}</button>
                <button onClick={handleToggleFinalResults} style={{ ...btnStyle(showFinalResults), flex: 2 }}>{t('panel.finalResultBtn')}</button>
                <button onClick={() => { if (ipcRenderer) ipcRenderer.send('final-results-next'); }} title={t('panel.finalNextTitle')} style={{ ...btnStyle(), flex: 1 }}>{t.i('panel.gridNext')}</button>
              </div>
              <label title={t('panel.finalAutoPageHint')} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: colors.textMuted, cursor: 'pointer' }}>
                <input type="checkbox" checked={config.finalResultsAutoPage !== false} onChange={(e) => handleDirectSave('finalResultsAutoPage', e.target.checked)} />
                {t('panel.finalAutoPage')}
              </label>
              <button onClick={handleToggleWinner} style={btnStyle(showWinner)}>{t('panel.showWinnerBtn')}</button>
            </div>
            </div>
          </div>

          {panelSplitDrag !== null && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: panelSideBySide ? 'col-resize' : 'row-resize', userSelect: 'none' }} />
          )}
          <div
            onMouseDown={handlePanelSplitMouseDown}
            onDoubleClick={handlePanelSplitReset}
            title={t('panel.splitTitle')}
            style={panelDividerStyle}
          />

          <div style={panelTableStyle}>
            {autoScrape && (
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '3px',
                backgroundColor: colors.green, width: `${scrapeProgress}%`,
                boxShadow: `0 0 10px ${colors.green}`, transition: scrapeProgress === 0 ? 'none' : 'width 10ms linear', zIndex: 10
              }} />
            )}
            {scrapeError && (
              <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', border: `1px solid ${colors.red}`, borderRadius: '6px', padding: '12px 16px', marginBottom: '15px', color: colors.red, fontSize: '12px', fontWeight: 'bold', lineHeight: '1.5', wordBreak: 'break-word' }}>
                <Icon name="warning" color="#f1c40f" /> {scrapeErrorText}
              </div>
            )}
            <DriversTable
              drivers={drivers}
              colors={colors}
              activeDriverNumber={activeDriverInfo?.number}
              onToggleInfo={handleToggleDriverInfo}
              selectedLapTimesNumber={selectedLapTimesDriver}
              onToggleLapTimesSelect={handleToggleLapTimesSelect}
              t={t}
            />
          </div>
        </div>
      )}

      {activeTab === 'campeonato' && (
        <div style={{ padding: '30px', flex: 1, backgroundColor: colors.bgApp, overflowY: 'auto' }}>

          <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t.i('campeonato.title')}</span>
            <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: 'normal' }}>
              {t('campeonato.driversLoaded')} <span style={{ color: colors.textMain, fontWeight: 'bold' }}>{championship.length}</span>
            </span>
          </h2>

          <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '20px', maxWidth: '700px' }}>
            {t('campeonato.description')}
          </p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
            <button
              onClick={handleLoadExcel}
              disabled={loadingExcel}
              style={{ ...btnStyle(false), width: 'auto', padding: '12px 20px', backgroundColor: '#2ecc71', color: 'white', borderColor: '#27ae60', cursor: loadingExcel ? 'wait' : 'pointer', opacity: loadingExcel ? 0.7 : 1 }}
            >
              {loadingExcel ? t.i('campeonato.loadingExcelBtn') : t.i('campeonato.loadExcelBtn')}
            </button>
            <button onClick={handleSaveExcelTemplate} style={{ ...btnStyle(false), width: 'auto', padding: '12px 20px' }}>
              {t.i('campeonato.templateBtn')}
            </button>
            <button onClick={handleToggleVirtualChamp} style={{ ...btnStyle(showVirtualChamp), width: 'auto', padding: '12px 20px' }}>
              {showVirtualChamp ? t('panel.hideChampTable') : t('panel.showChampTable')}
            </button>
          </div>

          {championship.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, fontStyle: 'italic', backgroundColor: colors.bgPanel, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
              {t('campeonato.emptyState', { btn: t.i('campeonato.loadExcelBtn') })}
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto', backgroundColor: colors.bgPanel, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: colors.bgInput, color: colors.textMuted, borderBottom: `2px solid ${colors.border}` }}>
                    <th style={{ padding: '12px 10px' }}>{t('campeonato.colPos')}</th>
                    <th style={{ padding: '12px 10px' }}>{t('campeonato.colNum')}</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left' }}>{t('campeonato.colDriver')}</th>
                    <th style={{ padding: '12px 10px' }}>{t('campeonato.colBasePoints')}</th>
                    <th style={{ padding: '12px 10px' }}>{t('campeonato.colThisRace')}</th>
                    <th style={{ padding: '12px 10px' }}>{t('campeonato.colTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {championship.map((d, index) => (
                    <tr key={d.number || index} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: index === 0 ? 'rgba(243, 156, 18, 0.1)' : 'transparent' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: index === 0 ? colors.yellow : colors.textMain }}>{d.livePos}</td>
                      <td style={{ padding: '10px', color: colors.textMuted }}>{d.number}</td>
                      <td style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: colors.textMain, textTransform: 'uppercase' }}>{d.name}</td>
                      <td style={{ padding: '10px', color: colors.textMuted }}>{d.basePoints}</td>
                      <td style={{ padding: '10px', color: d.added > 0 ? colors.green : colors.textMuted, fontWeight: d.added > 0 ? 'bold' : 'normal' }}>
                        {d.added > 0 ? `+${d.added}` : '-'}
                      </td>
                      <td style={{ padding: '10px', color: colors.textMain, fontWeight: 'bold', fontSize: '14px' }}>{d.livePoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'votaciones' && (
        <div style={{ padding: '30px', flex: 1, backgroundColor: colors.bgApp, overflowY: 'auto' }}>

          <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t.i('votaciones.title')}</span>
            <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: 'normal' }}>
              {t('votaciones.totalVotes')} <span style={{ color: colors.textMain, fontWeight: 'bold' }}>{Object.values(votes).reduce((a, b) => a + b, 0)}</span>
            </span>
          </h2>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            backgroundColor: isTunnelReady ? 'rgba(46, 204, 113, 0.1)' : 'rgba(241, 196, 15, 0.1)',
            border: `1px solid ${isTunnelReady ? colors.green : colors.yellow}`,
            borderRadius: '6px', padding: '14px 18px', marginBottom: '25px'
          }}>
            <span style={{ fontSize: '22px', animation: isTunnelReady ? 'none' : 'pulseTunnelDot 1.2s infinite' }}>
              {isTunnelReady ? <Icon name="check_circle" color={colors.green} size="1.1em" /> : <Icon name="hourglass_top" color={colors.yellow} size="1.1em" />}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: isTunnelReady ? colors.green : colors.yellow, letterSpacing: '0.5px' }}>
                {isTunnelReady ? t('votaciones.tunnelReadyMsg') : t('votaciones.tunnelGeneratingMsg')}
              </span>
              <span style={{ fontSize: '11px', color: colors.textMuted, wordBreak: 'break-all' }}>
                {isTunnelReady ? localIp : t('votaciones.waitingUrl')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <button onClick={handleToggleVotingQR} style={{ ...btnStyle(showVotingQR), flex: 1 }}>{showVotingQR ? t('votaciones.hideQr') : t('votaciones.showQr')}</button>
            <button onClick={handleToggleVotingResults} style={{ ...btnStyle(showVotingResults), flex: 1 }}>{showVotingResults ? t('votaciones.hideResults') : t('votaciones.showResults')}</button>
            <button onClick={handleResetVotes} style={{ ...btnStyle(), backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c', flex: 1 }}>{t.i('votaciones.resetVotesBtn')}</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(() => {
              const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
              const topDrivers = [...drivers]
                .filter(d => votes[d.number] > 0)
                .sort((a, b) => (votes[b.number] || 0) - (votes[a.number] || 0));

              if (topDrivers.length === 0) {
                return <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, fontStyle: 'italic' }}>{t('votaciones.noVotesYet')}</div>;
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
                      {voteCount} {t('votaciones.votesSuffix')}
                    </div>

                  </div>
                );
              });
            })()}
          </div>

          <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: '35px', paddingTop: '30px' }}>
            <VoteHistory votes={votes} drivers={drivers} sessionInfo={sessionInfo} language={language} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} t={t} />
          </div>
        </div>
      )}

      {activeTab === 'sanciones' && (
        <div style={{ padding: '30px', flex: 1, backgroundColor: colors.bgApp, overflowY: 'auto' }}>

          <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>
            {t.i('sanciones.title')}
          </h2>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '25px', maxWidth: '700px' }}>
            {t('sanciones.description')}
          </p>

          <div style={{
            display: 'flex', gap: '20px', alignItems: 'center',
            backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`,
            borderRadius: '8px', padding: '18px 20px', marginBottom: '25px', maxWidth: '700px'
          }}>
            {isTunnelReady && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(stewardUrl)}`}
                alt="QR panel de comisarios"
                style={{ width: '110px', height: '110px', borderRadius: '6px', flexShrink: 0, backgroundColor: '#fff', padding: '5px' }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: isTunnelReady ? colors.green : colors.yellow,
                  display: 'inline-block',
                  animation: isTunnelReady ? 'none' : 'pulseTunnelDot 1.2s infinite'
                }} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: isTunnelReady ? colors.green : colors.yellow, letterSpacing: '0.5px' }}>
                  {isTunnelReady ? t('sanciones.stewardPanelReady') : t('sanciones.tunnelGenerating')}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: colors.textMain, wordBreak: 'break-all' }}>
                {isTunnelReady ? stewardUrl : t('sanciones.waitingUrl')}
              </span>
              <span style={{ fontSize: '11px', color: colors.textMuted }}>
                {t('sanciones.shareNote', { tab: t('tabs.cloud') })}
              </span>
              {isTunnelReady && (
                <button
                  onClick={() => { navigator.clipboard?.writeText(stewardUrl); }}
                  style={{ ...btnStyle(false), width: 'fit-content', padding: '6px 14px', fontSize: '10px', marginTop: '4px' }}
                >
                  {t.i('sanciones.copyLink')}
                </button>
              )}
            </div>
          </div>

          {penaltyAlertState.isVisible && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              backgroundColor: penaltyAlertState.type === 'investigation' ? 'rgba(241, 196, 15, 0.1)' : 'rgba(231, 76, 60, 0.1)',
              border: `1px solid ${penaltyAlertState.type === 'investigation' ? colors.yellow : colors.red}`,
              borderRadius: '6px', padding: '14px 18px', marginBottom: '25px', maxWidth: '700px'
            }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colors.red, animation: 'pulsePenaltyDot 1s infinite', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px', color: penaltyAlertState.type === 'investigation' ? colors.yellow : colors.red }}>
                  {t('sanciones.onAir', { number: penaltyAlertState.driverNumber, name: penaltyAlertState.driverName, type: penaltyAlertState.type === 'investigation' ? t('sanciones.typeInvestigation') : t('sanciones.typePenalty') })}
                </div>
                {penaltyAlertState.reason && (
                  <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '3px' }}>{penaltyAlertState.reason}</div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '700px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('sanciones.driverLabel')}</label>
              <select value={penaltyDriverNumber} onChange={(e) => setPenaltyDriverNumber(e.target.value)} style={{ ...inputStyle, padding: '10px', cursor: 'pointer' }}>
                <option value="">{t('common.selectDriverPlaceholder')}</option>
                {drivers.map(d => (
                  <option key={d.number} value={d.number}>#{d.number} — {d.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('sanciones.typeLabel')}</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => setPenaltyType('investigation')}
                  style={{ ...btnStyle(penaltyType === 'investigation'), flex: 1, backgroundColor: penaltyType === 'investigation' ? colors.yellow : colors.bgInput, color: penaltyType === 'investigation' ? '#000' : colors.textMain }}
                >
                  {t.i('sanciones.investigationBtn')}
                </button>
                <button
                  onClick={() => setPenaltyType('penalty')}
                  style={{ ...btnStyle(penaltyType === 'penalty'), flex: 1, backgroundColor: penaltyType === 'penalty' ? colors.red : colors.bgInput, color: '#fff', borderColor: penaltyType === 'penalty' ? '#c0392b' : colors.border }}
                >
                  {t.i('sanciones.penaltyBtn')}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '700px', marginBottom: '15px' }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('sanciones.reasonLabel')}</label>
            <textarea
              value={penaltyReason}
              onChange={(e) => setPenaltyReason(e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '13px', textTransform: 'none', minHeight: '80px', resize: 'vertical' }}
              placeholder={t('sanciones.reasonPlaceholder')}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '700px', marginBottom: '25px' }}>
            <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              {t('sanciones.autoHideLabel')}
            </label>
            <input
              type="number" min="3" max="120"
              value={penaltyAutoHideSeconds}
              onChange={(e) => setPenaltyAutoHideSeconds(e.target.value)}
              style={{ ...inputStyle, width: '70px', textAlign: 'center' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', maxWidth: '700px' }}>
            <button onClick={handleTriggerPenalty} style={{ ...btnStyle(penaltyAlertState.isVisible, 'rgba(46,204,113,0.6)'), flex: 2, backgroundColor: penaltyAlertState.isVisible ? '#1e8449' : '#2ecc71', color: '#fff', borderColor: '#27ae60', padding: '14px' }}>
              {t.i('sanciones.emitBtn')}
            </button>
            <button onClick={handleHidePenalty} style={{ ...btnStyle(false), flex: 1, backgroundColor: '#c0392b', color: '#fff', borderColor: '#e74c3c', padding: '14px' }}>
              {t('common.hide')}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'cloud' && (
        <div style={{ padding: '30px', flex: 1, backgroundColor: colors.bgApp, overflowY: 'auto' }}>

          <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>
            {t.i('cloud.title')}
          </h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: cloudConnected ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
            border: `1px solid ${cloudConnected ? colors.green : colors.red}`,
            borderRadius: '6px', padding: '14px 18px', marginBottom: '25px', maxWidth: '700px'
          }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cloudConnected ? colors.green : colors.red, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px', color: cloudConnected ? colors.green : colors.red }}>
              {cloudConnected ? t('cloud.connected') : t('cloud.disconnected')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>
                {t('cloud.qrTokenLabel')}
              </label>
              <input
                type="text"
                value={cloudQrToken}
                onChange={(e) => setCloudQrToken(e.target.value)}
                style={{ ...inputStyle, padding: '10px', fontSize: '13px', textTransform: 'none' }}
                placeholder={t('cloud.qrTokenPlaceholder')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>
                {t('cloud.stewardTokenLabel')}
              </label>
              <input
                type="text"
                value={cloudComisarioToken}
                onChange={(e) => setCloudComisarioToken(e.target.value)}
                style={{ ...inputStyle, padding: '10px', fontSize: '13px', textTransform: 'none' }}
                placeholder={t('cloud.stewardTokenPlaceholder')}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleSaveCloudConfig}
                disabled={cloudSaving}
                style={{ ...btnStyle(false), flex: 1, backgroundColor: '#2ecc71', color: '#fff', borderColor: '#27ae60', padding: '14px' }}
              >
                {cloudSaving ? t('cloud.saving') : t.i('cloud.saveBtn')}
              </button>
              {cloudSavedFlash && (
                <span style={{ fontSize: '12px', color: colors.green, fontWeight: 'bold' }}>{t.i('cloud.savedFlash')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ajustes' && (
        <SettingsPanel config={config} handleDirectSave={handleDirectSave} handleScrape={handleScrape} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} t={t} language={language} setLanguage={setLanguage} onExportSettings={handleExportSettings} onImportSettings={handleImportSettings} onResetAllPositions={handleResetAllPositions} scrapeErrorText={scrapeErrorText} onGetNetworkUrls={handleGetNetworkUrls} onGetDiagnostics={handleGetDiagnostics} onOpenLogs={handleOpenLogs} />
      )}

      {activeTab === 'personalizar' && (
        <CustomizePanel drivers={drivers} sessionInfo={sessionInfo} config={config} positions={positions} defaultPositions={defaultPositions} onUpdatePositions={handleUpdatePositions} onSelectLogo={handleSelectLogo} onSelectCategoryLogo={handleSelectCategoryLogo} onSelectPhotosFolder={handleSelectPhotosFolder} onClearLogo={() => handleDirectSave('logo', null)} onClearCategoryLogo={() => handleDirectSave('categoryLogo', null)} onClearPhotosFolder={() => handleDirectSave('photosPath', null)} onConfigChange={handleDirectSave} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} t={t} />
      )}

      {activeTab === 'editor' && (
        <GraphicEditor drivers={drivers} sessionInfo={sessionInfo} config={config} positions={positions} onConfigChange={handleDirectSave} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} t={t} />
      )}

      {activeTab === 'circuito' && (
        <TrackMapPanel config={config} onConfigChange={handleDirectSave} colors={colors} inputStyle={inputStyle} btnStyle={btnStyle} t={t} />
      )}

      {activeTab === 'manual' && (
        <UserManual colors={colors} t={t} language={language} />
      )}

      {activeTab === 'zocalos' && (
        <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', overflowY: 'auto', flex: 1 }}>
          {currentZocalos.map((zocalo, index) => (
            <div key={index} style={{ backgroundColor: colors.bgPanel, padding: '20px', borderRadius: '8px', border: `1px solid ${activeZocaloIndex === index ? colors.red : colors.border}`, display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: activeZocaloIndex === index ? `0 0 15px rgba(231, 76, 60, 0.2)` : 'none' }}>
              <h3 style={{ margin: 0, color: colors.yellow, fontSize: '13px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}> {t('zocalos.presetTitle', { n: index + 1 })} </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('zocalos.titleLabel')}</label>
                <input type="text" value={zocalo.title} onChange={(e) => handleZocaloChange(index, 'title', e.target.value)} onBlur={handleSave} style={{ ...inputStyle, fontSize: '12px', padding: '10px' }} placeholder={t('zocalos.titlePlaceholder')} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                <label style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 'bold' }}>{t('zocalos.textLabel')}</label>
                <textarea value={zocalo.text} onChange={(e) => handleZocaloChange(index, 'text', e.target.value)} onBlur={handleSave} style={{ ...inputStyle, fontSize: '14px', padding: '10px', flex: 1, minHeight: '80px', resize: 'vertical' }} placeholder={t('zocalos.textPlaceholder')} />
              </div>
              <button onClick={() => handleToggleZocalo(index)} style={{ ...btnStyle(activeZocaloIndex === index), padding: '12px', fontSize: '13px', marginTop: '5px', backgroundColor: activeZocaloIndex === index ? colors.red : colors.bgInput, color: activeZocaloIndex === index ? '#fff' : colors.textMain, borderColor: activeZocaloIndex === index ? colors.red : colors.border }}>
                {activeZocaloIndex === index ? t.i('zocalos.removeFromAir') : t.i('zocalos.putOnAir')}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'disenos' && (
        <div style={{ padding: '30px', overflowY: 'auto', flex: 1, backgroundColor: colors.bgApp, display: 'block' }}>
          <h2 style={{ color: colors.yellow, marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>{t('disenos.title')}</h2>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '25px' }}>
            {t('disenos.description')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {GRAPHIC_IDS.map(graphicId => {
              const graphicLabel = t(`graphics.${graphicId}`);
              const configKey = `design_${graphicId}`;
              const hasDesign = !!config[configKey];
              return (
                <div key={graphicId} style={{ backgroundColor: colors.bgPanel, padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: colors.textMain, fontWeight: 'bold', textAlign: 'center' }}>{graphicLabel}</span>
                  <div style={{ backgroundColor: '#000', height: '80px', borderRadius: '4px', border: `1px dashed ${hasDesign ? colors.green : colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {hasDesign ? <img src={config[configKey]} alt={graphicLabel} style={{ maxHeight: '70px', maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{ fontSize: '10px', color: '#444' }}>{t('disenos.standardDesign')}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={async () => { if (ipcRenderer) { const imgData = await ipcRenderer.invoke('select-design-image', graphicLabel); if (imgData) handleDirectSave(configKey, imgData); } }} style={{ ...btnStyle(false), flex: 1, padding: '8px', fontSize: '10px' }}>{t.i('disenos.loadBtn')}</button>
                    {hasDesign && <button onClick={() => handleDirectSave(configKey, null)} style={{ ...btnStyle(false), flex: 1, backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '8px', fontSize: '10px' }}>{t.i('common.removeBtn')}</button>}
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
