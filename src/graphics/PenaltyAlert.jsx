export default function PenaltyAlert({ alert, config }) {
  if (!alert?.isVisible) return null;

  const pos = config?.positions?.penaltyAlert || { x: 1500, y: 750, scale: 1 };
  const isInvestigation = alert?.type === 'investigation';

  const bgColor = isInvestigation ? '#111111' : '#8b0000';
  const borderColor = isInvestigation ? '#ffcc00' : '#e74c3c';
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
        minWidth: '340px',
        maxWidth: '420px',
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
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
