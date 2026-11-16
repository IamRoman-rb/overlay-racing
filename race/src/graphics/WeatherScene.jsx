import { useMemo } from 'react';

// ESCENA DEL CLIMA: capa animada que se pone detrás del contenido de una gráfica grande (presentación del circuito):
// lluvia (más o menos fuerte según el código), nubes que pasan, nieve, niebla y tormenta con relámpagos.
// Con cielo despejado no se dibuja nada: el sol animado no se veía realista sobre el fondo de la gráfica y se sacó.
// Todo con animaciones CSS (transform / opacity), sin `inset` ni `gap`, para que ande en el Chromium de vMix 23.
// running = false pausa las animaciones (gráfica oculta) para no gastar procesador.

// Números pseudoaleatorios fijos: la escena se ve igual en cada render (y en la vista previa)
function seeded(seed) {
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
}

// Intensidad según el código de Open-Meteo: llovizna < lluvia < chaparrón / tormenta
function intensity(code, category) {
  if (category === 'storm') return 1.25;
  if (code >= 51 && code <= 57) return 0.45;
  if (code === 61 || code === 80) return 0.7;
  if (code === 65 || code === 82) return 1.2;
  return 0.9;
}

const CLOUD_PATH = 'M30 70 Q8 70 10 52 Q12 36 32 38 Q38 16 62 18 Q84 8 98 28 Q122 24 126 46 Q146 50 142 66 Q140 72 128 72 Z';

const Cloud = ({ width, color, opacity }) => (
  <svg width={width} height={width * 0.55} viewBox="0 0 150 80" style={{ display: 'block', opacity }}>
    <path d={CLOUD_PATH} fill={color} />
  </svg>
);

const WEATHER_SCENES = ['partlyCloudy','cloudy', 'fog', 'rain', 'snow', 'storm'];

export default function WeatherScene({ category, code = 0, width, height, running = true, idPrefix = 'wx' }) {
  const p = idPrefix;
  const scene = useMemo(() => {
    const rnd = seeded(Math.round(width * 7 + height * 13) + (code || 1));
    const k = intensity(code, category);
    const rainy = category === 'rain' || category === 'storm';
    const drops = rainy ? Array.from({ length: Math.round(120 * k * (width / 980)) }, () => ({
      x: rnd() * (width + height * 0.3), len: 14 + rnd() * 16, dur: 0.42 + rnd() * 0.3, delay: -rnd() * 2, op: 0.35 + rnd() * 0.45
    })) : [];
    const splashes = rainy ? Array.from({ length: Math.round(26 * k) }, () => ({ x: rnd() * width, y: height - 4 - rnd() * 40, delay: -rnd() * 1.2, dur: 0.5 + rnd() * 0.4 })) : [];
    const flakes = category === 'snow' ? Array.from({ length: Math.round(80 * (width / 980)) }, () => ({
      x: rnd() * width, r: 1.5 + rnd() * 2.8, dur: 6 + rnd() * 7, delay: -rnd() * 13, swayDur: 2 + rnd() * 2.5
    })) : [];
    const cloudCount = { partlyCloudy: 3, cloudy: 6, rain: 5, storm: 6, snow: 4, fog: 2 }[category] || 0;
    const clouds = Array.from({ length: cloudCount }, (_, i) => ({
      y: rnd() * height * 0.38 - 20, w: 180 + rnd() * 200, dur: 55 + rnd() * 50, delay: -((i + rnd()) / cloudCount) * 90, op: 0.55 + rnd() * 0.4
    }));
    return { drops, splashes, flakes, clouds, k };
  }, [category, code, width, height]);

  if (!WEATHER_SCENES.includes(category)) return null;
  const dark = category === 'rain' || category === 'storm';
  const cloudColor = category === 'storm' ? '#3a4150' : dark ? '#6b7584' : category === 'snow' ? '#d9e2ec' : '#ffffff';
  const cloudAlpha = category === 'partlyCloudy' ? 0.22 : dark ? 0.55 : 0.28;
  const fall = height + 60;
  const slant = Math.round(height * 0.22);

  // Tinte general de la escena
  const tint = {
    partlyCloudy: 'none',
    cloudy: 'linear-gradient(180deg, rgba(120,130,145,0.22) 0%, rgba(0,0,0,0) 70%)',
    fog: 'linear-gradient(180deg, rgba(200,210,220,0.10) 0%, rgba(200,210,220,0.22) 100%)',
    rain: 'linear-gradient(180deg, rgba(20,35,60,0.40) 0%, rgba(10,20,35,0.15) 100%)',
    storm: 'linear-gradient(180deg, rgba(10,15,30,0.55) 0%, rgba(10,15,30,0.20) 100%)',
    snow: 'linear-gradient(180deg, rgba(190,210,235,0.18) 0%, rgba(0,0,0,0) 80%)'
  }[category];

  const css = `
    @keyframes ${p}Fall { from { transform: translate(0, -40px) rotate(13deg); } to { transform: translate(-${slant}px, ${fall}px) rotate(13deg); } }
    @keyframes ${p}Splash { 0% { transform: scale(0.2); opacity: 0.9; } 100% { transform: scale(1.4); opacity: 0; } }
    @keyframes ${p}Snow { from { transform: translateY(-20px); } to { transform: translateY(${fall}px); } }
    @keyframes ${p}Sway0 { from { transform: translateX(0); } to { transform: translateX(8px); } }
    @keyframes ${p}Sway1 { from { transform: translateX(0); } to { transform: translateX(15px); } }
    @keyframes ${p}Sway2 { from { transform: translateX(0); } to { transform: translateX(-12px); } }
    @keyframes ${p}Cloud { from { transform: translateX(-420px); } to { transform: translateX(${width + 40}px); } }
    @keyframes ${p}Flash { 0%, 84% { opacity: 0; } 85% { opacity: 0.55; } 86% { opacity: 0.05; } 88% { opacity: 0.4; } 92%, 100% { opacity: 0; } }
    @keyframes ${p}Fog { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .${p}-paused, .${p}-paused * { animation-play-state: paused !important; }
  `;
  const layer = { position: 'absolute', top: 0, left: 0, width: `${width}px`, height: `${height}px` };

  return (
    <div className={running ? undefined : `${p}-paused`} style={{ ...layer, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <style>{css}</style>
      <div style={{ ...layer, background: tint }} />

      {/* NIEBLA: bandas que se deslizan */}
      {category === 'fog' && [0.25, 0.55, 0.8].map((y, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: `${y * height - 80}px`, width: `${width * 2}px`, height: '160px', opacity: 0.55 - i * 0.08,
          background: 'radial-gradient(22% 50% at 25% 50%, rgba(220,228,236,0.6) 0%, rgba(220,228,236,0) 100%), radial-gradient(22% 50% at 75% 50%, rgba(220,228,236,0.6) 0%, rgba(220,228,236,0) 100%), radial-gradient(14% 40% at 50% 50%, rgba(220,228,236,0.4) 0%, rgba(220,228,236,0) 100%)',
          animation: `${p}Fog ${38 + i * 14}s linear ${-i * 9}s infinite` }} />
      ))}

      {/* NUBES que cruzan */}
      {scene.clouds.map((c, i) => (
        <div key={`c${i}`} style={{ position: 'absolute', left: 0, top: `${c.y}px`, animation: `${p}Cloud ${c.dur.toFixed(1)}s linear ${c.delay.toFixed(1)}s infinite` }}>
          <Cloud width={c.w} color={cloudColor} opacity={cloudAlpha * c.op} />
        </div>
      ))}

      {/* RELÁMPAGO: destello de toda la escena y un rayo */}
      {category === 'storm' && (
        <>
          <div style={{ ...layer, backgroundColor: '#dfe8ff', opacity: 0, animation: `${p}Flash 6.5s linear infinite` }} />
          <svg width="90" height={height * 0.7} viewBox="0 0 90 200" preserveAspectRatio="none" style={{ position: 'absolute', left: `${width * 0.62}px`, top: '10px', opacity: 0, animation: `${p}Flash 6.5s linear infinite` }}>
            <polyline points="55,0 35,70 52,72 28,140 46,142 20,200" fill="none" stroke="#fffbe0" strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </>
      )}

      {/* LLUVIA: gotas inclinadas y salpicaduras abajo */}
      {scene.drops.map((d, i) => (
        <div key={`d${i}`} style={{ position: 'absolute', left: `${d.x.toFixed(1)}px`, top: 0, width: '2px', height: `${d.len.toFixed(0)}px`, opacity: d.op,
          background: 'linear-gradient(180deg, rgba(190,215,255,0) 0%, rgba(190,215,255,0.9) 100%)',
          animation: `${p}Fall ${d.dur.toFixed(2)}s linear ${d.delay.toFixed(2)}s infinite` }} />
      ))}
      {scene.splashes.map((s, i) => (
        <div key={`s${i}`} style={{ position: 'absolute', left: `${s.x.toFixed(0)}px`, top: `${s.y.toFixed(0)}px`, width: '12px', height: '4px', borderRadius: '50%', border: '1px solid rgba(190,215,255,0.7)', boxSizing: 'border-box',
          animation: `${p}Splash ${s.dur.toFixed(2)}s ease-out ${s.delay.toFixed(2)}s infinite` }} />
      ))}

      {/* NIEVE: copos que caen y se mecen */}
      {scene.flakes.map((f, i) => (
        <div key={`f${i}`} style={{ position: 'absolute', left: `${f.x.toFixed(0)}px`, top: 0, animation: `${p}Snow ${f.dur.toFixed(1)}s linear ${f.delay.toFixed(1)}s infinite` }}>
          <div style={{ width: `${(f.r * 2).toFixed(1)}px`, height: `${(f.r * 2).toFixed(1)}px`, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 0 4px rgba(255,255,255,0.8)',
            animation: `${p}Sway${i % 3} ${f.swayDur.toFixed(1)}s ease-in-out infinite alternate` }} />
        </div>
      ))}
    </div>
  );
}
