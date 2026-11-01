// Detecta los módulos modificados y los empaqueta; con --publish también los sube al servidor.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const AdmZip = require('adm-zip');

const root = path.resolve(__dirname, '..');
const moduleDirs = ['race', 'football', 'streaming'];
const args = process.argv.slice(2);
const publish = args.includes('--publish');
const all = args.includes('--all');
const notesIndex = args.indexOf('--notes');
const cliNotes = notesIndex >= 0 ? (args[notesIndex + 1] || '') : '';
const selected = args.filter((arg, index) => !arg.startsWith('--') && (notesIndex < 0 || index !== notesIndex + 1));

function loadEnvFile() {
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(process.env, match[1])) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    process.env[match[1]] = value;
  }
}

function readManifest(dirName) {
  const file = path.join(root, dirName, 'module.json');
  if (!fs.existsSync(file)) return null;
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!manifest.id || !manifest.version || !manifest.entry) throw new Error(`Manifiesto incompleto: ${dirName}/module.json`);
  return { dirName, dir: path.dirname(file), manifest };
}

function changed(dirName) {
  try {
    const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', dirName], { cwd: root, encoding: 'utf8' });
    return status.trim().length > 0;
  } catch (error) {
    throw new Error(`No se pudo detectar cambios en Git para ${dirName}: ${error.message}`);
  }
}

function detectModules() {
  const available = moduleDirs.map(readManifest).filter(Boolean);
  const requested = selected.length ? available.filter(mod => selected.includes(mod.manifest.id) || selected.includes(mod.dirName)) : available;
  const unknown = selected.filter(name => !available.some(mod => mod.manifest.id === name || mod.dirName === name));
  if (unknown.length) throw new Error(`Módulo sin module.json o desconocido: ${unknown.join(', ')}`);
  const targets = all || selected.length ? requested : requested.filter(mod => changed(mod.dirName));
  if (!targets.length) throw new Error('No se detectaron módulos modificados. Usá --all para empaquetar/publicar todos los que tengan module.json.');
  return targets;
}

function buildModule({ dirName, dir, manifest }) {
  console.log(`\nCompilando ${manifest.name || manifest.id} (${manifest.version})...`);
  const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  execFileSync(process.execPath, [vite, 'build', '--config', path.join(dir, 'vite.config.js')], { cwd: root, stdio: 'inherit' });

  const zip = new AdmZip();
  zip.addLocalFile(path.join(dir, 'module.json'));
  zip.addLocalFile(path.join(dir, manifest.entry));
  zip.addLocalFolder(path.join(dir, 'dist'), 'dist');
  const logo = dirName === 'race' ? path.join(dir, 'src', 'assets', 'logo.png') : path.join(dir, 'assets', 'logo.png');
  if (dirName === 'race') zip.addLocalFolder(path.join(dir, 'src', 'scripts'), 'src/scripts');
  if (fs.existsSync(logo)) zip.addLocalFile(logo, dirName === 'race' ? 'src/assets' : 'assets');

  const outDir = path.join(root, 'release-modules');
  fs.mkdirSync(outDir, { recursive: true });
  const output = path.join(outDir, `${manifest.id}-${manifest.version}.zip`);
  zip.writeZip(output);
  console.log(`Paquete listo: ${output}`);
  return output;
}

async function publishModule({ manifest }, zipFile) {
  const server = (process.env.OVERLAY_SERVER_URL || 'https://overlayracing.site').replace(/\/+$/, '');
  const user = process.env.OVERLAY_ADMIN_USER;
  const password = process.env.OVERLAY_ADMIN_PASSWORD;
  if (!user || !password) throw new Error('Configurá OVERLAY_ADMIN_USER y OVERLAY_ADMIN_PASSWORD en el archivo .env.');

  const loginRes = await fetch(`${server}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password })
  });
  const login = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok || login.user?.role !== 'admin') throw new Error(login.error || 'Falló el inicio de sesión de administrador.');

  console.log(`Publicando ${manifest.id} ${manifest.version} en ${server}...`);
  const query = new URLSearchParams({ version: manifest.version, launcherApi: String(manifest.launcherApi || 1) });
  const notes = cliNotes || process.env.OVERLAY_RELEASE_NOTES || '';
  if (notes) query.set('notes', notes);
  const response = await fetch(`${server}/api/modules/${manifest.id}/releases?${query}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/zip' },
    body: fs.readFileSync(zipFile)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `El servidor respondió ${response.status}`);
  console.log(`Publicado ${manifest.id} ${manifest.version}. Firma del servidor: ${data.release?.signed ? 'correcta' : 'no disponible'}.`);
}

async function main() {
  loadEnvFile();
  const modules = detectModules();
  for (const mod of modules) {
    const zipFile = buildModule(mod);
    if (publish) await publishModule(mod, zipFile);
  }
}

main().catch(error => { console.error(`\nError: ${error.message}`); process.exitCode = 1; });
