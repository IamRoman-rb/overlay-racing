export default function DriversTable({ drivers, colors, activeDriverNumber, onToggleInfo }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontWeight: 'bold' }}>
      <thead>
        <tr style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
          <th style={{ padding: '10px 5px', width: '30px' }}>POS</th>
          <th style={{ padding: '10px 5px', width: '40px' }}>NUM</th>
          <th style={{ padding: '10px 5px' }}>PILOTO</th>
          <th style={{ padding: '10px 5px', textAlign: 'center' }}>VUELTAS</th>
          <th style={{ padding: '10px 5px' }}>ÚLTIMA V.</th>
          <th style={{ padding: '10px 5px' }}>DIFERENCIA</th>
          <th style={{ padding: '10px 5px' }}>T. TOTAL</th>
          <th style={{ padding: '10px 5px' }}>MEJOR V.</th>
          <th style={{ padding: '10px 5px', textAlign: 'center' }}>ACCIÓN</th>
        </tr>
      </thead>
      <tbody>
        {drivers.map((driver, index) => {
          // Detectamos si este es el piloto que está actualmente en pantalla
          const isActive = activeDriverNumber === driver.number;
          
          return (
            <tr key={index} style={{ 
              borderBottom: `1px solid ${colors.border}`, 
              backgroundColor: isActive ? 'rgba(52, 152, 219, 0.15)' : 'transparent' // Ilumina la fila si está activo
            }}>
              <td style={{ padding: '12px 5px', color: colors.yellow }}>{driver.pos}</td>
              <td style={{ padding: '12px 5px', color: colors.textMuted }}>{driver.number}</td>
              <td style={{ padding: '12px 5px', color: isActive ? '#fff' : colors.textMain }}>{driver.name.toUpperCase()}</td>
              <td style={{ padding: '12px 5px', textAlign: 'center', color: colors.textMuted }}>{driver.laps}</td>
              <td style={{ padding: '12px 5px', color: colors.green }}>{driver.lastLap}</td>
              <td style={{ padding: '12px 5px', color: colors.textMuted }}>{driver.diff}</td>
              <td style={{ padding: '12px 5px', color: colors.textMain }}>{driver.totalTime}</td>
              <td style={{ padding: '12px 5px', color: '#bdc3c7' }}>{driver.bestLap}</td>
              
              {/* NUEVO BOTÓN DE ACCIÓN */}
              <td style={{ padding: '12px 5px', textAlign: 'center' }}>
                <button 
                  onClick={() => onToggleInfo(driver)}
                  style={{
                    backgroundColor: isActive ? colors.red : '#3498db',
                    color: '#fff', border: 'none', padding: '6px 12px',
                    borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {isActive ? 'OCULTAR' : 'MOSTRAR'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}