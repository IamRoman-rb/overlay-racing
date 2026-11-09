import { useState } from 'react';
import { getGraphicFrame } from '../utils/raceVisuals';
import { getElitePalette, ELITE_FONT, photoUrl, rgba, numberColor, textOnColor } from '../utils/elite';

const thousands = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// RÉCORD DEL CIRCUITO (estilo Elite): el récord histórico cargado en la pestaña CIRCUITO > DATOS, con su piloto.
export default function CircuitRecord({ config, isVisible, id = 'circuitRecord' }) {
  const { wrapperStyle, bRad } = getGraphicFrame(config, id, isVisible, { x: 1500, y: 700, scale: 1 }, 45);
  const pal = getElitePalette(config);
  const [photoOk, setPhotoOk] = useState(true);
  const photo = config?.recordNumber && config?.photosPath ? photoUrl(config.recordNumber) : null;
  const lengthM = parseFloat(String(config?.circuitLength || '').replace(',', '.'));
  const name = String(config?.recordDriver || '').trim();
  const [first, ...rest] = name.split(/\s+/);
  const numBg = numberColor(config?.recordNumber);

  return (
    <div style={wrapperStyle}>
      <div style={{ width: '360px', fontFamily: ELITE_FONT, color: pal.text, textTransform: 'uppercase', borderRadius: bRad, overflow: 'hidden', boxShadow: '0 14px 34px rgba(0,0,0,0.55)', background: pal.background }}>
        <div style={{ backgroundColor: pal.red, textAlign: 'center', fontSize: '16px', fontWeight: 700, letterSpacing: '1px', padding: '4px 0' }}>RÉCORD DEL CIRCUITO</div>
        <div style={{ position: 'relative', padding: '10px 16px 0' }}>
          {/* Rayas diagonales de fondo */}
          <div style={{ position: 'absolute', right: 0, top: '70px', width: '120px', height: '80px', backgroundImage: `repeating-linear-gradient(115deg, ${rgba('#ffffff', 0.14)} 0 3px, transparent 3px 11px)` }} />
          <div style={{ fontSize: '19px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{config?.circuitName || config?.circuito || 'CIRCUITO'}</div>
          <div style={{ display: Number.isFinite(lengthM) && lengthM > 0 ? 'block' : 'none', fontSize: '12px', textAlign: 'center', color: pal.muted }}>{Number.isFinite(lengthM) ? `${thousands(lengthM)} m` : ''}</div>
          <div style={{ display: config?.circuitCity ? 'block' : 'none', fontSize: '12px', textAlign: 'center', color: pal.muted }}>{config?.circuitCity}</div>

          <div style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center', color: '#3db6ff', letterSpacing: '1px', marginTop: '8px' }}>RÉCORD</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontSize: '40px', fontWeight: 700, lineHeight: 1 }}>{config?.recordTime || '-:--.---'}</span>
            <span style={{ display: config?.recordSpeed ? 'inline' : 'none', fontSize: '13px', fontWeight: 600, marginLeft: '8px', color: pal.muted }}>{config?.recordSpeed} km/h</span>
          </div>
          <div style={{ fontSize: '12px', textAlign: 'center', color: pal.muted, marginTop: '2px' }}>{[config?.recordDate, config?.recordEvent].filter(Boolean).join(' · ')}</div>

          <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '8px', minHeight: '70px' }}>
            <div style={{ width: '72px', height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
              {photo && photoOk && <img src={photo} alt="" onError={() => setPhotoOk(false)} style={{ maxHeight: '70px', maxWidth: '72px', objectFit: 'contain' }} />}
            </div>
            <div style={{ display: name ? 'flex' : 'none', flexDirection: 'column', marginLeft: '10px', paddingBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ display: config?.recordNumber ? 'inline-block' : 'none', backgroundColor: numBg, color: textOnColor(numBg), fontSize: '12px', fontWeight: 800, padding: '0 5px', marginRight: '6px' }}>{config?.recordNumber}</span>
                <span style={{ fontSize: '17px', fontWeight: 700 }}>{first}</span>
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{rest.join(' ')}</span>
              <span style={{ fontSize: '11px', color: pal.muted }}>{config?.recordTeam}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
