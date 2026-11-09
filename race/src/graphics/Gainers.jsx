import { getGraphicFrame, getFormatStyles } from '../utils/raceVisuals';
import CategoryTag from '../components/CategoryTag';
import DriverPhoto, { photosEnabled } from '../components/DriverPhoto';
import BrandLogo from '../components/BrandLogo';
import { useSuitColors } from '../utils/suitColor';

// MAYORES REMONTADAS: los pilotos que más posiciones ganaron respecto de la grilla de largada.
// Formatos (PERSONALIZAR): standard | compact | cards (tarjetas en fila) | both (ganadas y perdidas) | minimal | skins.
export default function Gainers({ drivers, config, isVisible, id = 'gainers' }) {
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 1440, y: 470, scale: 1 });
  const format = config?.gainersFormat || 'standard';
  const f = getFormatStyles(format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const ts = f.textShadow;
  const showPh = photosEnabled(config, id);
  // Color del número tomado del traje (foto del piloto), si está activado en PILOTOS
  const suit = useSuitColors(drivers, config);
  const sc = (n) => (suit[String(n)] ? { backgroundColor: suit[String(n)].bg, color: suit[String(n)].text } : {});
  const count = Math.min(10, Math.max(1, parseInt(config?.gainersCount, 10) || 5));
  const valid = (drivers || []).filter(d => Number.isFinite(d.posGain) && !d.dsq);
  const byPos = (a, b) => parseInt(a.pos, 10) - parseInt(b.pos, 10);
  const gainers = valid.filter(d => d.posGain > 0).sort((a, b) => (b.posGain - a.posGain) || byPos(a, b)).slice(0, count);
  const losers = valid.filter(d => d.posGain < 0).sort((a, b) => (a.posGain - b.posGain) || byPos(a, b)).slice(0, count);
  const hasGrid = (drivers || []).some(d => Number.isFinite(d.startPos));
  const emptyText = hasGrid ? 'NADIE GANÓ POSICIONES TODAVÍA' : 'SIN GRILLA DE LARGADA';

  const header = (text, align = 'left') => (
    <div style={{ padding: f.compact ? '7px 12px' : '9px 14px', backgroundColor: f.headerBg, borderBottom: f.headerBorder, color: theme.title, fontWeight: 900, fontSize: f.compact ? '12px' : '14px', letterSpacing: '2px', textAlign: align, textShadow: ts }}>
      {text}<CategoryTag config={config} id={id} />
    </div>
  );

  const row = (d, i, { up = true, showMove = true, small = false } = {}) => (
    <div key={d.number} style={{ display: 'flex', alignItems: 'center', padding: small ? '6px 12px' : '8px 14px', borderBottom: f.minimal ? 'none' : '1px solid rgba(255,255,255,0.06)', backgroundColor: f.minimal ? 'rgba(0,0,0,0.55)' : 'transparent', marginTop: f.minimal ? '3px' : 0, borderRadius: f.minimal ? bRad : 0 }}>
      <span style={{ color: theme.number, fontWeight: 'bold', fontSize: small ? '12px' : '13px', width: '22px' }}>{i + 1}.</span>
      {showPh && <DriverPhoto number={d.number} config={config} height={small ? 30 : 38} maxWidth={44} style={{ marginRight: '8px' }} />}
      <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: small ? '12px' : '13px', padding: '2px 7px', borderRadius: '3px', marginRight: '10px', ...sc(d.number) }}>{d.number}</span>
      <span style={{ flex: 1, minWidth: 0, color: theme.text, fontWeight: 900, fontSize: small ? '14px' : '16px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><BrandLogo brand={d.brand} config={config} size={16} style={{ marginRight: '6px' }} />{d.name}</span>
      {showMove && <span style={{ color: theme.number, fontSize: '12px', fontWeight: 'bold', margin: '0 12px', whiteSpace: 'nowrap' }}>P{d.startPos} → P{d.pos}</span>}
      <span style={{ color: up ? '#2ecc71' : '#e74c3c', fontWeight: 900, fontSize: small ? '15px' : '18px', minWidth: '44px', textAlign: 'right' }}>{up ? '▲' : '▼'}{Math.abs(d.posGain)}</span>
    </div>
  );

  const empty = (text) => (
    <div style={{ padding: '12px 14px', color: theme.number, fontSize: '12px', fontWeight: 'bold', textShadow: ts }}>{text}</div>
  );

  // TARJETAS: los que más avanzaron, uno al lado del otro con el +N grande
  if (format === 'cards') {
    const list = gainers.slice(0, Math.min(count, 5));
    return (
      <div style={wrapperStyle}>
        <div style={{ ...f.box, width: `${Math.max(1, list.length) * 150 + 20}px` }}>
          {header('MAYORES REMONTADAS', 'center')}
          <div style={{ display: 'flex', padding: '10px' }}>
            {list.map(d => (
              <div key={d.number} style={{ width: '140px', margin: '0 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: bRad, boxSizing: 'border-box' }}>
                {showPh && <DriverPhoto number={d.number} config={config} height={90} maxWidth={120} fade style={{ marginBottom: '4px' }} />}
                <span style={{ color: '#2ecc71', fontWeight: 900, fontSize: '36px', lineHeight: 1 }}>▲{d.posGain}</span>
                <span style={{ backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '14px', padding: '2px 8px', borderRadius: '3px', margin: '8px 0 4px', ...sc(d.number) }}>{d.number}</span>
                <span style={{ color: theme.text, fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.name}</span>
                <span style={{ color: theme.number, fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>P{d.startPos} → P{d.pos}</span>
              </div>
            ))}
            {!list.length && empty(emptyText)}
          </div>
        </div>
      </div>
    );
  }

  // GANADAS Y PERDIDAS: dos columnas
  if (format === 'both') {
    return (
      <div style={wrapperStyle}>
        <div style={{ ...f.box, width: '760px' }}>
          {header('POSICIONES GANADAS Y PERDIDAS', 'center')}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ padding: '6px 12px', color: '#2ecc71', fontSize: '11px', fontWeight: 900, letterSpacing: '1px' }}>▲ GANARON</div>
              {gainers.map((d, i) => row(d, i, { up: true, showMove: false, small: true }))}
              {!gainers.length && empty(emptyText)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ padding: '6px 12px', color: '#e74c3c', fontSize: '11px', fontWeight: 900, letterSpacing: '1px' }}>▼ PERDIERON</div>
              {losers.map((d, i) => row(d, i, { up: false, showMove: false, small: true }))}
              {!losers.length && empty(hasGrid ? 'NADIE PERDIÓ POSICIONES' : 'SIN GRILLA DE LARGADA')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CLÁSICO / COMPACTO / MINIMALISTA / SKINS
  return (
    <div style={wrapperStyle}>
      <div style={{ ...f.box, width: f.compact ? '340px' : '420px' }}>
        {header(f.compact ? 'REMONTADAS' : 'MAYORES REMONTADAS')}
        {gainers.map((d, i) => row(d, i, { showMove: !f.compact, small: f.compact }))}
        {!gainers.length && empty(emptyText)}
      </div>
    </div>
  );
}
