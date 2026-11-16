import { getGraphicFrame, withCategory } from '../utils/raceVisuals';
import { getSlimPalette, ELITE_FONT, rgba, textOnColor } from '../utils/elite';
import { currentFlag, sessionProgress } from '../utils/flagState';
import FlagSwatch from '../components/FlagSwatch';
import { ChangeTick } from '../components/ChangeAnim';
import { makeFx } from '../utils/contentAnim';

// ESTADO DE SESIÓN: todo lo que informa el cronometraje en una sola gráfica, con los colores de PERSONALIZAR > COLORES:
// bandera vigente (la del PANEL o la del cronometraje), sesión, vuelta (y total / faltantes si la fuente las informa),
// tiempo restante o transcurrido, mejor vuelta de la sesión (piloto y tiempo) y temperatura en el circuito.
// Formatos (PERSONALIZAR): 'bar' (barra horizontal) | 'card' (tarjeta) | 'minimal' (sin caja)
export default function SessionStatus({ drivers = [], sessionInfo, config, isVisible, id = 'sessionStatus' }) {
  const { wrapperStyle, bRad } = getGraphicFrame(config, id, isVisible, { x: 560, y: 20, scale: 1 }, 30);
  const pal = getSlimPalette(config);
  const fx = makeFx(config, id, isVisible);
  const format = config?.sessionStatusFormat || 'bar';
  const flag = currentFlag(sessionInfo, config);
  const prog = sessionProgress(sessionInfo);
  const qualifying = !!sessionInfo?.qualifying;
  const title = withCategory(config, id, config?.eventName || sessionInfo?.name || '') || (qualifying ? 'CLASIFICACIÓN' : 'CARRERA');
  const fastest = drivers.find(d => d.isFastest) || null;
  const bestLap = sessionInfo?.bestLap || fastest?.bestLap || '';
  // Temperatura: la del clima cargado en el PANEL o la que informa Speedhive
  const temp = config?.weatherData?.temp !== undefined && config?.weatherData?.temp !== null ? Math.round(config.weatherData.temp)
    : (sessionInfo?.trackWeatherTemp ? Math.round(parseFloat(sessionInfo.trackWeatherTemp)) : null);

  const lapText = prog.lap === null ? '-' : prog.lap;
  const timeLabel = prog.timeToGo ? 'RESTA' : 'TIEMPO';
  const timeValue = prog.timeToGo || prog.elapsed || '-';

  const label = (t) => <span style={{ fontSize: '10px', fontWeight: 700, color: pal.muted, letterSpacing: '1px' }}>{t}</span>;
  const big = (v, size = 22) => <span style={{ fontSize: `${size}px`, fontWeight: 800, color: pal.text, lineHeight: 1, whiteSpace: 'nowrap' }}>{v}</span>;
  const lapsBlock = (size) => (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
      {big(<ChangeTick value={lapText} enabled={fx.on} />, size)}
      {prog.total !== null && <span style={{ fontSize: `${Math.round(size * 0.6)}px`, fontWeight: 700, color: pal.muted }}>/{prog.total}</span>}
    </span>
  );
  const fastestBlock = (size = 14) => bestLap && (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
      {fastest && <span style={{ backgroundColor: '#9b59b6', color: '#fff', fontSize: `${size - 2}px`, fontWeight: 800, padding: '1px 6px', borderRadius: '2px' }}>{fastest.number}</span>}
      <span style={{ fontSize: `${size}px`, fontWeight: 800, color: '#c792ff' }}>{bestLap}</span>
    </span>
  );
  const flagChip = (h) => (flag
    ? <FlagSwatch flag={flag} width="auto" height={h} radius={2} label={flag.short} fontSize={Math.max(10, Math.round(h / 2.6))} style={{ minWidth: `${h * 2.4}px` }} />
    : <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: `${h}px`, minWidth: `${h * 2.4}px`, borderRadius: '2px', backgroundColor: rgba('#ffffff', 0.1), color: pal.muted, fontSize: '10px', fontWeight: 800 }}>SIN BANDERA</span>);

  // MINIMALISTA: sin caja, una línea flotando sobre el video
  if (format === 'minimal') {
    const shadow = { textShadow: '0 2px 6px rgba(0,0,0,0.9)' };
    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: ELITE_FONT, textTransform: 'uppercase', ...shadow }}>
          {flagChip(26)}
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>{label('VUELTA')}{lapsBlock(24)}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>{label(timeLabel)}{big(timeValue, 20)}</span>
          {bestLap && <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>{label('MEJOR')}{fastestBlock(16)}</span>}
        </div>
      </div>
    );
  }

  // TARJETA: bloque compacto de dos columnas
  if (format === 'card') {
    const cell = { display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px', backgroundColor: pal.panel };
    return (
      <div style={wrapperStyle}>
        <div style={{ width: '300px', fontFamily: ELITE_FONT, textTransform: 'uppercase', background: pal.background, borderRadius: bRad, overflow: 'hidden', borderTop: `3px solid ${pal.red}`, boxShadow: '0 10px 26px rgba(0,0,0,0.5)' }}>
          <div className={fx.group} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: pal.deep }}>
            {config?.categoryLogo && <img src={config.categoryLogo} alt="" style={{ maxHeight: '26px', maxWidth: '90px', objectFit: 'contain' }} />}
            <span style={{ flex: 1, minWidth: 0, color: pal.title, fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          </div>
          <div style={{ padding: '8px 12px' }}>{flag ? <FlagSwatch flag={flag} width="100%" height={28} label={flag.label} fontSize={13} /> : flagChip(28)}</div>
          <div className={fx.group} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: rgba('#ffffff', 0.08) }}>
            <div style={cell}>{label(prog.lapsToGo !== null ? `VUELTA · FALTAN ${prog.lapsToGo}` : 'VUELTA')}{lapsBlock(26)}</div>
            <div style={cell}>{label(timeLabel)}{big(timeValue, 22)}</div>
            <div style={{ ...cell, gridColumn: temp === null ? 'span 2' : undefined }}>{label('MEJOR VUELTA')}{bestLap ? fastestBlock(15) : big('-', 18)}</div>
            {temp !== null && <div style={cell}>{label('TEMPERATURA')}{big(`${temp}°C`, 22)}</div>}
          </div>
        </div>
      </div>
    );
  }

  // BARRA (por defecto): una franja horizontal con todos los datos
  const sep = <span style={{ width: '1px', alignSelf: 'stretch', backgroundColor: rgba('#ffffff', 0.12) }} />;
  const block = (children, extra) => <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px', padding: '0 16px', ...extra }}>{children}</div>;
  return (
    <div style={wrapperStyle}>
      <div className={fx.group} style={{
        display: 'flex', alignItems: 'stretch', height: '54px', fontFamily: ELITE_FONT, textTransform: 'uppercase',
        background: pal.background, borderRadius: bRad, overflow: 'hidden', borderTop: `3px solid ${pal.red}`, boxShadow: '0 10px 26px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', backgroundColor: pal.deep, maxWidth: '320px' }}>
          {config?.categoryLogo && <img src={config.categoryLogo} alt="" style={{ maxHeight: '34px', maxWidth: '110px', objectFit: 'contain' }} />}
          <span style={{ color: pal.title, fontSize: '15px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px' }}>{flagChip(32)}</div>
        {sep}
        {block(<>{label(prog.lapsToGo !== null ? `VUELTA · FALTAN ${prog.lapsToGo}` : 'VUELTA')}{lapsBlock(22)}</>)}
        {sep}
        {block(<>{label(timeLabel)}{big(timeValue, 20)}</>)}
        {bestLap && <>{sep}{block(<>{label('MEJOR VUELTA')}{fastestBlock(15)}</>)}</>}
        {temp !== null && <>{sep}{block(<>{label('TEMP.')}{big(`${temp}°C`, 20)}</>, { paddingRight: '18px' })}</>}
        <span style={{ width: '6px', backgroundColor: pal.red, color: textOnColor(pal.red) }} />
      </div>
    </div>
  );
}
