import { Fragment, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { DriverFlag } from '../components/CountryFlag';
import { getSkinStyle } from '../utils/skinStyles';
import Icon from '../components/Icon';
import { getAnimDuration, getRollClip } from '../utils/animationTiming';
import { getClassColor, ARROW_COLORS, getCategory, FORMATION_TEXT } from '../utils/raceVisuals';
import { getElitePalette, getSlimPalette, ELITE_FONT, rgba, numberColor, textOnColor, surnameCode } from '../utils/elite';
import BrandLogo from '../components/BrandLogo';
import { useSuitColors } from '../utils/suitColor';
import { rowEntranceStyle, ROW_ANIM_CSS, towerPageRows, towerPageSeconds, towerNarrowRows } from '../utils/rowEntrance';
import { makeFx } from '../utils/contentAnim';
import { ChangeTick } from '../components/ChangeAnim';
import FlagSwatch from '../components/FlagSwatch';
import { currentFlag, sessionProgress } from '../utils/flagState';

const PODIUM_COLORS = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };
const TOWER_BOX_H = 650; // alto fijo de la caja de la torre (sin el espacio onboard)
const PAGE_FADE_MS = 350; // salida de la tanda que se va antes de que entre la siguiente

// Alto del espacio onboard: el elegido en el PANEL (px, para la torre de 320 px de ancho) o 16:9 del ancho de la torre
const onboardHeight = (config, towerWidth) => {
  const h = parseInt(config?.towerOnboardHeight, 10);
  return Math.round((Number.isFinite(h) && h >= 40 && h <= 600 ? h : 180) * towerWidth / 320);
};

// onboard: número del piloto debajo del cual se abre un espacio negro para poner encima la cámara onboard desde otro
// programa (vMix, OBS). Con config.towerOnboardLock (por defecto) el espacio queda en la fila donde se abrió aunque el
// piloto cambie de posición, para que la cámara puesta encima no quede desalineada.
// formationLap: la gráfica VUELTA DE FORMACIÓN está al aire; con config.formationLapInTower (por defecto) la torre lo muestra
// en el encabezado.
export default function TimingTower({ drivers, config, isVisible, id = 'tower', sessionInfo, onboard = null, formationLap = false }) {
  const towerFormat = config?.towerFormat || 'standard';
  const isCompact = towerFormat === 'compact';
  const isPodium = towerFormat === 'podium';
  const isMinimal = towerFormat === 'minimal';

  const TOWER_ROW_HEIGHT = (isCompact || isMinimal) ? 34 : 45;
  const pos = config?.positions?.[id] || { x: 20, y: 20, scale: 1 };

  const prevDriversRef = useRef({});
  // Color del número tomado del traje (foto del piloto), si está activado en PILOTOS
  const suit = useSuitColors(drivers, config);
  const sc = (n) => (suit[String(n)] ? { backgroundColor: suit[String(n)].bg, color: suit[String(n)].text } : {});
  const [trends, setTrends] = useState({});

  const themeBg = config?.themeBg || 'rgba(0, 0, 0, 0.85)';
  const themeHeaderBg = config?.themeHeaderBg || '#000000';
  const themeMain = config?.themeMain || '#e74c3c';
  const themeSecondary = config?.themeSecondary || '#3498db';
  const themeAccent = config?.themeAccent || '#f39c12';
  const themeTitleText = config?.themeTitleText || '#ffcc00';
  const themeNormalText = config?.themeNormalText || '#ffffff';
  const themeNumberText = config?.themeNumberText || '#3498db';
  const skin = getSkinStyle(towerFormat, { themeMain, themeAccent });

  // MULTICLASE: color de clase en cada fila y, si se eligió una clase en el panel, sólo esa clase con su posición en la clase
  const multiclass = !!sessionInfo?.multiclass;
  const classes = sessionInfo?.classes || [];
  const classFilter = multiclass && classes.includes(config?.towerClassFilter) ? config.towerClassFilter : '';
  const shownDrivers = classFilter ? drivers.filter(d => d.cls === classFilter) : drivers;
  const showGains = config?.towerShowGains !== false;
  const headerCategory = [getCategory(config, id), classFilter].filter(Boolean).join(' · ');
  const showFormation = !!formationLap && config?.formationLapInTower !== false;

  // --- PILOTOS QUE NO ENTRAN ---
  // La caja mide TOWER_BOX_H: se mide cuántas filas entran debajo del encabezado (en las angostas, que crecen a lo
  // alto, es el máximo elegido en PERSONALIZAR). Si hay más pilotos, las últimas
  // `pageSize` filas se van reemplazando por los que faltan (ej.: 20 pilotos y 15 filas -> 11-15, después 16-20), con
  // el mismo efecto de aparición de filas elegido para la torre. La última tanda muestra siempre los últimos de la
  // tabla, así queda completa.
  const isNarrow = towerFormat === 'elite' || towerFormat === 'slim';
  const rowsRef = useRef(null);
  const customBgKey = config?.[`design_${id}`];
  const [rowsArea, setRowsArea] = useState(0);
  useLayoutEffect(() => {
    const el = rowsRef.current;
    if (!el) return;
    setRowsArea(TOWER_BOX_H - el.offsetTop);
  }, [towerFormat, isVisible, sessionInfo?.name, headerCategory, showFormation, config?.logo, config?.categoryLogo, customBgKey, TOWER_ROW_HEIGHT]);
  const capacity = isNarrow ? towerNarrowRows(config) : (rowsArea > 0 ? Math.max(1, Math.floor(rowsArea / TOWER_ROW_HEIGHT)) : Infinity);
  const paging = shownDrivers.length > capacity && capacity >= 2;
  const pageSize = paging ? Math.min(towerPageRows(config), capacity - 1) : 1;
  const fixedCount = paging ? capacity - pageSize : shownDrivers.length;
  const pageCount = paging ? Math.ceil((shownDrivers.length - fixedCount) / pageSize) : 1;

  // n: tanda actual (contador, va en la key para que cada tanda nueva vuelva a hacer la entrada);
  // leaving: la tanda actual se está yendo; rotated: ya pasó al menos una tanda desde que salió al aire.
  const [pager, setPager] = useState({ n: 0, leaving: false, rotated: false });
  const [wasVisible, setWasVisible] = useState(isVisible);
  if (wasVisible !== isVisible) {
    setWasVisible(isVisible);
    if (isVisible) setPager({ n: 0, leaving: false, rotated: false });
  }

  // --- CÁMARA ONBOARD ---
  // Se recuerda el último piloto y la fila donde se abrió, así el espacio se cierra con animación en el mismo lugar
  const liveIndex = onboard ? shownDrivers.findIndex(d => String(d.number) === String(onboard)) : -1;
  const onboardOpen = !!onboard && liveIndex >= 0;
  // Con la cámara abierta sobre un piloto de las tandas se muestra su tanda, y no se rota hasta cerrarla
  const onboardPage = paging && onboardOpen && liveIndex >= fixedCount ? Math.min(pageCount - 1, Math.floor((liveIndex - fixedCount) / pageSize)) : -1;
  if (onboardPage >= 0 && (pager.n % pageCount !== onboardPage || pager.leaving)) {
    const ahead = (onboardPage - (pager.n % pageCount) + pageCount) % pageCount;
    setPager({ n: pager.n + (ahead || pageCount), leaving: false, rotated: true });
  }
  const page = !paging ? 0 : (onboardPage >= 0 ? onboardPage : pager.n % pageCount);
  const pageStart = Math.min(fixedCount + page * pageSize, shownDrivers.length - pageSize);
  // Fila en pantalla de un piloto (índice en shownDrivers), o -1 si no está en la tanda que se ve
  const slotOf = (i) => {
    if (i < 0) return -1;
    if (!paging || i < fixedCount) return i;
    return i >= pageStart && i < pageStart + pageSize ? fixedCount + i - pageStart : -1;
  };

  const [onboardState, setOnboardState] = useState({ number: null, slot: -1, open: false });
  if (onboardOpen && (onboard !== onboardState.number || !onboardState.open)) setOnboardState({ number: onboard, slot: slotOf(liveIndex), open: true });
  else if (!onboardOpen && onboardState.open) setOnboardState({ ...onboardState, open: false });
  const lockSlot = config?.towerOnboardLock !== false;
  const lastIndex = onboardState.number ? shownDrivers.findIndex(d => String(d.number) === String(onboardState.number)) : -1;
  const onboardSlot = lockSlot ? onboardState.slot : slotOf(onboardOpen ? liveIndex : lastIndex);

  // Rotación: cada towerPageSeconds la tanda se desvanece y entra la siguiente
  const pageSecs = towerPageSeconds(config);
  const rotate = paging && pageCount > 1 && isVisible && !onboardOpen;
  useEffect(() => {
    if (!rotate || pager.leaving) return undefined;
    const t = setTimeout(() => setPager(p => ({ ...p, leaving: true })), pageSecs * 1000);
    return () => clearTimeout(t);
  }, [rotate, pager.n, pager.leaving, pageSecs]);
  useEffect(() => {
    if (!pager.leaving) return undefined;
    const t = setTimeout(() => setPager(p => (p.leaving ? { n: p.n + 1, leaving: false, rotated: true } : p)), PAGE_FADE_MS);
    return () => clearTimeout(t);
  }, [pager.leaving]);
  // Filas en pantalla: las fijas y la tanda actual (o todas, si entran). index: lugar en la tabla; slot: fila en pantalla
  const visibleRows = paging
    ? [
        ...shownDrivers.slice(0, fixedCount).map((driver, i) => ({ driver, index: i, slot: i, paged: false })),
        ...shownDrivers.slice(pageStart, pageStart + pageSize).map((driver, j) => ({ driver, index: pageStart + j, slot: fixedCount + j, paged: true }))
      ]
    : shownDrivers.map((driver, i) => ({ driver, index: i, slot: i, paged: false }));
  const rowKey = (driver, paged) => (paged ? `${driver.number || driver.name}@${pager.n}` : (driver.number || driver.name));
  // Entrada de cada fila: las de una tanda nueva entran solas, con el efecto elegido, apenas se fue la anterior
  const rowAnim = (slot, paged, baseDelay) => (paged && pager.rotated
    ? rowEntranceStyle(config, id, slot - fixedCount, visibleRows.length - fixedCount, isVisible, 0.05)
    : rowEntranceStyle(config, id, slot, visibleRows.length, isVisible, baseDelay));

  const onboardStyle = (h) => ({
    height: `${onboardOpen ? h : 0}px`, overflow: 'hidden', backgroundColor: '#000', boxSizing: 'border-box',
    transition: 'height 0.6s ease-in-out, top 0.6s ease-in-out'
  });

  // Difuminado del fondo (backdrop blur) elegible en PERSONALIZAR; por defecto un blur suave.
  const configuredBlur = config?.towerBlur;
  const blurUnset = configuredBlur === undefined || configuredBlur === '';
  // Sin elección del usuario: blur suave, salvo en el skin cristal que ya trae el suyo.
  const blurPx = blurUnset ? (towerFormat === 'glass' ? 0 : 6) : Math.max(0, Number(configuredBlur) || 0);
  const backdropFilter = blurPx > 0 ? `blur(${blurPx}px)` : skin?.backdropFilter;
  // El skin "pro" es un fondo oscuro opaco: lo hacemos algo translúcido para que el blur se note.
  const proBlurred = towerFormat === 'pro' && blurPx > 0;
  const towerSkinBackground = proBlurred ? 'rgba(11,14,19,0.80)' : skin?.background;
  const towerSkinImage = proBlurred ? 'none' : (skin?.backgroundImage || 'none');

  // MAGIA DE DISEÑO, BORDES Y ANIMACIÓN
  const customBg = config[`design_${id}`];
  const hasCustomBg = !!customBg;
  const bRad = config[`borderRadius_${id}`] || '8px';
  const animStyle = config[`animationStyle_${id}`] || 'slide';
  const animDur = getAnimDuration(config, id);
  const fx = makeFx(config, id, isVisible, 0.15);

  // Animación de entrada
  let transformHidden = `scale(${pos.scale}) translateX(-40px)`; 
  if (animStyle === 'fade') transformHidden = `scale(${pos.scale})`; 
  if (animStyle === 'zoom') transformHidden = `scale(${pos.scale * 0.9})`;
  if (animStyle === 'bounce') transformHidden = `scale(${pos.scale * 0.3})`;
  if (animStyle === 'flip') transformHidden = `scale(${pos.scale}) scaleY(0.05)`;
  if (animStyle === 'rotate') transformHidden = `scale(${pos.scale * 0.85}) rotate(-15deg)`;

  useEffect(() => { 
    setTrends(prevTrends => {
      const newTrends = { ...prevTrends };
      drivers.forEach(driver => {
        const prevDriver = prevDriversRef.current[driver.name];
        if (prevDriver) {
          const prevPos = parseInt(prevDriver.pos, 10);
          const currPos = parseInt(driver.pos, 10);
          if (currPos < prevPos) newTrends[driver.name] = 'up';        
          else if (currPos > prevPos) newTrends[driver.name] = 'down';      
          else if (driver.laps !== prevDriver.laps) newTrends[driver.name] = 'same';
        } else {
          newTrends[driver.name] = 'same';
        }
      });
      return newTrends;
    });
    const currentDriversMap = {};
    drivers.forEach(d => currentDriversMap[d.name] = d);
    prevDriversRef.current = currentDriversMap;
  }, [drivers]);

  // FORMATO ELITE (paquete azul de transmisión): torre angosta con código de 4 letras y número de color por auto.
  // FORMATO ANGOSTA (slim): el mismo armado con los colores de PERSONALIZAR > COLORES (fondo, encabezado, principal,
  // secundario, acento y textos), el número en el color secundario y el difuminado elegido para la torre.
  if (towerFormat === 'elite' || towerFormat === 'slim') {
    const slim = towerFormat === 'slim';
    const pal = slim ? getSlimPalette(config) : getElitePalette(config);
    const flag = currentFlag(sessionInfo, config);
    const sessionLabel = showFormation ? FORMATION_TEXT : (sessionInfo?.qualifying ? 'CLASIFICACIÓN' : (sessionInfo?.name ? String(sessionInfo.name).split(/\s+[-–—]\s+/).pop() : 'CARRERA'));
    const W = slim ? 200 : 186;
    const ROW = 25;
    return (
      <div style={{
        position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left', zIndex: 10,
        transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
        opacity: isVisible || animStyle === 'roll' ? 1 : 0,
        transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateX(0)` : transformHidden, ...getRollClip(animStyle, isVisible),
        pointerEvents: isVisible ? 'auto' : 'none', fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase'
      }}>
        <style>{ROW_ANIM_CSS}</style>
        <div style={{ width: `${W}px`, background: pal.background, borderRadius: bRad, overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.5)', borderTop: slim ? `3px solid ${pal.red}` : 'none', backdropFilter: slim ? backdropFilter : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '34px', backgroundColor: slim ? pal.deep : '#0b0b0b', padding: '0 8px' }}>
            {config?.categoryLogo
              ? <img src={config.categoryLogo} alt="" style={{ maxHeight: '28px', maxWidth: '170px', objectFit: 'contain' }} />
              : <span style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: slim ? pal.title : undefined }}>{headerCategory || sessionInfo?.name || ''}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 6px', backgroundColor: slim ? pal.panel : rgba(pal.deep, 0.6) }}>
            {showFormation || !flag
              ? <span style={{ width: '14px', height: '30px', backgroundColor: '#2fd17f', borderRadius: '2px', marginRight: '7px', flexShrink: 0 }} />
              : <FlagSwatch flag={flag} width={14} height={30} style={{ marginRight: '7px' }} />}
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: 700, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: showFormation ? '#2fd17f' : undefined }}>{showFormation ? sessionLabel : (flag && flag.key !== 'green' ? flag.label : (classFilter || sessionLabel))}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: pal.muted, whiteSpace: 'nowrap' }}>
                {(() => {
                  const pr = sessionProgress(sessionInfo);
                  return <>{pr.lap !== null ? <>V <span style={{ color: pal.text }}><ChangeTick value={pr.lap} enabled={fx.on} /></span>{pr.total !== null ? `/${pr.total}` : ''}{'  ·  '}</> : null}{pr.timeToGo ? `RESTA ${pr.timeToGo}` : (pr.elapsed || '-')}</>;
                })()}
              </span>
            </div>
          </div>
          {visibleRows.map(({ driver: d, index: idx, slot, paged }) => {
            const nb = slim ? pal.accent : numberColor(d.number);
            const isLeader = idx === 0;
            const cut = idx === 10 || (paging && slot === fixedCount);
            const gap = isLeader ? (sessionInfo?.qualifying ? (d.bestLap || '-') : 'LÍDER') : (d.diff && d.diff !== '-' ? d.diff : (d.gap || '-'));
            const clsColor = multiclass && d.cls ? getClassColor(config, d.cls, classes) : null;
            return (
              <Fragment key={rowKey(d, paged)}>
              <div style={{ display: 'flex', alignItems: 'center', height: `${ROW}px`, borderTop: cut ? `2px solid ${slim ? pal.cut : rgba('#ffffff', 0.5)}` : `1px solid ${rgba('#ffffff', 0.06)}`, boxShadow: clsColor ? `inset 3px 0 0 ${clsColor}` : 'none', opacity: paged && pager.leaving ? 0 : 1, transition: `opacity ${PAGE_FADE_MS}ms ease-in`, ...rowAnim(slot, paged, 0.15) }}>
                <span style={{ width: '20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: slim ? pal.red : pal.accent, color: textOnColor(slim ? pal.red : pal.accent), fontSize: '12px', fontWeight: 800 }}>{classFilter ? (d.classPos || d.pos) : d.pos}</span>
                <span style={{ width: '34px', margin: '0 6px', textAlign: 'center', backgroundColor: nb, color: textOnColor(nb), fontSize: '13px', fontWeight: 800, lineHeight: '18px', ...sc(d.number) }}>{d.number}</span>
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px' }}><DriverFlag driver={d} config={config} id={id} height={12} />{surnameCode(d.name)}</span>
                <span style={{ width: '24px', display: 'flex', justifyContent: 'center' }}><BrandLogo brand={d.brand} config={config} size={14} /></span>
                <span style={{ fontSize: '13px', fontWeight: 600, paddingRight: '7px', fontFamily: ELITE_FONT, color: slim ? (isLeader ? pal.cut : pal.muted) : undefined }}>{d.dsq ? 'DSQ' : gap}</span>
              </div>
              {slot === onboardSlot && <div data-tower-onboard="1" style={onboardStyle(onboardHeight(config, W))} />}
              </Fragment>
            );
          })}
          <div style={{ display: config?.logo ? 'flex' : 'none', justifyContent: 'center', padding: '5px 0', backgroundColor: slim ? pal.panel : rgba(pal.deep, 0.6) }}>
            {config?.logo && <img src={config.logo} alt="" style={{ maxHeight: '22px', maxWidth: '150px', objectFit: 'contain' }} />}
          </div>
        </div>
      </div>
    );
  }

  const slotTop = (slot) => slot * TOWER_ROW_HEIGHT + (onboardOpen && onboardSlot >= 0 && slot > onboardSlot ? onboardHeight(config, 320) : 0);

  const renderTrend = (trend) => {
    if (trend === 'up') return <span style={{ color: '#2ecc71', fontSize: '16px', lineHeight: 1 }}><Icon name="arrow_drop_up" size="1.4em" /></span>;
    if (trend === 'down') return <span style={{ color: themeMain, fontSize: '16px', lineHeight: 1 }}><Icon name="arrow_drop_down" size="1.4em" /></span>; 
    return <span style={{ color: '#7f8c8d', fontSize: '12px' }}>-</span>;
  };

  return (
    <div style={{
      position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`, transformOrigin: 'top left',
      width: '320px', height: `${TOWER_BOX_H + (onboardOpen && onboardSlot >= 0 ? onboardHeight(config, 320) : 0)}px`,

      backgroundColor: skin ? towerSkinBackground : ((hasCustomBg || isMinimal) ? 'transparent' : themeBg),
      border: skin ? skin.border : 'none',
      borderTop: skin ? skin.border : ((hasCustomBg || isMinimal) ? 'none' : `4px solid ${themeMain}`),
      backgroundImage: hasCustomBg ? `url(${customBg})` : towerSkinImage,
      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
      boxShadow: skin ? skin.boxShadow : ((hasCustomBg || isMinimal) ? 'none' : '0 10px 30px rgba(0,0,0,0.5)'),
      backdropFilter,

      borderRadius: bRad,
      display: 'flex', flexDirection: 'column', zIndex: 10,
      transition: `all ${animDur}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`, 
      opacity: isVisible || animStyle === 'roll' ? 1 : 0, 
      transform: isVisible || animStyle === 'roll' ? `scale(${pos.scale}) translateX(0)` : transformHidden, ...getRollClip(animStyle, isVisible),
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      
      {!isMinimal && (
        <div style={{
          padding: '12px 15px',
          backgroundColor: hasCustomBg ? 'transparent' : themeHeaderBg,
          borderBottom: hasCustomBg ? 'none' : `2px solid ${themeMain}`,
          display: 'flex',
          flexDirection: 'column', // <-- Cambiado a columna para apilar los elementos
          alignItems: 'center',
          justifyContent: 'center', gap: '10px',
          borderRadius: `${bRad} ${bRad} 0 0`
        }}>

          {/* LOGOS ARRIBA */}
          {!hasCustomBg && (config?.logo || config?.categoryLogo) && (
            <div className={fx.group} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {config?.logo && <img src={config.logo} alt="Productora" style={{ height: '35px', maxWidth: '80px', objectFit: 'contain' }} />}
              {config?.logo && config?.categoryLogo && <div style={{ height: '25px', width: '2px', backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />}
              {config?.categoryLogo && <img src={config.categoryLogo} alt="Categoría" style={{ height: '35px', maxWidth: '80px', objectFit: 'contain' }} />}
            </div>
          )}

          {/* TEXTOS ABAJO */}
          <div className={fx.group} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

            {sessionInfo?.name && (
              <span style={{ fontWeight: '900', fontSize: '15px', textAlign: 'center', width: '100%', color: themeTitleText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
                {sessionInfo.name}
              </span>
            )}
            <span style={{ display: headerCategory ? 'block' : 'none', fontWeight: 'bold', fontSize: '11px', letterSpacing: '1px', textAlign: 'center', width: '100%', color: classFilter ? getClassColor(config, classFilter, classes) : themeNumberText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
              {headerCategory}
            </span>
            <span style={{ display: showFormation ? 'block' : 'none', marginTop: '4px', fontWeight: 900, fontSize: '12px', letterSpacing: '1.5px', textAlign: 'center', width: '100%', color: '#2fd17f', whiteSpace: 'nowrap' }}>
              {FORMATION_TEXT}
            </span>
          </div>

        </div>
      )}

      {!isMinimal && (
        <div style={{ backgroundColor: hasCustomBg ? 'transparent' : 'rgba(0,0,0,0.4)', padding: '8px 15px', display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', borderBottom: hasCustomBg ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
          {(() => { const f = currentFlag(sessionInfo, config); return f ? <FlagSwatch flag={f} width="auto" height={26} label={f.short} fontSize={11} /> : null; })()}
           <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>VUELTAS</span>
            <span style={{ color: themeNumberText, fontSize: '16px', fontWeight: 'bold' }}><ChangeTick value={sessionInfo?.laps || '-'} enabled={fx.on} />{sessionProgress(sessionInfo).total !== null ? `/${sessionProgress(sessionInfo).total}` : ''}</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: themeTitleText, fontWeight: 'bold', letterSpacing: '1px' }}>{sessionProgress(sessionInfo).timeToGo ? 'RESTA' : 'TIEMPO'}</span>
            <span style={{ color: themeNumberText, fontSize: '16px', fontWeight: 'bold' }}>{sessionProgress(sessionInfo).timeToGo || sessionInfo?.totalTime || '-'}</span>
          </span>
        </div>
      )}

      <style>{ROW_ANIM_CSS}</style>
      <div ref={rowsRef} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {visibleRows.map(({ driver, slot: index, paged }) => {
          const podiumColor = isPodium ? PODIUM_COLORS[Number(driver.pos)] : null;
          const classColor = multiclass && driver.cls ? getClassColor(config, driver.cls, classes) : null;
          const gain = showGains && Number.isFinite(driver.posGain) && driver.posGain !== 0 ? driver.posGain : 0;
          const zebraBg = isMinimal ? (index % 2 === 0 ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)') : null;
          return (
          <div key={rowKey(driver, paged)} style={{
            position: 'absolute', top: `${slotTop(index)}px`, left: 0, width: '100%', height: `${TOWER_ROW_HEIGHT}px`,
            display: 'flex', alignItems: 'center', padding: '0 15px', boxSizing: 'border-box',
            backgroundColor: zebraBg || 'transparent',
            borderLeft: podiumColor ? `4px solid ${podiumColor}` : 'none',
            boxShadow: classColor && !podiumColor ? `inset 4px 0 0 ${classColor}` : 'none',
            borderRadius: isMinimal ? bRad : 0,
            borderBottom: (hasCustomBg || isMinimal) ? 'none' : '1px solid rgba(255,255,255,0.05)',
            transition: `top 0.6s ease-in-out, opacity ${PAGE_FADE_MS}ms ease-in`, fontSize: isCompact || isMinimal ? '13px' : '16px',
            opacity: paged && pager.leaving ? 0 : 1,
            ...rowAnim(index, paged, 0.3)
          }}>
            <span style={{ width: '25px', color: podiumColor || themeAccent, fontWeight: 'bold' }}>{classFilter ? (driver.classPos || driver.pos) : driver.pos}</span>
            {!isCompact && <span style={{ width: '15px', display: 'flex', justifyContent: 'center' }}>{renderTrend(trends[driver.name])}</span>}
            <div style={{ backgroundColor: podiumColor || themeSecondary, color: '#000', fontWeight: '900', fontSize: isCompact || isMinimal ? '11px' : '12px', width: isCompact || isMinimal ? '22px' : '26px', height: isCompact || isMinimal ? '16px' : '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', marginRight: '8px', marginLeft: '6px', ...sc(driver.number) }}>{driver.number}</div>
            <span style={{ flex: 1, color: themeNormalText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><DriverFlag driver={driver} config={config} id={id} height={13} style={{ marginRight: '6px' }} /><BrandLogo brand={driver.brand} config={config} size={16} style={{ marginRight: '6px' }} />{driver.name}</span>
            {!isCompact && <span style={{ width: '65px', textAlign: 'right', color: themeNumberText, fontSize: '14px', fontWeight: 'bold' }}>{driver.lastLap}</span>}
            <span style={{ display: gain ? 'inline' : 'none', width: '34px', textAlign: 'right', fontSize: '12px', fontWeight: 900, color: gain > 0 ? ARROW_COLORS.up : ARROW_COLORS.down, whiteSpace: 'nowrap' }}>
              {gain > 0 ? `▲${gain}` : `▼${-gain}`}
            </span>
          </div>
          );
        })}
        {paging && fixedCount > 0 && (
          <div style={{ position: 'absolute', left: 0, width: '100%', height: '2px', top: `${slotTop(fixedCount) - 1}px`, backgroundColor: themeMain, opacity: 0.7, zIndex: 1, transition: 'top 0.6s ease-in-out' }} />
        )}
        {onboardSlot >= 0 && (
          <div data-tower-onboard="1" style={{ position: 'absolute', left: 0, width: '100%', top: `${(onboardSlot + 1) * TOWER_ROW_HEIGHT}px`, zIndex: 2, ...onboardStyle(onboardHeight(config, 320)) }} />
        )}
      </div>
    </div>
  );
}