import { getGraphicFrame, getFormatStyles, formationCategory, FORMATION_TEXT } from '../utils/raceVisuals';
import { getCanvasSize } from '../utils/canvasSize';
import { getElitePalette, ELITE_FONT, textOnColor } from '../utils/elite';
import { makeFx } from '../utils/contentAnim';

// Franja de color al costado de la caja
const FlagStripe = ({ color, width = 8 }) => (
  <div style={{ width: `${width}px`, flexShrink: 0, alignSelf: 'stretch', backgroundColor: color }} />
);

// VUELTA DE FORMACIÓN: la categoría que está girando y el texto "VUELTA DE FORMACIÓN".
// Formatos (PERSONALIZAR): standard (tarjeta) | compact (una línea) | banner (barra de todo el ancho) | elite | minimal | skins.
export default function FormationLap({ config, isVisible, sessionInfo, id = 'formationLap' }) {
  const { wrapperStyle, bRad, customBg, theme: baseTheme } = getGraphicFrame(config, id, !!isVisible, { x: 660, y: 60, scale: 1 }, 55);
  const format = config?.formationLapFormat || 'standard';
  const category = formationCategory(config, sessionInfo);
  const logo = config?.categoryLogo || null;
  const fx = makeFx(config, id, !!isVisible);

  // BANNER: barra del color principal de todo el ancho del lienzo
  if (format === 'banner') {
    const bg = baseTheme.main;
    const fg = textOnColor(bg);
    return (
      <div style={{ ...wrapperStyle, width: `${getCanvasSize(config).width}px` }}>
        <div className={fx.group} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px', backgroundColor: bg, boxShadow: '0 6px 20px rgba(0,0,0,0.6)' }}>
          {logo && <img src={logo} alt="" style={{ maxHeight: '34px', maxWidth: '120px', objectFit: 'contain', marginRight: '16px' }} />}
          <span style={{ display: category ? 'inline' : 'none', color: fg, fontWeight: 900, fontSize: '20px', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap', opacity: 0.85 }}>{category}</span>
          <span style={{ display: category ? 'inline-block' : 'none', width: '2px', height: '26px', backgroundColor: fg, opacity: 0.5, margin: '0 18px' }} />
          <span style={{ color: fg, fontWeight: 900, fontSize: '24px', letterSpacing: '3px', whiteSpace: 'nowrap' }}>{FORMATION_TEXT}</span>
        </div>
      </div>
    );
  }

  // ELITE: misma paleta y letra que la torre Elite
  if (format === 'elite') {
    const pal = getElitePalette(config);
    return (
      <div style={{ ...wrapperStyle, fontFamily: ELITE_FONT, textTransform: 'uppercase' }}>
        <div className={fx.group} style={{ display: 'flex', alignItems: 'stretch', minWidth: '360px', background: pal.background, borderRadius: bRad, overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.5)' }}>
          <FlagStripe color="#2fd17f" width={10} />
          {logo && <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', backgroundColor: pal.deep }}><img src={logo} alt="" style={{ maxHeight: '44px', maxWidth: '110px', objectFit: 'contain' }} /></div>}
          <div className={fx.group} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 18px', lineHeight: 1.15, textAlign: 'left' }}>
            <span style={{ display: category ? 'block' : 'none', color: pal.muted, fontSize: '18px', fontWeight: 700, letterSpacing: '1px', whiteSpace: 'nowrap' }}>{category}</span>
            <span style={{ color: pal.text, fontSize: '30px', fontWeight: 800, letterSpacing: '1px', whiteSpace: 'nowrap' }}>{FORMATION_TEXT}</span>
          </div>
        </div>
      </div>
    );
  }

  const f = getFormatStyles(format, { theme: baseTheme, customBg, bRad });
  const theme = f.theme;
  const ts = f.textShadow;

  // COMPACTO: una sola línea
  if (f.compact) {
    return (
      <div style={wrapperStyle}>
        <div className={fx.group} style={{ ...f.box, borderTop: 'none', borderLeft: `5px solid ${theme.main}`, display: 'flex', alignItems: 'center', padding: '9px 16px' }}>
          <span style={{ display: category ? 'inline' : 'none', color: theme.title, fontWeight: 900, fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap', marginRight: '12px' }}>{category}</span>
          <span style={{ color: theme.text, fontWeight: 900, fontSize: '17px', letterSpacing: '2px', whiteSpace: 'nowrap' }}>{FORMATION_TEXT}</span>
        </div>
      </div>
    );
  }

  // CLÁSICO / MINIMALISTA / SKINS: tarjeta con la categoría arriba y el texto grande
  return (
    <div style={wrapperStyle}>
      <div style={{ ...f.box, display: 'flex', alignItems: 'stretch', minWidth: '380px' }}>
        <FlagStripe color={theme.main} width={f.minimal ? 5 : 8} />
        {logo && !f.minimal && <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', backgroundColor: f.headerBg }}><img src={logo} alt="" style={{ maxHeight: '46px', maxWidth: '110px', objectFit: 'contain' }} /></div>}
        <div className={fx.group} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 20px', minWidth: 0, textAlign: 'center', flex: 1 }}>
          <span style={{ display: category ? 'block' : 'none', color: theme.title, fontWeight: 900, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: ts }}>{category}</span>
          <span style={{ color: theme.text, fontWeight: 900, fontSize: '28px', letterSpacing: '1px', whiteSpace: 'nowrap', textShadow: ts }}>{FORMATION_TEXT}</span>
        </div>
      </div>
    </div>
  );
}
