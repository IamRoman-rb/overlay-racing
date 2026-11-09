import { getGraphicFrame, getFormatStyles } from '../utils/raceVisuals';
import { getCanvasSize } from '../utils/canvasSize';
import CategoryTag from '../components/CategoryTag';
import DriverPhoto, { photosEnabled } from '../components/DriverPhoto';

const KIND_COLORS = { leader: '#ffd700', stopped: '#e74c3c', pole: '#a23cf0' };

// AVISO DE CARRERA: lo que el operador saca al aire desde una alerta automática (nuevo líder, posible abandono).
// Formatos (PERSONALIZAR): standard (tarjeta) | compact (una línea) | banner (barra de todo el ancho) | minimal | skins.
export default function RaceNotice({ notice, config, id = 'raceNotice' }) {
  const isVisible = !!notice?.isVisible;
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, isVisible, { x: 760, y: 820, scale: 1 }, 55);
  const format = config?.raceNoticeFormat || 'standard';
  const f = getFormatStyles(format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const ts = f.textShadow;
  const showPh = photosEnabled(config, id);
  const accent = KIND_COLORS[notice?.kind] || theme.main;

  // BANNER: barra de color de todo el ancho del lienzo
  if (format === 'banner') {
    return (
      <div style={{ ...wrapperStyle, width: `${getCanvasSize(config).width}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px', backgroundColor: accent, boxShadow: '0 6px 20px rgba(0,0,0,0.6)' }}>
          <span style={{ color: '#000', fontWeight: 900, fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {notice?.title}<CategoryTag config={config} id={id} />
          </span>
          <span style={{ display: notice?.number ? 'inline-block' : 'none', backgroundColor: '#000', color: '#fff', fontWeight: 900, fontSize: '18px', padding: '2px 10px', borderRadius: '4px', margin: '0 12px 0 18px' }}>{notice?.number}</span>
          <span style={{ color: '#000', fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: notice?.number ? 0 : '18px' }}>{notice?.text}</span>
        </div>
      </div>
    );
  }

  // COMPACTO: una sola línea
  if (f.compact) {
    return (
      <div style={wrapperStyle}>
        <div style={{ ...f.box, borderTop: 'none', borderLeft: `5px solid ${accent}`, display: 'flex', alignItems: 'center', width: '400px', padding: '9px 14px' }}>
          <span style={{ color: accent, fontWeight: 900, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap', marginRight: '10px' }}>{notice?.title}<CategoryTag config={config} id={id} /></span>
          <span style={{ display: notice?.number ? 'inline-block' : 'none', backgroundColor: theme.secondary, color: '#000', fontWeight: 900, fontSize: '13px', padding: '1px 6px', borderRadius: '3px', marginRight: '8px' }}>{notice?.number}</span>
          <span style={{ flex: 1, minWidth: 0, color: theme.text, fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notice?.text}</span>
        </div>
      </div>
    );
  }

  // CLÁSICO / MINIMALISTA / SKINS: tarjeta con el número grande
  return (
    <div style={wrapperStyle}>
      <div style={{ ...f.box, borderTop: f.skin && !customBg ? f.box.borderTop : 'none', display: 'flex', alignItems: 'stretch', width: '440px' }}>
        <div style={{ width: f.minimal ? '5px' : '8px', backgroundColor: accent, flexShrink: 0 }} />
        {showPh && <div style={{ display: 'flex', alignItems: 'flex-end', height: '76px', flexShrink: 0 }}><DriverPhoto number={notice?.number} config={config} height={76} maxWidth={90} /></div>}
        <div style={{ display: notice?.number ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', minWidth: '64px', backgroundColor: f.minimal ? 'transparent' : theme.secondary, color: f.minimal ? theme.text : '#000', fontWeight: 900, fontSize: '26px', padding: '0 8px', textShadow: ts }}>
          {notice?.number}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 16px', minWidth: 0, flex: 1 }}>
          <span style={{ color: accent, fontWeight: 900, fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', textShadow: ts }}>{notice?.title}<CategoryTag config={config} id={id} /></span>
          <span style={{ color: theme.text, fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: ts }}>{notice?.text}</span>
        </div>
      </div>
    </div>
  );
}
