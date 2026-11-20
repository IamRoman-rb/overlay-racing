// Pestaña PILOTOS: tabla para comparar lo guardado (memoria por número o un listado guardado) con lo que corre hoy.
// entries: { número de la fuente: { name, brand, country } }
import Icon from '../components/Icon';
import { FlagChip } from '../components/CountryFlag';
import { brandName, brandSrc } from '../utils/brands';
import { countryName } from '../utils/countries';

// Misma clave que el programa usa para reconocer a un piloto por su nombre (sin acentos, mayúsculas ni signos)
const nameKey = (n) => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const byNumber = (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || String(a).localeCompare(String(b));

function Data({ name, brand, country, muted, colors, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
      <span style={{ width: '24px', display: 'flex', justifyContent: 'center', flexShrink: 0 }} title={country ? countryName(country) : ''}>{country ? <FlagChip code={country} height={14} /> : null}</span>
      <span style={{ width: '30px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a2a', borderRadius: '3px', flexShrink: 0 }} title={brand ? brandName(brand) : ''}>
        {brand && <img src={brandSrc(brand)} alt="" style={{ maxHeight: '16px', maxWidth: '26px', objectFit: 'contain' }} />}
      </span>
      <span style={{ color: muted ? colors.textMuted : colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: name ? 'normal' : 'italic' }}>
        {name || t('pilotos.compareNoName')}{brand ? <span style={{ color: colors.textMuted }}> · {brandName(brand)}</span> : null}
      </span>
    </div>
  );
}

export default function RosterCompare({ entries, drivers, colors, t, onForget, canForget }) {
  const live = {};
  (drivers || []).forEach(d => { live[String(d.srcNumber || d.number)] = d; });
  const nums = Object.keys(entries || {}).sort(byNumber);
  if (!nums.length) return <div style={{ fontSize: '11px', color: colors.textMuted, fontStyle: 'italic', padding: '8px 0' }}>{t('pilotos.compareEmpty')}</div>;

  const status = (num) => {
    const d = live[num], e = entries[num];
    if (!d) return { label: t('pilotos.compareAbsent'), color: colors.textMuted };
    const savedName = e.name || '';
    if (savedName && nameKey(savedName) !== nameKey(d.srcName) && nameKey(savedName) !== nameKey(d.name)) return { label: t('pilotos.compareOther'), color: '#e67e22' };
    if ((e.brand && e.brand !== d.brand) || (e.country && e.country !== d.country)) return { label: t('pilotos.compareChanged'), color: '#f1c40f' };
    return { label: t('pilotos.compareSame'), color: '#2ecc71' };
  };
  const counts = nums.reduce((acc, n) => { const s = status(n).label; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  const cell = { padding: '5px 8px', borderBottom: `1px solid ${colors.border}`, verticalAlign: 'middle' };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10px', color: colors.textMuted, margin: '6px 0' }}>
        {Object.entries(counts).map(([k, v]) => <span key={k}>{k}: <b style={{ color: colors.textMain }}>{v}</b></span>)}
      </div>
      <div style={{ maxHeight: '320px', overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: colors.bgInput, color: colors.textMuted, textAlign: 'left', position: 'sticky', top: 0 }}>
              <th style={{ ...cell, width: '50px' }}>#</th>
              <th style={cell}>{t('pilotos.compareSaved')}</th>
              <th style={cell}>{t('pilotos.compareToday')}</th>
              <th style={{ ...cell, width: '120px' }}>{t('pilotos.compareStatus')}</th>
              {onForget && <th style={{ ...cell, width: '36px' }} />}
            </tr>
          </thead>
          <tbody>
            {nums.map(num => {
              const e = entries[num], d = live[num], st = status(num);
              return (
                <tr key={num}>
                  <td style={{ ...cell, fontWeight: 'bold', color: colors.textMain }}>#{num}</td>
                  <td style={cell}><Data name={e.name} brand={e.brand} country={e.country} colors={colors} t={t} /></td>
                  <td style={cell}>{d ? <Data name={d.name} brand={d.brand} country={d.country} colors={colors} t={t} /> : <span style={{ color: colors.textMuted }}>—</span>}</td>
                  <td style={{ ...cell, color: st.color, fontWeight: 'bold', fontSize: '10px' }}>{st.label}</td>
                  {onForget && (
                    <td style={{ ...cell, textAlign: 'right' }}>
                      {(!canForget || canForget(num)) && (
                        <button onClick={() => onForget(num)} title={t('pilotos.compareForget')} style={{ backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: '4px', padding: '2px 5px', cursor: 'pointer' }}><Icon name="close" /></button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
