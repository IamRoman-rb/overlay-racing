// Detecta los módulos modificados y los empaqueta; con --publish también los sube al servidor.
//
// Uso (CLI): node scripts/release-modules.cjs [--pack|--publish] [--all] [--notes "texto"] [módulo ...]
// Las funciones se exportan para poder probarlas (test/release-modules.test.cjs); el script sólo se ejecuta
// cuando se lo llama directamente.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const AdmZip = require('adm-zip');

const ROOT = path.resolve(__dirname, '..');
const MODULE_DIRS = ['race', 'football', 'streaming'];
const DEFAULT_SERVER = 'https://overlayracing.site';

function parseArgs(args) {
  const notesIndex = args.indexOf('--notes');
  return {
    publish: args.includes('--publish'),
    all: args.includes('--all'),
    notes: notesIndex >= 0 ? (args[notesIndex + 1] || '') : '',
    selected: args.filter((arg, index) => !arg.startsWith('--') && (notesIndex < 0 || index !== notesIndex + 1)),
  };
}

// Carga <root>/.env sin pisar variables que ya estén definidas en el entorno.
function loadEnvFile(root = ROOT, env = process.env) {
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(env, match[1])) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    env[match[1]] = value;
  }
}

function readManifest(dirName, root = ROOT) {
  const file = path.join(root, dirName, 'module.json');
  if (!fs.existsSync(file)) return null;
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!manifest.id || !manifest.version || !manifest.entry) throw new Error(`Manifiesto incompleto: ${dirName}/module.json`);
  return { dirName, dir: path.dirname(file), manifest };
}

function changed(dirName, root = ROOT) {
  try {
    const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', dirName], { cwd: root, encoding: 'utf8' });
    return status.trim().length > 0;
  } catch (error) {
    throw new Error(`No se pudo detectar cambios en Git para ${dirName}: ${error.message}`, { cause: error });
  }
}

function detectModules({ selected = [], all = false } = {}, { root = ROOT, moduleDirs = MODULE_DIRS, isChanged = changed } = {}) {
  const available = moduleDirs.map(dirName => readManifest(dirName, root)).filter(Boolean);
  const requested = selected.length ? available.filter(mod => selected.includes(mod.manifest.id) || selected.includes(mod.dirName)) : available;
  const unknown = selected.filter(name => !available.some(mod => mod.manifest.id === name || mod.dirName === name));
  if (unknown.length) throw new Error(`Módulo sin module.json o desconocido: ${unknown.join(', ')}`);
  const targets = all || selected.length ? requested : requested.filter(mod => isChanged(mod.dirName, root));
  if (!targets.length) throw new Error('No se detectaron módulos modificados. Usá --all para empaquetar/publicar todos los que tengan module.json.');
  return targets;
}

// Compila la interfaz del módulo con Vite (escribe <módulo>/dist).
function runViteBuild({ dir }, root = ROOT) {
  const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  execFileSync(process.execPath, [vite, 'build', '--config', path.join(dir, 'vite.config.js')], { cwd: root, stdio: 'inherit' });
}

// Arma el .zip del módulo con lo que necesita el launcher para ejecutarlo: module.json, el entry, dist y el logo
// (y en carrera, además, los scripts y datos que requiere su proceso principal).
function packageModule({ dirName, dir, manifest }, outDir) {
  const zip = new AdmZip();
  zip.addLocalFile(path.join(dir, 'module.json'));
  zip.addLocalFile(path.join(dir, manifest.entry));
  zip.addLocalFolder(path.join(dir, 'dist'), 'dist');
  const logo = dirName === 'race' ? path.join(dir, 'src', 'assets', 'logo.png') : path.join(dir, 'assets', 'logo.png');
  if (dirName === 'race') {
    zip.addLocalFolder(path.join(dir, 'src', 'scripts'), 'src/scripts');
    // Datos que usa el proceso principal (por ejemplo el índice de marcas que lee src/scripts/raceData.cjs)
    zip.addLocalFolder(path.join(dir, 'src', 'data'), 'src/data');
  }
  if (fs.existsSync(logo)) zip.addLocalFile(logo, dirName === 'race' ? 'src/assets' : 'assets');

  fs.mkdirSync(outDir, { recursive: true });
  const output = path.join(outDir, `${manifest.id}-${manifest.version}.zip`);
  zip.writeZip(output);
  return output;
}

function buildModule(mod, { root = ROOT, build = runViteBuild, outDir = path.join(root, 'release-modules'), log = console.log } = {}) {
  log(`\nCompilando ${mod.manifest.name || mod.manifest.id} (${mod.manifest.version})...`);
  build(mod, root);
  const output = packageModule(mod, outDir);
  log(`Paquete listo: ${output}`);
  return output;
}

async function publishModule({ manifest }, zipFile, { env = process.env, notes = '', fetchImpl = fetch, log = console.log } = {}) {
  const server = (env.OVERLAY_SERVER_URL || DEFAULT_SERVER).replace(/\/+$/, '');
  const user = env.OVERLAY_ADMIN_USER;
  const password = env.OVERLAY_ADMIN_PASSWORD;
  if (!user || !password) throw new Error('Configurá OVERLAY_ADMIN_USER y OVERLAY_ADMIN_PASSWORD en el archivo .env.');

  const loginRes = await fetchImpl(`${server}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password })
  });
  const login = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok || login.user?.role !== 'admin') throw new Error(login.error || 'Falló el inicio de sesión de administrador.');

  log(`Publicando ${manifest.id} ${manifest.version} en ${server}...`);
  const query = new URLSearchParams({ version: manifest.version, launcherApi: String(manifest.launcherApi || 1) });
  const releaseNotes = notes || env.OVERLAY_RELEASE_NOTES || '';
  if (releaseNotes) query.set('notes', releaseNotes);
  const response = await fetchImpl(`${server}/api/modules/${manifest.id}/releases?${query}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/zip' },
    body: fs.readFileSync(zipFile)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `El servidor respondió ${response.status}`);
  log(`Publicado ${manifest.id} ${manifest.version}. Firma del servidor: ${data.release?.signed ? 'correcta' : 'no disponible'}.`);
  return data;
}

async function main(argv = process.argv.slice(2), deps = {}) {
  const { root = ROOT, env = process.env, build, isChanged, fetchImpl, log, outDir } = deps;
  const options = parseArgs(argv);
  loadEnvFile(root, env);
  const modules = detectModules(options, { root, isChanged });
  const results = [];
  for (const mod of modules) {
    const zipFile = buildModule(mod, { root, build, outDir, log });
    if (options.publish) await publishModule(mod, zipFile, { env, notes: options.notes, fetchImpl, log });
    results.push({ id: mod.manifest.id, zipFile, published: options.publish });
  }
  return results;
}

module.exports = { parseArgs, loadEnvFile, readManifest, changed, detectModules, packageModule, buildModule, publishModule, main, MODULE_DIRS };

if (require.main === module) {
  main().catch(error => { console.error(`\nError: ${error.message}`); process.exitCode = 1; });
}
