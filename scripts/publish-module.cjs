// Sube al servidor el paquete generado con `npm run module:pack`. El servidor lo firma y desde ese momento todos los
// clientes cuya licencia incluya el módulo reciben la versión nueva la próxima vez que lo abran.
//
// Variables de entorno (PowerShell):
//   $env:OVERLAY_SERVER_URL = "https://overlayracing.site"     (opcional; por defecto ese)
//   $env:OVERLAY_ADMIN_USER = "roman"
//   $env:OVERLAY_ADMIN_PASSWORD = "..."
//   npm run module:publish -- "notas de la versión"             (las notas son opcionales)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'module.json'), 'utf-8'));
const server = (process.env.OVERLAY_SERVER_URL || 'https://overlayracing.site').replace(/\/+$/, '');
const { OVERLAY_ADMIN_USER: user, OVERLAY_ADMIN_PASSWORD: password } = process.env;
const notes = process.argv.slice(2).join(' ').trim();

async function main() {
  if (!user || !password) throw new Error('Definí OVERLAY_ADMIN_USER y OVERLAY_ADMIN_PASSWORD (el usuario admin del servidor).');

  const zipFile = path.join(root, 'release-modules', `${manifest.id}-${manifest.version}.zip`);
  if (!fs.existsSync(zipFile)) throw new Error(`No existe ${zipFile}. Corré primero: npm run module:pack`);

  const loginRes = await fetch(`${server}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password })
  });
  const login = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok || login.user?.role !== 'admin') throw new Error(login.error || 'El login de admin falló.');

  console.log(`Subiendo ${manifest.id} ${manifest.version} a ${server}...`);
  const query = new URLSearchParams({ version: manifest.version, launcherApi: String(manifest.launcherApi || 1) });
  if (notes) query.set('notes', notes);
  const res = await fetch(`${server}/api/modules/${manifest.id}/releases?${query}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/zip' },
    body: fs.readFileSync(zipFile)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `El servidor respondió ${res.status}`);

  console.log(`Publicado. Firmado: ${data.release.signed ? 'sí' : 'NO (falta RELEASE_SIGNING_KEY en el servidor: los instaladores lo van a rechazar)'}`);
}

main().catch(err => { console.error(`\nError: ${err.message}`); process.exit(1); });
