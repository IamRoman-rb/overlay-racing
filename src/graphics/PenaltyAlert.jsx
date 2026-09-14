import { getSkinStyle, SKIN_FORMATS } from '../utils/skinStyles';

function CardFormat({ alert, config, pos, skinFormat }) {
  const isInvestigation = alert?.type === 'investigation';
  const bgColor = isInvestigation ? '#111111' : '#8b0000';
  const borderColor = isInvestigation ? '#ffcc00' : '#e74c3c';
  const badgeText = isInvestigation ? 'BAJO INVESTIGACIÓN' : 'SANCIÓN';
  const badgeIcon = isInvestigation ? '🔎' : '🚫';
  const radius = config?.[`borderRadius_penaltyAlert`] || '6px';
  const skin = skinFormat ? getSkinStyle(skinFormat, { themeMain: '#000000', themeAccent: borderColor }) : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pos?.x ?? 1500}px`,
        top: `${pos?.y ?? 750}px`,
        transform: `scale(${pos?.scale ?? 1})`,
        transformOrigin: 'top left',
        minWidth: '340px',
        maxWidth: '420px',
        backgroundColor: skin ? skin.background : bgColor,
        border: skin ? skin.border : `2px solid ${borderColor}`,
        borderRadius: radius,
        boxShadow: skin ? skin.boxShadow : '0 4px 20px rgba(0,0,0,0.6)',
        backdropFilter: skin?.backdropFilter,
        color: '#ffffff',
        fontFamily: config?.fontFamily || 'Arial, sans-serif',
        overflow: 'hidden',
        zIndex: 500
      }}
    >
      <div
        style={{
          backgroundColor: skin ? 'transparent' : borderColor,
          borderBottom: skin ? `1px solid ${borderColor}` : 'none',
          color: skin ? borderColor : (isInvestigation ? '#000000' : '#ffffff'),
          padding: '6px 14px',
          fontSize: '13px',
          fontWeight: 900,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>{badgeIcon}</span>
        <span>{badgeText}</span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.5px', marginBottom: alert?.reason ? '6px' : 0 }}>
          {alert?.driverNumber ? `#${alert.driverNumber} ` : ''}{alert?.driverName || 'PILOTO'}
        </div>
        {alert?.reason && (
          <div style={{ fontSize: '13px', color: '#e0e0e0', lineHeight: 1.4 }}>
            {alert.reason}
          </div>
        )}
      </div>
    </div>
  );
}

function F1BarFormat({ alert, config, pos }) {
  const isInvestigation = alert?.type === 'investigation';
  const badgeBg = isInvestigation ? '#ffcc00' : '#e10600';
  const badgeColor = isInvestigation ? '#000000' : '#ffffff';
  const badgeText = isInvestigation ? 'BAJO INVESTIGACIÓN' : 'SANCIÓN';
  const radius = config?.[`borderRadius_penaltyAlert`] ?? '0px';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pos?.x ?? 1500}px`,
        top: `${pos?.y ?? 40}px`,
        transform: `scale(${pos?.scale ?? 1})`,
        transformOrigin: 'top left',
        display: 'flex',
        alignItems: 'stretch',
        height: '44px',
        minWidth: '520px',
        maxWidth: '900px',
        backgroundColor: 'rgba(10, 10, 10, 0.92)',
        borderTop: `2px solid ${badgeBg}`,
        borderRadius: radius,
        boxShadow: '0 3px 14px rgba(0,0,0,0.6)',
        color: '#ffffff',
        fontFamily: config?.fontFamily || 'Arial, sans-serif',
        overflow: 'hidden',
        zIndex: 500
      }}
    >
      <div
        style={{
          backgroundColor: badgeBg,
          color: badgeColor,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          fontSize: '13px',
          fontWeight: 900,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        {badgeText}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
        <span style={{ fontSize: '16px', fontWeight: 900, whiteSpace: 'nowrap' }}>
          {alert?.driverNumber ? `#${alert.driverNumber} ` : ''}{(alert?.driverName || 'PILOTO').toUpperCase()}
        </span>
      </div>

      {alert?.reason && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderLeft: '1px solid rgba(255,255,255,0.15)',
            fontSize: '13px',
            color: '#dddddd',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {alert.reason}
        </div>
      )}
    </div>
  );
}

function MinimalFormat({ alert, config, pos }) {
  const isInvestigation = alert?.type === 'investigation';
  const accentColor = isInvestigation ? '#ffcc00' : '#e74c3c';
  const badgeText = isInvestigation ? 'BAJO INVESTIGACIÓN' : 'SANCIÓN';
  const badgeIcon = isInvestigation ? '🔎' : '🚫';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pos?.x ?? 1500}px`,
        top: `${pos?.y ?? 750}px`,
        transform: `scale(${pos?.scale ?? 1})`,
        transformOrigin: 'top left',
        fontFamily: config?.fontFamily || 'Arial, sans-serif',
        zIndex: 500
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ color: accentColor, fontWeight: '900', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
          {badgeIcon} {badgeText}
        </span>
        <span style={{ color: '#fff', fontSize: '24px', fontWeight: '900', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
          {alert?.driverNumber ? `#${alert.driverNumber} ` : ''}{alert?.driverName || 'PILOTO'}
        </span>
        {alert?.reason && (
          <span style={{ color: '#ddd', fontSize: '14px', textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>
            {alert.reason}
          </span>
        )}
      </div>
    </div>
  );
}

function CornerFormat({ alert, config, pos }) {
  const isInvestigation = alert?.type === 'investigation';
  const accentColor = isInvestigation ? '#ffcc00' : '#e10600';
  const badgeText = isInvestigation ? 'BAJO INVESTIGACIÓN' : 'SANCIÓN';
  const badgeIcon = isInvestigation ? '🔎' : '🚫';
  const radius = config?.[`borderRadius_penaltyAlert`] || '0 8px 8px 0';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pos?.x ?? 1500}px`,
        top: `${pos?.y ?? 750}px`,
        transform: `scale(${pos?.scale ?? 1})`,
        transformOrigin: 'top left',
        display: 'flex', alignItems: 'stretch',
        maxWidth: '460px',
        backgroundColor: 'rgba(10,10,10,0.92)',
        borderRadius: radius,
        borderLeft: `8px solid ${accentColor}`,
        boxShadow: '0 5px 15px rgba(0,0,0,0.6)',
        color: '#ffffff',
        fontFamily: config?.fontFamily || 'Arial, sans-serif',
        overflow: 'hidden',
        zIndex: 500
      }}
    >
      <div style={{ padding: '10px 18px' }}>
        <span style={{ color: accentColor, fontWeight: '900', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {badgeIcon} {badgeText}
        </span><br />
        <span style={{ fontSize: '18px', fontWeight: '900' }}>
          {alert?.driverNumber ? `#${alert.driverNumber} ` : ''}{alert?.driverName || 'PILOTO'}
        </span>
        {alert?.reason && (
          <div style={{ fontSize: '12px', color: '#ccc', marginTop: '3px' }}>
            {alert.reason}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PenaltyAlert({ alert, config }) {
  if (!alert?.isVisible) return null;

  const validFormats = ['card', 'f1bar', 'minimal', 'corner', ...SKIN_FORMATS];
  const format = validFormats.includes(config?.penaltyAlertFormat) ? config.penaltyAlertFormat : 'card';
  const defaultPos = format === 'f1bar' ? { x: 500, y: 30, scale: 1 } : { x: 1500, y: 750, scale: 1 };
  const pos = config?.positions?.penaltyAlert || defaultPos;

  if (format === 'f1bar') {
    return <F1BarFormat alert={alert} config={config} pos={pos} />;
  }
  if (format === 'minimal') {
    return <MinimalFormat alert={alert} config={config} pos={pos} />;
  }
  if (format === 'corner') {
    return <CornerFormat alert={alert} config={config} pos={pos} />;
  }
  if (SKIN_FORMATS.includes(format)) {
    return <CardFormat alert={alert} config={config} pos={pos} skinFormat={format} />;
  }
  return <CardFormat alert={alert} config={config} pos={pos} />;
}
