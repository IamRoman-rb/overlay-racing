import { Fragment } from 'react';
import { borderCss } from '../leagues';

// Logos en pantalla: el de la liga, el de la productora o ambos. Sin logo cargado se muestra el nombre en texto.
export default function Branding({ mode, comp, producerLogo, theme: t }) {
  const items = [];
  if (mode === 'league' || mode === 'both') items.push({ logo: comp.logo, text: comp.name });
  if (mode === 'producer' || mode === 'both') items.push({ logo: producerLogo, text: 'PRODUCTORA' });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 26, minHeight: 112, padding: '16px 32px', boxSizing: 'border-box',
      fontFamily: t.font, fontWeight: t.weight, color: t.text, background: t.bg, borderRadius: t.panelRadius,
      boxShadow: '0 12px 30px rgba(0,0,0,0.5)', ...borderCss(t)
    }}>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <div style={{ width: 2, alignSelf: 'stretch', background: t.accent, opacity: 0.7 }} />}
          {item.logo
            ? <img src={item.logo} alt="" style={{ maxHeight: 84, maxWidth: 260, objectFit: 'contain' }} />
            : <span style={{ fontSize: 34, letterSpacing: 2, textTransform: t.upper ? 'uppercase' : 'none' }}>{item.text}</span>}
        </Fragment>
      ))}
    </div>
  );
}
