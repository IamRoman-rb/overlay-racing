// Arma race/src/data/mapa.json (límites, provincias y ciudades del RADAR DEL CLIMA) a partir de Natural Earth
// (dominio público, https://www.naturalearthdata.com). Se corre a mano sólo si se quiere regenerar el mapa:
//
//   node scripts/build-map-data.cjs <carpeta con los .geojson>
//
// Archivos (https://github.com/nvkelso/natural-earth-vector/tree/master/geojson):
//   ne_50m_admin_0_countries.geojson, ne_10m_admin_1_states_provinces.geojson, ne_10m_populated_places_simple.geojson
//
// Formato de salida (compacto): coordenadas en centésimos de grado, enteras, en listas planas [lon, lat, dlon, dlat, ...]
// (el primer punto de cada anillo es absoluto y los demás son la diferencia con el anterior).
//   { countries: [[anillo, ...], ...], provinces: [[anillo, ...], ...], cities: [[nombre, lat, lon, población], ...] }
const fs = require('fs');
const path = require('path');

// Países con provincias y ciudades chicas (donde hay circuitos o se corre seguido). El resto: sólo límites y ciudades grandes.
const DETAIL = new Set(['AR', 'UY', 'CL', 'PY', 'BO', 'BR', 'PE', 'CO', 'EC', 'VE', 'MX', 'GB', 'IT', 'ES', 'PT', 'FR', 'DE', 'US']);

const dir = process.argv[2];
if (!dir) { console.error('Uso: node scripts/build-map-data.cjs <carpeta con los .geojson>'); process.exit(1); }
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

// Douglas-Peucker sobre un anillo [[lon, lat], ...]
function simplify(points, tol) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a]; const [bx, by] = points[b];
    const dx = bx - ax; const dy = by - ay; const len = Math.hypot(dx, dy) || 1e-12;
    let best = -1; let bestD = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

function rings(geometry, tol, minSize = 0.1, minPts = 4) {
  if (!geometry) return [];
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const out = [];
  polys.forEach(poly => poly.forEach(ring => {
    // Anillo cerrado (primer punto = último): se parte en dos mitades, si no Douglas-Peucker no ve ninguna distancia
    const mid = Math.floor(ring.length / 2);
    const s = ring.length < 8 ? ring : [...simplify(ring.slice(0, mid + 1), tol).slice(0, -1), ...simplify(ring.slice(mid), tol)];
    if (s.length < minPts) return;
    const flat = [];
    // Delta: el primer punto absoluto y después la diferencia con el anterior (números chicos = archivo chico)
    let px = 0; let py = 0;
    s.forEach(([lon, lat], i) => {
      const x = Math.round(lon * 100); const y = Math.round(lat * 100);
      if (i && x === px && y === py) return;
      flat.push(x - px, y - py);
      px = x; py = y;
    });
    // Islas diminutas fuera: no se ven a la escala del radar
    let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
    s.forEach(([lon, lat]) => { minX = Math.min(minX, lon); maxX = Math.max(maxX, lon); minY = Math.min(minY, lat); maxY = Math.max(maxY, lat); });
    if (flat.length >= minPts * 2 && (maxX - minX) + (maxY - minY) > minSize) out.push(flat);
  }));
  return out;
}

const countries = read('ne_50m_admin_0_countries.geojson').features
  .map(f => rings(f.geometry, 0.04, 0.25)).filter(r => r.length);

const iso = (p) => (p.iso_a2 && p.iso_a2 !== '-99' ? p.iso_a2 : p.ISO_A2 || p.adm0_a3 || '');
const provinces = read('ne_10m_admin_1_states_provinces.geojson').features
  .filter(f => DETAIL.has(iso(f.properties)))
  .map(f => rings(f.geometry, 0.03, 0.15)).filter(r => r.length);

const cities = read('ne_10m_populated_places_simple.geojson').features
  .map(f => f.properties)
  .filter(p => {
    const pop = Number(p.pop_max) || 0;
    return DETAIL.has(p.iso_a2) ? pop >= 40000 : pop >= 1000000 || p.adm0cap === 1;
  })
  .sort((a, b) => (Number(b.pop_max) || 0) - (Number(a.pop_max) || 0))
  .map(p => [p.name, Math.round(p.latitude * 100) / 100, Math.round(p.longitude * 100) / 100, Number(p.pop_max) || 0]);

const out = { source: 'Natural Earth (dominio público)', countries, provinces, cities };
const dest = path.join(__dirname, '..', 'race', 'src', 'data', 'mapa.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`mapa.json: ${countries.length} países, ${provinces.length} provincias, ${cities.length} ciudades, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
