import { getGraphicFrame, withCategory } from '../utils/raceVisuals';
import { getSlimPalette, ELITE_FONT, rgba, textOnColor } from '../utils/elite';
import { currentFlag, sessionProgress } from '../utils/flagState';
import FlagSwatch from '../components/FlagSwatch';
import { ChangeTick, ChangeSweep } from '../components/ChangeAnim';
import { makeFx } from '../utils/contentAnim';

// VUELTA X DE Y: cuántas vueltas van de las que tiene la carrera, con los colores de PERSONALIZAR > COLORES.
// El total sale de PANEL > TOTAL DE VUELTAS (si se cargó a mano) o de lo que informa el cronometraje (vueltas que faltan).
// Avisa ÚLTIMA VUELTA cuando el líder la empieza y FINAL al completarlas. Sin total conocido muestra sólo la vuelta.
// Formatos (PERSONALIZAR): 'bar' (barra de progreso) | 'fraction' (6/10 grande) | 'text' (VAN 6 VUELTAS DE 10)
export default function LapProgress({ sessionInfo, config, isVisible, id = 'lapProgress' }) {
  const { wrapperStyle, bRad } = getGraphicFrame(config, id, isVisible, { x: 1600, y: 20, scale: 1 }, 40);
  const pal = getSlimPalette(config);
  const fx = makeFx(config, id, isVisible);
  const format = config?.lapProgressFormat || 'bar';
  const prog = sessionProgress(sessionInfo);
  const flag = currentFlag(sessionInfo, config);
  const lap = prog.lap === null ? 0 : prog.lap;
  const total = prog.total;
  const done = total !== null && lap >= total;
  const lastLap = total !== null && !done && lap === total - 1;
  const status = done ? 'FINAL' : (lastLap ? 'ÚLTIMA VUELTA' : (prog.lapsToGo !== null ? `FALTAN ${prog.lapsToGo}` : ''));
  const statusColor = done ? '#ffffff' : (lastLap ? pal.cut : pal.muted);
  const pct = total ? Math.max(0, Math.min(1, lap / total)) : 0;
  const category = withCategory(config, id, '');

  const lapNum = <ChangeTick value={lap} enabled={fx.on} />;
  const box = { fontFamily: ELITE_FONT, textTransform: 'uppercase', background: pal.background, borderRadius: bRad, overflow: 'hidden', borderTop: `3px solid ${pal.red}`, boxShadow: '0 10px 26px rgba(0,0,0,0.5)', position: 'relative' };
  const flagStrip = flag ? <FlagSwatch flag={flag} width="100%" height={5} radius={0} /> : null;

  // TEXTO: "VAN 6 VUELTAS DE 10" en una línea
  if (format === 'text') {
    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{ ...box, display: 'flex', alignItems: 'center', gap: '10px', height: '46px', padding: '0 18px' }}>
          {lastLap || done
            ? <span style={{ fontSize: '22px', fontWeight: 800, color: done ? pal.text : pal.cut, letterSpacing: '1px' }}>{status}</span>
            : <>
              <span style={{ fontSize: '15px', fontWeight: 700, color: pal.muted }}>{total !== null ? 'VAN' : 'VUELTA'}</span>
              <span style={{ fontSize: '26px', fontWeight: 800, color: pal.text }}>{lapNum}</span>
              {total !== null && <>
                <span style={{ fontSize: '15px', fontWeight: 700, color: pal.muted }}>{lap === 1 ? 'VUELTA DE' : 'VUELTAS DE'}</span>
                <span style={{ fontSize: '26px', fontWeight: 800, color: pal.title }}>{total}</span>
              </>}
            </>}
          <ChangeSweep value={lap} enabled={fx.on} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>{flagStrip}</div>
        </div>
      </div>
    );
  }

  // FRACCIÓN: 6/10 grande
  if (format === 'fraction') {
    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{ ...box, minWidth: '150px', textAlign: 'center' }}>
          <div style={{ padding: '5px 12px', backgroundColor: pal.deep, color: pal.title, fontSize: '12px', fontWeight: 800, letterSpacing: '2px' }}>{category || 'VUELTA'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', padding: '6px 18px 2px', lineHeight: 1 }}>
            <span style={{ fontSize: '46px', fontWeight: 800, color: pal.text }}>{lapNum}</span>
            {total !== null && <span style={{ fontSize: '26px', fontWeight: 700, color: pal.muted }}>/{total}</span>}
          </div>
          <div style={{ height: '18px', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: statusColor }}>{status}</div>
          {flagStrip}
          <ChangeSweep value={lap} enabled={fx.on} />
        </div>
      </div>
    );
  }

  // BARRA (por defecto): VUELTA 6/10 + barra de progreso por vueltas + estado
  const segments = total !== null && total <= 40 ? total : 0;
  return (
    <div style={wrapperStyle}>
      <div className={fx.group} style={{ ...box, width: '300px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px 6px' }}>
          <span style={{ backgroundColor: pal.red, color: textOnColor(pal.red), fontSize: '12px', fontWeight: 800, padding: '3px 8px', letterSpacing: '1px' }}>VUELTA</span>
          <span style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
            <span style={{ fontSize: '30px', fontWeight: 800, color: pal.text }}>{lapNum}</span>
            {total !== null && <span style={{ fontSize: '18px', fontWeight: 700, color: pal.muted }}>/{total}</span>}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 800, color: statusColor, whiteSpace: 'nowrap' }}>{status}</span>
        </div>
        {total !== null && (
          <div style={{ display: 'flex', gap: segments ? '2px' : 0, height: '8px', margin: '0 14px 10px', backgroundColor: segments ? 'transparent' : rgba('#ffffff', 0.12) }}>
            {segments
              ? Array.from({ length: segments }, (_, i) => (
                <span key={i} style={{ flex: 1, backgroundColor: i < lap ? (i === segments - 1 || lastLap ? pal.cut : pal.red) : rgba('#ffffff', 0.12), transition: 'background-color 0.4s ease' }} />
              ))
              : <span style={{ width: `${pct * 100}%`, backgroundColor: pal.red, transition: 'width 0.6s ease' }} />}
          </div>
        )}
        {flagStrip}
        <ChangeSweep value={lap} enabled={fx.on} />
      </div>
    </div>
  );
}
