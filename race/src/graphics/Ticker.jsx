import { useState, useEffect } from 'react';
import { DriverFlag } from '../components/CountryFlag';
import { getSkinStyle } from '../utils/skinStyles';
import MarqueeText from './MarqueeText';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import { getCanvasSize } from '../utils/canvasSize';
import { usePositionTrends, getPositionArrow, getClassColor, ARROW_COLORS, withCategory } from '../utils/raceVisuals';
import BrandLogo from '../components/BrandLogo';
import DriverPhoto from '../components/DriverPhoto';
import { photosEnabled } from '../utils/photos';
import { useSuitColors } from '../utils/suitColor';
import { makeFx } from '../utils/contentAnim';
import { ChangeTick, ChangeSweep } from '../components/ChangeAnim';
import FlagSwatch from '../components/FlagSwatch';
import { currentFlag, sessionProgress } from '../utils/flagState';
import { getSlimPalette, textOnColor, ELITE_FONT } from '../utils/elite';

const PODIUM_COLORS = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };

// Dónde va el bloque de datos (nombre de la categoría / carrera, vueltas y tiempo) — config.tickerInfoPos
const TICKER_INFO_POSITIONS = ['auto', 'split', 'left', 'right', 'topLeft', 'topCenter', 'topRight', 'top', 'hidden'];
// Lugar por defecto de cada modelo ('auto')
const DEFAULT_INFO_POS = { tab: 'topLeft', capsules: 'left', twoRows: 'top' };
// Tiempo que se ve debajo del nombre de cada piloto — config.tickerTimeField
const TICKER_TIME_FIELDS = ['lastLap', 'bestLap', 'diff', 'totalTime', 'none'];

// Nombre que va en la placa de la tira: la categoría escrita / detectada más la sesión (sin repetir la categoría)
function tickerTitle(config, id) {
  return withCategory(config, id, config?.eventName || config?.campeonato || '');
}

export default function Ticker({ drivers, isVisible, config, id = 'ticker', sessionInfo }) {
  const tickerFormat = config?.tickerFormat || 'standard';
  // MULTICLASE: antes de los pilotos pasan los líderes de cada clase
  const multiclass = !!sessionInfo?.multiclass && config?.tickerClassLeaders !== false;
  const classes = sessionInfo?.classes || [];
  const classLeaders = multiclass ? classes.map(cls => drivers.find(d => d.cls === cls && d.classLeader)).filter(Boolean).map(d => ({ ...d, isClassLeaderItem: true })) : [];
  const loopItems = [...classLeaders, ...drivers];
  const tickerItems = [...loopItems, ...loopItems];
  const animationDuration = loopItems.length > 0 ? loopItems.length * 4.5 : 0;

  // Flechas de avance / descenso: respecto de la largada (si hay grilla) o del último cambio de posición
  const liveTrends = usePositionTrends(drivers);
  // Color del número tomado del traje (foto del piloto), si está activado en PILOTOS
  const suit = useSuitColors(drivers, config);
  const sc = (n) => (suit[String(n)] ? { backgroundColor: suit[String(n)].bg, color: suit[String(n)].text } : {});
  const arrowMode = config?.tickerArrows || 'start';
  const renderArrow = (driver, fontSize) => {
    const arrow = getPositionArrow(driver, liveTrends, arrowMode);
    const visible = !!arrow && arrow.dir !== 'same';
    return (
      <span style={{ display: visible ? 'inline-block' : 'none', color: arrow ? ARROW_COLORS[arrow.dir] : 'transparent', fontWeight: '900', fontSize, lineHeight: 1, whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'center' }}>
        {arrow ? `${arrow.dir === 'up' ? '▲' : '▼'}${arrow.n ? arrow.n : ''}` : ''}
      </span>
    );
  };
  const pos = config?.positions?.[id] || { x: 0, y: 1000, scale: 1 };

  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#bdc3c7';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#888888';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#3498db';

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide'
  const animDur = getAnimDuration(config, id);
  const fx = makeFx(config, id, isVisible, 0.25);

  const isCompact = tickerFormat === 'compact';
  const isPodium = tickerFormat === 'podium';
  const isSpotlight = tickerFormat === 'spotlight';
  const isBoard = tickerFormat === 'board';
  const isTab = tickerFormat === 'tab';
  const isCapsules = tickerFormat === 'capsules';
  const isSlimBoard = tickerFormat === 'slimBoard';
  const skin = getSkinStyle(tickerFormat, { themeMain, themeAccent });
  // Nombre del evento / sesión (si es largo, se desplaza dentro de su placa)
  const eventName = tickerTitle(config, id);
  const barHeight = isSpotlight ? '110px' : (isCompact || isTab ? '46px' : (isCapsules ? '50px' : (hasCustomBg ? '80px' : '60px')));

  // DATOS DE LA TIRA (qué se muestra y dónde)
  const rawInfoPos = TICKER_INFO_POSITIONS.includes(config?.tickerInfoPos) ? config.tickerInfoPos : 'auto';
  const infoPos = rawInfoPos === 'auto' ? (DEFAULT_INFO_POS[tickerFormat] || 'split') : rawInfoPos;
  const showEvent = config?.tickerShowEvent !== false && !!eventName;
  const showLaps = config?.tickerShowLaps !== false;
  const showTime = config?.tickerShowTime !== false;
  const timeField = TICKER_TIME_FIELDS.includes(config?.tickerTimeField) ? config.tickerTimeField : 'lastLap';
  const timeLabel = { lastLap: 'ÚLT. VUELTA', bestLap: 'MEJOR VUELTA', diff: 'DIFERENCIA', totalTime: 'TIEMPO', none: '' }[timeField];
  const driverTime = (d) => {
    if (timeField === 'none') return '';
    const v = d?.[timeField];
    if (timeField === 'diff' && String(d?.pos) === '1') return 'LÍDER';
    return v && v !== '-' ? v : '';
  };
  const laps = sessionInfo?.laps || '-';
  const totalTime = sessionInfo?.totalTime || '-';
  const showPhotos = photosEnabled(config, id);
  // Bandera vigente (la del PANEL o la del cronometraje): se ve en el bloque de datos de todos los formatos
  const flag = currentFlag(sessionInfo, config);
  // Vuelta / total y tiempo restante, si la fuente los informa (Race Monitor, Speedhive)
  const prog = sessionProgress(sessionInfo);
  const lapsOf = prog.total !== null ? `/${prog.total}` : '';
  const timeTitle = prog.timeToGo ? 'RESTA' : 'TIEMPO';
  const timeShownValue = prog.timeToGo || totalTime;

  // Rotación automática para el formato "Spotlight" (un piloto a la vez, en grande)
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  useEffect(() => {
    if (!isSpotlight || drivers.length === 0) return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % drivers.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isSpotlight, drivers.length]);
  const spotlightDriver = drivers.length > 0 ? drivers[spotlightIndex % drivers.length] : null;

  // Rotación automática para el formato "Board" (tabla de 12 posiciones, pasa de página si hay más pilotos)
  const BOARD_PER_PAGE = 12;
  const [boardPage, setBoardPage] = useState(0);
  // Sin formato tabla o con una sola página, vuelve a la primera (ajuste durante el render, sin efecto en cascada)
  const boardSinglePage = !(isBoard || isSlimBoard) || drivers.length <= BOARD_PER_PAGE;
  if (boardSinglePage && boardPage !== 0) setBoardPage(0);
  useEffect(() => {
    if (boardSinglePage) return undefined;
    const totalPages = Math.ceil(drivers.length / BOARD_PER_PAGE);
    const interval = setInterval(() => setBoardPage(prev => (prev + 1) % totalPages), 8000);
    return () => clearInterval(interval);
  }, [boardSinglePage, drivers.length]);

  // Animación de entrada (La tira inferior suele deslizar desde abajo hacia arriba)
  let transformHidden = `scale(${pos.scale}) translateY(60px)`;
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`;
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  // FORMATO BOARD: tabla de 3 columnas x 4 filas (12 posiciones fijas a la vez), estilo TC —
  // el puntero muestra el tiempo total en una placa roja, el resto la diferencia en una placa verde.
  if (isBoard) {
    const COLS = 3, ROWS = 4;
    const perPage = COLS * ROWS;
    const totalPages = Math.max(1, Math.ceil(drivers.length / perPage));
    const pageDrivers = drivers.slice(boardPage * perPage, boardPage * perPage + perPage);
    const columns = Array.from({ length: COLS }, (_, c) => pageDrivers.slice(c * ROWS, c * ROWS + ROWS));

    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transformOrigin: 'top left', zIndex: 20, width: `${getCanvasSize(config).width}px`,
        transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
        opacity: isVisible || animStyle === 'roll' ? 1 : 0,
        transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible),
        pointerEvents: isVisible ? 'auto' : 'none'
      }}>
        <div style={{
          position: 'relative', display: 'flex', width: '100%', height: '210px',
          backgroundColor: skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg),
          backgroundImage: hasCustomBg ? `url(${customBg})` : (skin?.backgroundImage || 'none'),
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: skin ? skin.border : 'none',
          borderTop: skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`),
          boxShadow: skin ? skin.boxShadow : 'none', backdropFilter: skin?.backdropFilter,
          borderRadius: bRad, overflow: 'hidden', boxSizing: 'border-box'
        }}>
          {/* PLACA DE CATEGORÍA + VUELTAS */}
          <div style={{ width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              flex: 1, backgroundColor: hasCustomBg ? 'rgba(0,0,0,0.4)' : themeMain,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', ...fx.text(0)
            }}>
              <MarqueeText
                text={eventName || 'CATEGORÍA'} align="center"
                style={{ color: '#fff', fontWeight: '900', fontSize: '20px', textTransform: 'uppercase', lineHeight: '1.3' }}
              />
            </div>
            <div style={{
              flex: 1, backgroundColor: hasCustomBg ? 'rgba(0,0,0,0.6)' : themeHeaderBg,
              borderLeft: `6px solid ${themeAccent}`, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
            }}>
              <span style={{ display: 'inline-block', color: themeNormalText, fontWeight: '900', fontSize: '30px', lineHeight: '1', ...fx.num(1) }}>
                <ChangeTick value={laps} enabled={fx.on} />{lapsOf && <span style={{ fontSize: '16px', color: themeTitleText }}>{lapsOf}</span>}
              </span>
              <span style={{ display: 'inline-block', color: themeTitleText, fontWeight: 'bold', fontSize: '11px', letterSpacing: '1px', marginTop: '2px', ...fx.text(2) }}>
                VUELTAS
              </span>
              <span style={{ display: timeShownValue !== '-' ? 'inline-block' : 'none', color: themeNormalText, fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace', marginTop: '4px', ...fx.text(3) }}>{prog.timeToGo ? `RESTA ${prog.timeToGo}` : totalTime}</span>
              <FlagSwatch flag={flag} width={8} height="100%" radius={0} style={{ position: 'absolute', right: 0, top: 0, bottom: 0 }} />
              <ChangeSweep value={laps} enabled={fx.on} />
            </div>
          </div>

          {/* GRILLA 3x4 DE POSICIONES (cada página entra con la aparición de filas configurada) */}
          <div key={boardPage} style={{ flex: 1, display: 'flex' }}>
            {columns.map((col, colIdx) => (
              <div key={colIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: colIdx < COLS - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                {col.map((driver, rowIdx) => {
                  const isLeader = String(driver.pos) === '1';
                  return (
                    <div key={rowIdx} style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px',
                      borderBottom: rowIdx < ROWS - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      ...fx.row(colIdx * ROWS + rowIdx, pageDrivers.length, 0.3)
                    }}>
                      <span style={{ color: themeNormalText, fontWeight: '900', fontSize: '18px', width: '22px', flexShrink: 0 }}>
                        {driver.pos}
                      </span>
                      <span style={{
                        flexShrink: 0, width: '34px', height: '34px', borderRadius: '50%',
                        backgroundColor: themeSecondary, color: '#000', fontWeight: '900', fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', ...sc(driver.number)
                      }}>
                        {driver.number}
                      </span>
                      <span style={{
                        flex: 1, color: themeNormalText, fontWeight: '900', fontSize: '15px', textTransform: 'uppercase',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        <DriverFlag driver={driver} config={config} id={id} height={13} style={{ marginRight: '6px' }} /><BrandLogo brand={driver.brand} config={config} size={16} style={{ marginRight: '6px' }} />{driver.name}
                      </span>
                      <span style={{
                        flexShrink: 0, minWidth: '68px', textAlign: 'center', padding: '4px 8px', borderRadius: '4px',
                        backgroundColor: isLeader ? themeMain : '#1e8449', color: '#fff', fontWeight: '900', fontSize: '13px', fontFamily: 'monospace'
                      }}>
                        {isLeader ? driver.totalTime : (driver.diff || driver.gap || '-')}
                      </span>
                      {renderArrow(driver, '13px')}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ position: 'absolute', bottom: '4px', right: '14px', fontSize: '10px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>
              {boardPage + 1}/{totalPages}
            </div>
          )}
        </div>
      </div>
    );
  }

  // FORMATO TABLERO FINO: como el tablero 3x4 pero bajito (filas de 24 px), con los colores de PERSONALIZAR > COLORES.
  // Placa izquierda: logo de la categoría (o nombre), bandera vigente, sesión, vuelta y tiempo. Si hay más de 12 pilotos
  // pasa de página sola (cada 8 s).
  if (isSlimBoard) {
    const pal = getSlimPalette(config);
    const COLS = 3, ROWS = 4, ROW_H = 24;
    const perPage = COLS * ROWS;
    const totalPages = Math.max(1, Math.ceil(drivers.length / perPage));
    const pageDrivers = drivers.slice(boardPage * perPage, boardPage * perPage + perPage);
    const columns = Array.from({ length: COLS }, (_, c) => pageDrivers.slice(c * ROWS, c * ROWS + ROWS));
    const qualifying = !!sessionInfo?.qualifying;
    const sessionLabel = qualifying ? 'CLASIFICACIÓN' : (sessionInfo?.name ? String(sessionInfo.name).split(/\s+[-–—]\s+/).pop() : 'CARRERA');
    const H = ROWS * ROW_H;
    const posBg = pal.red; const numBg = pal.accent;
    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
        transformOrigin: 'top left', zIndex: 20, width: `${getCanvasSize(config).width}px`,
        transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
        opacity: isVisible || animStyle === 'roll' ? 1 : 0,
        transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible),
        pointerEvents: isVisible ? 'auto' : 'none', fontFamily: ELITE_FONT, textTransform: 'uppercase'
      }}>
        <div style={{
          position: 'relative', display: 'flex', width: '100%', height: `${H}px`,
          backgroundColor: hasCustomBg ? 'transparent' : pal.background,
          backgroundImage: hasCustomBg ? `url(${customBg})` : 'none', backgroundSize: '100% 100%',
          borderTop: hasCustomBg ? 'none' : `3px solid ${pal.red}`, borderRadius: bRad, overflow: 'hidden', boxSizing: 'content-box',
          boxShadow: '0 -6px 20px rgba(0,0,0,0.35)'
        }}>
          {/* PLACA: categoría + bandera + sesión / vuelta / tiempo */}
          <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: hasCustomBg ? 'rgba(0,0,0,0.4)' : pal.deep }}>
            <div style={{ height: `${ROW_H * 2}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', ...fx.text(0) }}>
              {config?.categoryLogo
                ? <img src={config.categoryLogo} alt="" style={{ maxHeight: `${ROW_H * 2 - 8}px`, maxWidth: '220px', objectFit: 'contain' }} />
                : <MarqueeText text={eventName || 'CATEGORÍA'} align="center" style={{ color: pal.title, fontWeight: 800, fontSize: '18px', lineHeight: '1.2' }} />}
            </div>
            <div style={{ height: `${ROW_H * 2}px`, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', backgroundColor: pal.panel, position: 'relative', overflow: 'hidden' }}>
              {flag ? <FlagSwatch flag={flag} width={16} height={ROW_H * 2 - 12} /> : <span style={{ width: '16px', height: `${ROW_H * 2 - 12}px`, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px', flexShrink: 0 }} />}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0, flex: 1, ...fx.text(1) }}>
                <span style={{ color: pal.text, fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {flag && flag.key !== 'green' ? flag.label : sessionLabel}
                </span>
                <span style={{ display: 'flex', gap: '10px', color: pal.muted, fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {showLaps && laps !== '-' && <span>V <span style={{ color: pal.text }}><ChangeTick value={laps} enabled={fx.on} /></span>{lapsOf}</span>}
                  {showTime && <span style={{ fontFamily: ELITE_FONT }}>{prog.timeToGo ? `RESTA ${prog.timeToGo}` : totalTime}</span>}
                </span>
              </div>
              <ChangeSweep value={laps} enabled={fx.on} />
            </div>
          </div>

          {/* GRILLA 3 x 4 */}
          <div key={boardPage} style={{ flex: 1, display: 'flex', minWidth: 0 }}>
            {columns.map((col, colIdx) => (
              <div key={colIdx} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${'rgba(255,255,255,0.08)'}` }}>
                {col.map((driver, rowIdx) => {
                  const isLeader = String(driver.pos) === '1';
                  const time = isLeader ? (qualifying ? (driver.bestLap || '-') : (driver.totalTime && driver.totalTime !== '-' ? driver.totalTime : 'LÍDER')) : (driver.diff && driver.diff !== '-' ? driver.diff : (driver.gap || '-'));
                  return (
                    <div key={driver.number || rowIdx} style={{
                      height: `${ROW_H}px`, display: 'flex', alignItems: 'center', gap: '7px', paddingRight: '10px',
                      borderBottom: rowIdx < ROWS - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      ...fx.row(colIdx * ROWS + rowIdx, pageDrivers.length, 0.25)
                    }}>
                      <span style={{ width: '24px', height: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: posBg, color: textOnColor(posBg), fontSize: '13px', fontWeight: 800 }}>{driver.pos}</span>
                      <span style={{ width: '40px', flexShrink: 0, textAlign: 'center', backgroundColor: numBg, color: textOnColor(numBg), fontSize: '13px', fontWeight: 800, lineHeight: '18px', ...sc(driver.number) }}>{driver.number}</span>
                      <span style={{ flex: 1, minWidth: 0, color: pal.text, fontSize: '15px', fontWeight: 700, letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><DriverFlag driver={driver} config={config} id={id} height={13} style={{ marginRight: '6px', marginTop: '-2px' }} />{driver.name}</span>
                      <span style={{ width: '26px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}><BrandLogo brand={driver.brand} config={config} size={16} /></span>
                      {renderArrow(driver, '11px')}
                      <span style={{ minWidth: '72px', flexShrink: 0, textAlign: 'right', fontSize: '14px', fontWeight: 600, color: isLeader ? pal.cut : pal.text }}>{driver.dsq ? 'DSQ' : time}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ position: 'absolute', bottom: '3px', left: '226px', fontSize: '9px', color: pal.muted, fontWeight: 'bold', letterSpacing: '1px' }}>
              {boardPage + 1}/{totalPages}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- BLOQUES DE DATOS (nombre de la categoría / carrera, vueltas, tiempo) ----------
  const plateRadius = isCapsules ? '999px' : 0;
  const eventPlate = (key, i) => showEvent && !hasCustomBg && (
    <div key={key} style={{
      height: '100%', width: isCompact || isTab ? '220px' : '300px', flexShrink: 0, boxSizing: 'border-box', padding: '0 15px',
      backgroundColor: themeMain, borderRight: isCapsules ? 'none' : `3px solid ${themeAccent}`, zIndex: 10, borderRadius: plateRadius,
      display: 'flex', alignItems: 'center', ...fx.text(i)
    }}>
      <MarqueeText
        text={eventName} align="center"
        style={{ color: '#fff', fontWeight: '900', fontSize: isCompact || isTab ? '15px' : '19px', textTransform: 'uppercase' }}
      />
    </div>
  );
  const statsPlate = (key, i, side) => (showLaps || showTime || flag) && (
    <div key={key} style={{
      height: '100%', padding: '0 20px', position: 'relative', overflow: 'hidden', borderRadius: plateRadius,
      backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg,
      borderLeft: hasCustomBg || isCapsules || side === 'left' ? 'none' : `3px solid ${themeMain}`,
      borderRight: side === 'left' && !hasCustomBg && !isCapsules ? `3px solid ${themeMain}` : 'none',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '130px', zIndex: 10, flexShrink: 0, boxSizing: 'border-box',
      paddingLeft: flag ? '30px' : '20px', ...fx.text(i)
    }}>
      <FlagSwatch flag={flag} width={10} height="70%" style={{ position: 'absolute', left: '10px', top: '15%' }} />
      {showLaps && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: showTime ? '4px' : 0, gap: '15px' }}>
          <span style={{ color: themeTitleText, fontWeight: 'bold' }}>VUELTAS</span>
          <span style={{ color: themeNormalText, fontWeight: 'bold', fontSize: showTime ? '12px' : '20px' }}><ChangeTick value={laps} enabled={fx.on} />{lapsOf}</span>
        </div>
      )}
      {showTime && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', gap: '15px' }}>
          <span style={{ color: themeTitleText, fontWeight: 'bold' }}>{timeTitle}</span>
          <span style={{ color: themeNormalText, fontWeight: 'bold' }}>{timeShownValue}</span>
        </div>
      )}
      <ChangeSweep value={laps} enabled={fx.on} />
    </div>
  );
  // Pestaña que asoma por encima de la tira (arriba a la izquierda / centro / derecha / todo el ancho)
  const isTopInfo = ['topLeft', 'topCenter', 'topRight', 'top'].includes(infoPos);
  const hasAnyInfo = showEvent || showLaps || showTime;
  const topTab = isTopInfo && hasAnyInfo && (
    <div style={{
      position: 'absolute', bottom: '100%', marginBottom: isCapsules ? '6px' : 0,
      ...(infoPos === 'topLeft' ? { left: 0 } : infoPos === 'topRight' ? { right: 0 } : infoPos === 'topCenter' ? { left: '50%', transform: 'translateX(-50%)' } : { left: 0, right: 0 }),
      display: 'flex', alignItems: 'stretch', height: '32px', zIndex: 12, overflow: 'hidden',
      borderRadius: isCapsules ? '999px' : (infoPos === 'top' ? 0 : `${bRad} ${bRad} 0 0`),
      boxShadow: '0 -4px 14px rgba(0,0,0,0.35)', ...fx.wipe(0)
    }}>
      {showEvent && (
        <span style={{
          display: 'flex', alignItems: 'center', padding: '0 16px', backgroundColor: themeMain, color: '#fff', fontWeight: 900,
          fontSize: '15px', textTransform: 'uppercase', whiteSpace: 'nowrap', maxWidth: infoPos === 'top' ? 'none' : '520px', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: infoPos === 'top' ? 1 : 'none', letterSpacing: '0.5px'
        }}>
          <span style={{ display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', ...fx.text(1) }}>{eventName}</span>
        </span>
      )}
      {flag && <FlagSwatch flag={flag} width="auto" height="100%" radius={0} label={flag.short} fontSize={12} style={{ padding: '0 4px' }} />}
      {(showLaps || showTime) && (
        <span style={{
          position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '16px', padding: '0 16px',
          backgroundColor: themeHeaderBg, borderTop: `3px solid ${themeAccent}`, boxSizing: 'border-box', whiteSpace: 'nowrap'
        }}>
          {showLaps && (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', ...fx.text(2) }}>
              <span style={{ color: themeTitleText, fontWeight: 'bold', fontSize: '11px', letterSpacing: '1px' }}>VUELTA</span>
              <span style={{ color: themeNormalText, fontWeight: 900, fontSize: '17px' }}><ChangeTick value={laps} enabled={fx.on} />{lapsOf}</span>
            </span>
          )}
          {showTime && (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', ...fx.text(3) }}>
              <span style={{ color: themeTitleText, fontWeight: 'bold', fontSize: '11px', letterSpacing: '1px' }}>{timeTitle}</span>
              <span style={{ color: themeNormalText, fontWeight: 900, fontSize: '15px', fontFamily: 'monospace' }}>{timeShownValue}</span>
            </span>
          )}
          <ChangeSweep value={laps} enabled={fx.on} />
        </span>
      )}
    </div>
  );

  const logosBlock = !hasCustomBg && (config?.logo || config?.categoryLogo) && (
    <div style={{
      height: '100%', padding: '0 15px', backgroundColor: themeHeaderBg, borderRadius: plateRadius, flexShrink: 0,
      borderRight: isCapsules ? 'none' : `3px solid ${themeMain}`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '15px', zIndex: 10
    }}>
      {config?.logo && <img src={config.logo} alt="Productora" style={{ height: isTab || isCompact || isCapsules ? '34px' : '45px', maxWidth: '120px', objectFit: 'contain', ...fx.icon(0) }} />}
      {config?.logo && config?.categoryLogo && <div style={{ height: '35px', width: '2px', backgroundColor: 'rgba(255,255,255,0.2)' }} />}
      {config?.categoryLogo && <img src={config.categoryLogo} alt="Categoría" style={{ height: isTab || isCompact || isCapsules ? '34px' : '45px', maxWidth: '120px', objectFit: 'contain', ...fx.icon(1) }} />}
    </div>
  );

  const itemWidth = isCompact ? 220 : (isTab ? 260 : (isCapsules ? 260 : 300));
  const smallText = isCompact || isTab || isCapsules;
  const timeShown = !isCompact && timeField !== 'none';

  // Un piloto de la tira (los primeros entran con la aparición de filas configurada, como la torre)
  const renderItem = (driver, index) => {
    const entrance = index < 10 ? fx.row(index, Math.min(10, loopItems.length), 0.35) : {};
    const podiumColor = isPodium ? PODIUM_COLORS[Number(driver.pos)] : null;
    const pill = isCapsules ? {
      height: 'calc(100% - 10px)', margin: '5px 4px', borderRadius: '999px', backgroundColor: themeBg, border: `2px solid ${themeMain}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.45)', width: `${itemWidth - 8}px`
    } : {};
    if (driver.isClassLeaderItem) {
      const clsColor = getClassColor(config, driver.cls, classes);
      return (
        <div key={index} className="driver-item" style={{ gap: '10px', alignItems: 'center', boxShadow: `inset 0 -4px 0 ${clsColor}`, ...pill, ...entrance }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0, maxWidth: '45%' }}>
            <span style={{ color: themeTitleText, fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', lineHeight: 1.1 }}>LÍDER</span>
            <span style={{ color: clsColor, fontSize: smallText ? '13px' : '15px', fontWeight: '900', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>{driver.cls}</span>
          </div>
          <div style={{ backgroundColor: clsColor, color: '#000', fontWeight: '900', fontSize: smallText ? '16px' : '20px', minWidth: smallText ? '34px' : '40px', height: smallText ? '26px' : '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', flexShrink: 0, ...sc(driver.number) }}>
            {driver.number}
          </div>
          <span style={{ flex: 1, color: themeNormalText, fontSize: smallText ? '14px' : '17px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <DriverFlag driver={driver} config={config} id={id} height={smallText ? 12 : 14} style={{ marginRight: '6px', marginTop: '-2px' }} />{driver.name}
          </span>
        </div>
      );
    }
    const clsColor = multiclass && driver.cls ? getClassColor(config, driver.cls, classes) : null;
    const time = timeShown ? driverTime(driver) : '';
    return (
      <div key={index} className="driver-item" style={{ gap: '10px', boxShadow: clsColor ? `inset 0 -4px 0 ${clsColor}` : (isCapsules ? pill.boxShadow : 'none'), ...pill, ...entrance }}>
        <div style={{ color: podiumColor || (hasCustomBg ? '#fff' : themeAccent), fontWeight: '900', fontSize: smallText ? '18px' : '22px', minWidth: '25px', textAlign: 'center' }}>
          {driver.pos}
        </div>
        <div style={{
          backgroundColor: podiumColor || (hasCustomBg ? 'rgba(255,255,255,0.15)' : themeSecondary),
          color: podiumColor ? '#000' : (hasCustomBg ? '#fff' : '#000'),
          fontWeight: '900', fontSize: smallText ? '17px' : '22px', width: smallText ? '38px' : '45px', height: smallText ? '28px' : '35px', display: 'flex', flexShrink: 0,
          alignItems: 'center', justifyContent: 'center', borderRadius: isCapsules ? '999px' : '4px',
          border: hasCustomBg ? '1px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.5)', ...sc(driver.number)
        }}>
          {driver.number}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
          <span style={{ color: themeNormalText, fontSize: smallText ? '15px' : '18px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
            <DriverFlag driver={driver} config={config} id={id} height={14} style={{ marginRight: '6px' }} /><BrandLogo brand={driver.brand} config={config} size={18} style={{ marginRight: '6px' }} />{driver.name}
          </span>
          {time && (
            <span style={{ color: hasCustomBg ? '#aaaaaa' : themeNumberText, fontSize: smallText ? '12px' : '14px', fontWeight: 'bold', lineHeight: '1', fontFamily: timeField === 'lastLap' || timeField === 'bestLap' ? undefined : 'monospace' }}>
              {time}
            </span>
          )}
        </div>
        {renderArrow(driver, smallText ? '14px' : '17px')}
      </div>
    );
  };

  // Bloques de datos dentro de la tira, según el lugar elegido
  const leftInfo = [];
  const rightInfo = [];
  if (infoPos === 'split') { leftInfo.push(eventPlate('ev', 1)); rightInfo.push(statsPlate('st', 2, 'right')); }
  if (infoPos === 'left') { leftInfo.push(eventPlate('ev', 1), statsPlate('st', 2, 'left')); }
  if (infoPos === 'right') { rightInfo.push(eventPlate('ev', 1), statsPlate('st', 2, 'right')); }

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
      transformOrigin: 'top left',
      zIndex: 20, width: `${getCanvasSize(config).width}px`,
      height: barHeight,
      backgroundImage: hasCustomBg ? `url(${customBg})` : 'none',
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
      opacity: isVisible || animStyle === 'roll' ? 1 : 0,
      transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateY(0)` : transformHidden, ...getRollClip(animStyle, isVisible),
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      <style>{`
        @keyframes scrollTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { display: flex; width: max-content; animation: scrollTicker ${animationDuration}s linear infinite; }
        .driver-item {
          width: ${itemWidth}px; display: flex; align-items: center;
          border-right: ${hasCustomBg || isCapsules ? 'none' : '2px solid rgba(255, 255, 255, 0.1)'};
          padding: 0 15px; box-sizing: border-box; gap: 10px; height: 100%; flex-shrink: 0;
        }
        @keyframes spotlightFade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      {topTab}

      <div style={{
        position: 'relative',
        width: '100%', height: '100%',
        backgroundColor: isCapsules ? 'transparent' : (skin ? skin.background : (hasCustomBg ? 'transparent' : themeBg)),
        backgroundImage: isCapsules ? 'none' : skin?.backgroundImage,
        border: isCapsules ? 'none' : (skin ? skin.border : 'none'),
        borderTop: isCapsules ? 'none' : (skin ? skin.border : (hasCustomBg ? 'none' : `4px solid ${themeMain}`)),
        boxShadow: isCapsules ? 'none' : (skin ? skin.boxShadow : 'none'),
        backdropFilter: isCapsules ? 'none' : skin?.backdropFilter,
        borderRadius: isTopInfo && infoPos !== 'top' && !isCapsules ? `0 ${bRad} ${bRad} ${bRad}` : (isTopInfo && infoPos === 'top' ? `0 0 ${bRad} ${bRad}` : bRad),
        display: 'flex', alignItems: 'center', gap: isCapsules ? '6px' : 0, boxSizing: 'border-box', overflow: 'hidden'
      }}>

        {hasCustomBg && (
          <div style={{ width: '400px', height: '100%', flexShrink: 0 }}></div>
        )}

        {logosBlock}
        {leftInfo}

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', height: '100%' }}>
          {isSpotlight && spotlightDriver && (
            <div key={`spotlight-${spotlightIndex}`} style={{
              display: 'flex', alignItems: 'center', gap: '25px', padding: '0 30px', height: '100%',
              width: '100%', boxSizing: 'border-box', animation: fx.on ? 'none' : 'spotlightFade 0.4s ease forwards'
            }}>
              {showPhotos && (
                <DriverPhoto number={spotlightDriver.number} config={config} height={104} fade style={{ alignSelf: 'flex-end', ...fx.photo(0) }} />
              )}
              <div style={{
                color: hasCustomBg ? '#fff' : '#000', backgroundColor: hasCustomBg ? 'rgba(255,255,255,0.15)' : themeAccent,
                fontWeight: '900', fontSize: '42px', minWidth: '70px', height: '70px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...(fx.on ? { animation: 'caPop 0.55s cubic-bezier(0.34, 1.4, 0.5, 1) backwards' } : {})
              }}>
                {spotlightDriver.pos}
              </div>
              <div style={{
                backgroundColor: hasCustomBg ? 'rgba(255,255,255,0.15)' : themeSecondary, color: hasCustomBg ? '#fff' : '#000',
                fontWeight: '900', fontSize: '30px', width: '70px', height: '50px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: '6px', flexShrink: 0,
                border: hasCustomBg ? '1px solid rgba(255,255,255,0.2)' : '2px solid rgba(0,0,0,0.5)', ...sc(spotlightDriver.number),
                ...(fx.on ? { animation: 'caNum 0.5s ease-out 0.08s backwards' } : {})
              }}>
                {spotlightDriver.number}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
                <span style={{ display: 'block', color: themeNormalText, fontSize: '32px', fontWeight: '900', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2', ...(fx.on ? { animation: 'caRise 0.45s ease-out 0.15s backwards' } : {}) }}>
                  {spotlightDriver.name}
                </span>
                {timeField !== 'none' && (
                  <span style={{ display: 'block', color: hasCustomBg ? '#aaaaaa' : themeNumberText, fontSize: '18px', fontWeight: 'bold', lineHeight: '1', ...(fx.on ? { animation: 'caRise 0.45s ease-out 0.22s backwards' } : {}) }}>
                    {timeLabel && <span style={{ fontSize: '11px', letterSpacing: '1px', marginRight: '8px', opacity: 0.8 }}>{timeLabel}</span>}{driverTime(spotlightDriver) || '-'}
                  </span>
                )}
              </div>
              {renderArrow(spotlightDriver, '30px')}
            </div>
          )}

          {!isSpotlight && drivers.length > 0 && (
            <div className="ticker-track" style={{ height: '100%' }}>
              {tickerItems.map(renderItem)}
            </div>
          )}
        </div>

        {rightInfo}
        {/* Cambio de vuelta: un brillo cruza toda la tira */}
        {!isCapsules && <ChangeSweep value={laps} enabled={fx.on} color="rgba(255,255,255,0.18)" />}
      </div>
    </div>
  );
}
