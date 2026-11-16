import '../utils/contentAnim'; // inyecta los keyframes del vúmetro (caMic)
// Barritas que se mueven como un vúmetro (al lado del micrófono o del rol)
export function VoiceBars({ height = 12, color = '#fff', style }) {
  const w = Math.max(2, Math.round(height * 0.18));
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(1, Math.round(w * 0.7)), height, flexShrink: 0, ...style }}>
      {[0.55, 0.9, 0.4].map((h, i) => (
        <span key={i} style={{
          width: w, height: `${h * 100}%`, backgroundColor: color, borderRadius: 2,
          transformOrigin: 'center', animation: `caMic ${0.7 + i * 0.18}s ease-in-out ${i * 0.12}s infinite`
        }} />
      ))}
    </span>
  );
}

// Micrófono de los zócalos de relator, comentarista y notero. Con `live` le salen al lado las barritas del vúmetro.
export default function MicIcon({ size = 16, color = '#fff', live = false, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(2, size * 0.12), lineHeight: 0, flexShrink: 0, ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="2" width="6" height="12" rx="3" fill={color} fillOpacity="0.25" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8.5 22h7" />
      </svg>
      {live && <VoiceBars height={Math.round(size * 0.8)} color={color} />}
    </span>
  );
}
