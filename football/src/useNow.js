import { useEffect, useState } from 'react';

// Reloj de pared que refresca la gráfica varias veces por segundo (para el cronómetro y el fin de las alertas)
export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
