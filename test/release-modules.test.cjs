// scripts/release-modules.cjs: argumentos, .env, detección de módulos, armado del .zip y publicación.
// La publicación se prueba contra un servidor falso en 127.0.0.1 con credenciales de prueba: nunca sale a la red
// ni publica nada. Al final, el paquete que arma el script se instala y se inicia con el launcher real.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const AdmZip = require('adm-zip');
const rm = require('../scripts/release-modules.cjs');
const {
  tempDir, createFakeElectron, loadWithFakeElectron, createSigner, useTestPublicKey, startFakeServer,
} = require('./helpers/launcherHarness.cjs');

function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

// Repo de juguete con dos módulos (carrera y fútbol) ya compilados.
function fixtureRepo(t) {
  const root = tempDir('overlay-release-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeFiles(root, {
    'race/module.json': JSON.stringify({ id: 'racing', name: 'Carrera', version: '3.0.0', entry: 'main.cjs', launcherApi: 1 }),
    'race/main.cjs': "const d = require('./src/scripts/helper.cjs'); module.exports.start = (ctx) => { global.__raceStarted = { ctx, d }; return 'race-ok'; };",
    'race/dist/index.html': '<!doctype html>',
    'race/dist/assets/index-abc.js': 'console.log(1)',
    'race/src/scripts/helper.cjs': "module.exports = require('../data/info.json');",
    'race/src/data/info.json': '{"ok":true}',
    'race/src/assets/logo.png': 'PNG',
    'race/src/windows/NoVa.jsx': 'export default 1', // código de la interfaz: ya va compilado en dist
    'football/module.json': JSON.stringify({ id: 'football', version: '0.1.0', entry: 'main.cjs' }),
    'football/main.cjs': 'module.exports.start = () => {};',
    'football/dist/index.html': '<!doctype html>',
    'football/assets/logo.png': 'PNG',
    'football/src/App.jsx': 'export default 1',
  });
  return root;
}

const entriesOf = (zipFile) => new AdmZip(zipFile).getEntries().filter(e => !e.isDirectory).map(e => e.entryName.replace(/\\/g, '/')).sort();

test('argumentos: módulos elegidos, --all, --publish y --notes (el texto de las notas no es un módulo)', () => {
  assert.deepEqual(rm.parseArgs(['--publish', '--notes', 'arreglos varios', 'race']), { publish: true, all: false, notes: 'arreglos varios', selected: ['race'] });
  assert.deepEqual(rm.parseArgs(['--pack', '--all']), { publish: false, all: true, notes: '', selected: [] });
  assert.deepEqual(rm.parseArgs(['football', 'racing']).selected, ['football', 'racing']);
});

test('.env: comillas, comentarios y export; no pisa variables ya definidas', (t) => {
  const root = tempDir('overlay-env-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, '.env'), [
    '# comentario', '', 'export A=uno', 'B="dos # no es comentario"', "C='tres'", 'D=cuatro # comentario', 'YA=del-archivo', 'no es una variable',
  ].join('\r\n'));
  const env = { YA: 'del-entorno' };
  rm.loadEnvFile(root, env);
  assert.deepEqual(env, { YA: 'del-entorno', A: 'uno', B: 'dos # no es comentario', C: 'tres', D: 'cuatro' });
  const empty = {};
  rm.loadEnvFile(path.join(root, 'no-existe'), empty);
  assert.deepEqual(empty, {});
});

test('manifiestos: inexistente se ignora, incompleto es un error', (t) => {
  const root = fixtureRepo(t);
  assert.equal(rm.readManifest('streaming', root), null);
  writeFiles(root, { 'streaming/module.json': JSON.stringify({ id: 'streaming' }) });
  assert.throws(() => rm.readManifest('streaming', root), /Manifiesto incompleto: streaming/);
});

test('detección: sólo los módulos modificados, salvo --all o una lista explícita', (t) => {
  const root = fixtureRepo(t);
  const isChanged = (dir) => dir === 'football';
  const ids = (mods) => mods.map(m => m.manifest.id);
  assert.deepEqual(ids(rm.detectModules({}, { root, isChanged })), ['football']);
  assert.deepEqual(ids(rm.detectModules({ all: true }, { root, isChanged })), ['racing', 'football']);
  assert.deepEqual(ids(rm.detectModules({ selected: ['racing'] }, { root, isChanged })), ['racing'], 'por id');
  assert.deepEqual(ids(rm.detectModules({ selected: ['race'] }, { root, isChanged })), ['racing'], 'por carpeta');
  assert.throws(() => rm.detectModules({ selected: ['tenis'] }, { root, isChanged }), /desconocido: tenis/);
  assert.throws(() => rm.detectModules({}, { root, isChanged: () => false }), /No se detectaron módulos modificados/);
});

test('detección con Git real: un archivo nuevo o modificado marca el módulo', (t) => {
  const root = fixtureRepo(t);
  // Repo descartable dentro de la carpeta temporal: identidad y firma fijas para no depender de la config global.
  const git = (...args) => execFileSync('git', ['-c', 'user.email=test@example.invalid', '-c', 'user.name=test', '-c', 'commit.gpgsign=false', ...args], { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('add', '.');
  git('commit', '-qm', 'base');
  assert.equal(rm.changed('race', root), false);
  fs.writeFileSync(path.join(root, 'race', 'src', 'scripts', 'nuevo.cjs'), '');
  assert.equal(rm.changed('race', root), true);
  assert.equal(rm.changed('football', root), false);
  const notRepo = tempDir('overlay-nogit-');
  t.after(() => fs.rmSync(notRepo, { recursive: true, force: true }));
  assert.throws(() => rm.changed('race', notRepo), (err) => /No se pudo detectar cambios en Git/.test(err.message) && !!err.cause);
});

test('paquete de carrera: entry, dist, scripts, datos y logo; sin el código fuente de la interfaz', (t) => {
  const root = fixtureRepo(t);
  const [race] = rm.detectModules({ selected: ['race'] }, { root });
  const out = path.join(root, 'out');
  const zipFile = rm.packageModule(race, out);
  assert.equal(path.basename(zipFile), 'racing-3.0.0.zip');
  assert.deepEqual(entriesOf(zipFile), [
    'dist/assets/index-abc.js', 'dist/index.html', 'main.cjs', 'module.json',
    'src/assets/logo.png', 'src/data/info.json', 'src/scripts/helper.cjs',
  ]);
});

test('paquete de fútbol: entry, dist y logo', (t) => {
  const root = fixtureRepo(t);
  const [football] = rm.detectModules({ selected: ['football'] }, { root });
  assert.deepEqual(entriesOf(rm.packageModule(football, path.join(root, 'out'))), ['assets/logo.png', 'dist/index.html', 'main.cjs', 'module.json']);
});

test('main --pack: compila y empaqueta, sin publicar ni hacer pedidos de red', async (t) => {
  const root = fixtureRepo(t);
  const built = [];
  const fetchImpl = () => { throw new Error('no debería publicar'); };
  const results = await rm.main(['--pack', 'football'], { root, env: {}, build: (mod) => built.push(mod.manifest.id), fetchImpl, log: () => {}, outDir: path.join(root, 'out') });
  assert.deepEqual(built, ['football']);
  assert.deepEqual(results.map(r => [r.id, r.published, fs.existsSync(r.zipFile)]), [['football', false, true]]);
});

async function fakeAdminServer(t, { role = 'admin', releaseStatus = 201 } = {}) {
  const seen = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      seen.push({ method: req.method, url: req.url, headers: req.headers, body });
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/api/auth/login') {
        const { username, password } = JSON.parse(body.toString());
        if (username !== 'admin-prueba' || password !== 'clave-prueba') { res.statusCode = 401; return res.end(JSON.stringify({ error: 'Credenciales inválidas' })); }
        return res.end(JSON.stringify({ token: 'tok-admin', user: { role } }));
      }
      if (req.url.startsWith('/api/modules/')) {
        res.statusCode = releaseStatus;
        return res.end(JSON.stringify(releaseStatus < 300 ? { release: { signed: true } } : { error: 'Versión ya publicada' }));
      }
      res.statusCode = 404; res.end('{}');
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => server.close(r)));
  const env = { OVERLAY_SERVER_URL: `http://127.0.0.1:${server.address().port}/`, OVERLAY_ADMIN_USER: 'admin-prueba', OVERLAY_ADMIN_PASSWORD: 'clave-prueba' };
  return { env, seen };
}

test('publicar: inicia sesión de administrador y sube el .zip con versión, launcherApi y notas', async (t) => {
  const root = fixtureRepo(t);
  const { env, seen } = await fakeAdminServer(t);
  const results = await rm.main(['--publish', '--notes', 'Notas de prueba', 'race'], { root, env, build: () => {}, log: () => {}, outDir: path.join(root, 'out') });
  assert.equal(results[0].published, true);
  assert.equal(seen.length, 2);
  const upload = seen[1];
  const url = new URL(upload.url, 'http://x');
  assert.equal(url.pathname, '/api/modules/racing/releases');
  assert.deepEqual(Object.fromEntries(url.searchParams), { version: '3.0.0', launcherApi: '1', notes: 'Notas de prueba' });
  assert.equal(upload.headers.authorization, 'Bearer tok-admin');
  assert.equal(upload.headers['content-type'], 'application/zip');
  assert.ok(upload.body.equals(fs.readFileSync(results[0].zipFile)), 'sube exactamente el paquete armado');
});

test('publicar: faltan credenciales, usuario sin rol admin o error del servidor => falla con un mensaje claro', async (t) => {
  const root = fixtureRepo(t);
  const deps = { root, build: () => {}, log: () => {}, outDir: path.join(root, 'out') };
  let requests = 0;
  await assert.rejects(rm.main(['--publish', 'football'], { ...deps, env: {}, fetchImpl: () => { requests++; } }), /OVERLAY_ADMIN_USER/);
  assert.equal(requests, 0, 'sin credenciales no se contacta al servidor');

  const notAdmin = await fakeAdminServer(t, { role: 'editor' });
  await assert.rejects(rm.main(['--publish', 'football'], { ...deps, env: notAdmin.env }), /inicio de sesión de administrador/);
  assert.equal(notAdmin.seen.length, 1, 'no intenta subir el paquete');

  const wrongPass = await fakeAdminServer(t);
  await assert.rejects(rm.main(['--publish', 'football'], { ...deps, env: { ...wrongPass.env, OVERLAY_ADMIN_PASSWORD: 'otra' } }), /Credenciales inválidas/);

  const rejected = await fakeAdminServer(t, { releaseStatus: 409 });
  await assert.rejects(rm.main(['--publish', 'football'], { ...deps, env: rejected.env }), /Versión ya publicada/);
});

test('el paquete que arma el script lo instala y lo inicia el launcher real', async (t) => {
  const root = fixtureRepo(t);
  const [race] = rm.detectModules({ selected: ['race'] }, { root });
  const zipFile = rm.packageModule(race, path.join(root, 'out'));
  const zip = fs.readFileSync(zipFile);
  const sha256 = crypto.createHash('sha256').update(zip).digest('hex');
  const signer = createSigner();
  const state = {
    license: { sessionToken: 'tok' },
    releases: { racing: [{ version: '3.0.0', launcherApi: 1, sha256, signature: signer.sign('racing', '3.0.0', sha256), zip }] },
  };
  const server = await startFakeServer(state);
  const userData = path.join(root, 'userData');
  const fake = createFakeElectron({ userData, isPackaged: true }); // empaquetado: nunca usa el código local del repo
  const restoreKey = useTestPublicKey(signer.publicPem);
  const loaded = loadWithFakeElectron(fake, 'moduleManager.cjs', { serverUrl: server.url });
  const nodePathBefore = process.env.NODE_PATH;
  t.after(async () => {
    loaded.restore(); restoreKey(); await server.close();
    if (nodePathBefore === undefined) delete process.env.NODE_PATH; else process.env.NODE_PATH = nodePathBefore;
  });
  const installed = await loaded.exports.ensureModule('racing', 'tok');
  assert.equal(installed.version, '3.0.0');
  assert.equal(loaded.exports.loadModule(installed, { license: {} }), 'race-ok');
  assert.deepEqual(global.__raceStarted.d, { ok: true }, 'los scripts y datos empaquetados se resuelven');
});
