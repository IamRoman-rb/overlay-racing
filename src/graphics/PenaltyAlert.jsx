function CardFormat({ alert, config, pos }) {
  const isInvestigation = alert?.type === 'investigation';
  const bgColor = isInvestigation ? '#111111' : '#8b0000';
  const borderColor = isInvestigation ? '#ffcc00' : '#e74c3c';
  const badgeText = isInvestigation ? 'BAJO INVESTIGACIÓN' : 'SANCIÓN';
  const badgeIcon = isInvestigation ? '🔎' : '🚫';
  const radius = config?.[`borderRadius_penaltyAlert`] || '6px';

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
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: radius,
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        color: '#ffffff',
        fontFamily: config?.fontFamily || 'Arial, sans-serif',
        overflow: 'hidden',
        zIndex: 500
      }}
    >
      <div
        style={{
          backgroundColor: borderColor,
          color: isInvestigation ? '#000000' : '#ffffff',
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

export default function PenaltyAlert({ alert, config }) {
  if (!alert?.isVisible) return null;

  const format = config?.penaltyAlertFormat === 'f1bar' ? 'f1bar' : 'card';
  const defaultPos = format === 'f1bar' ? { x: 500, y: 30, scale: 1 } : { x: 1500, y: 750, scale: 1 };
  const pos = config?.positions?.penaltyAlert || defaultPos;

  if (format === 'f1bar') {
    return <F1BarFormat alert={alert} config={config} pos={pos} />;
  }
  return <CardFormat alert={alert} config={config} pos={pos} />;
}
