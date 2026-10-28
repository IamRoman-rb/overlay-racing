// Batalla más relevante: el par de pilotos consecutivos con el menor intervalo entre sí.
// Se toma `diff` (o `gap`) como la diferencia con el piloto de adelante, igual que lo muestra la gráfica de batalla.
// Por encima de este intervalo (segundos) ya no se considera una batalla: el piloto que viene detrás no está al ataque.
export const BATTLE_MAX_GAP = 5;

// "+0.532", "0,532", "1:02.345", "0.532 s" -> segundos. Devuelve null si no hay un tiempo válido
// ("-", vacío, o vueltas de diferencia como "1 Lap" / "+1 VUELTA" / "1L").
export function parseGapSeconds(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === '-') return null;
  if (/lap|vuelt/.test(s) || /^\+?\d+\s*l$/.test(s)) return null;
  const m = s.replace(',', '.').replace(/^\+/, '').replace(/\s*s$/, '').match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const seconds = (m[1] ? parseInt(m[1], 10) * 60 : 0) + parseFloat(m[2]);
  return Number.isFinite(seconds) ? seconds : null;
}

// Devuelve { pos, gap, front, back, isClose } del par más cercano (pos = posición del piloto de adelante,
// que es la que se carga en la gráfica de batalla) o null si no hay ningún par con intervalo válido.
// Ante un empate gana el par que va más adelante en la carrera.
export function findMostRelevantBattle(drivers, maxGap = BATTLE_MAX_GAP) {
  if (!Array.isArray(drivers)) return null;
  const sorted = drivers
    .map(d => ({ d, pos: parseInt(d?.pos, 10) }))
    .filter(x => Number.isFinite(x.pos))
    .sort((a, b) => a.pos - b.pos);

  let best = null;
  for (let i = 1; i < sorted.length; i++) {
    const front = sorted[i - 1];
    const back = sorted[i];
    if (back.pos !== front.pos + 1) continue;
    const gap = parseGapSeconds(back.d.diff || back.d.gap);
    if (gap === null) continue;
    if (!best || gap < best.gap) best = { pos: front.pos, gap, front: front.d, back: back.d };
  }
  return best ? { ...best, isClose: best.gap <= maxGap } : null;
}
