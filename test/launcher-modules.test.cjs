// launcher/moduleManager.cjs + launcher/api.cjs (reales) contra un servidor de módulos falso en 127.0.0.1.
// Cubre instalación, verificación (hash + firma), extracción segura, versiones, modo sin conexión y carga en proceso.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  tempDir, createFakeElectron, loadWithFakeElectron, createSigner, useTestPublicKey, makeRelease, startFakeServer,
} = require('./helpers/launcherHarness.cjs');

const signer = createSigner();
const TOKEN = 'token-de-prueba';

async function setup(t, { releases = {}, latest = {} } = {}) {
  const userData = tempDir();
  const state = { license: { sessionToken: TOKEN }, releases, latest };
  const server = await startFakeServer(state);
  const fake = createFakeElectron({ userData });
  const restoreKey = useTestPublicKey(signer.publicPem);
  const loaded = loadWithFakeElectron(fake, 'moduleManager.cjs', { serverUrl: server.url });
  const origWarn = console.warn;
  console.warn = () => {}; // los avisos esperados de "sin conexión" no ensucian la salida
  global.__moduleStarts = [];
  t.after(async () => {
    console.warn = origWarn;
    loaded.restore();
    restoreKey();
    await server.close();
    fs.rmSync(userData, { recursive: true, force: true });
  });
  return { mm: loaded.exports, fake, state, server, userData, modDir: (id, v) => path.join(userData, 'modules', id, v) };
}

const rel = (version, extra = {}) => makeRelease(signer, { id: 'testmod', version, ...extra });

test('instala la última versión: descarga, verifica, extrae y marca como completa', async (t) => {
  const r = rel('1.2.0');
  const { mm, modDir, server } = await setup(t, { releases: { testmod: [r] } });
  const phases = [];
  const installed = await mm.ensureModule('testmod', TOKEN, s => phases.push(s.phase));
  assert.deepEqual(installed, { moduleId: 'testmod', version: '1.2.0', dir: modDir('testmod', '1.2.0'), entry: 'main.cjs' });
  assert.ok(fs.existsSync(path.join(modDir('testmod', '1.2.0'), 'main.cjs')));
  assert.ok(fs.existsSync(path.join(modDir('testmod', '1.2.0'), 'dist', 'index.html')));
  assert.ok(fs.existsSync(path.join(modDir('testmod', '1.2.0'), '.complete')));
  assert.deepEqual([...new Set(phases)], ['checking', 'downloading', 'verifying', 'installing']);
  // no quedan temporales de la descarga
  assert.deepEqual(fs.readdirSync(path.dirname(modDir('testmod', 'x'))).sort(), ['1.2.0']);
  assert.ok(server.requests.every(q => q.url.startsWith('/api/public/') && q.auth === `Bearer ${TOKEN}`));
  assert.deepEqual(mm.installedVersions('testmod'), ['1.2.0']);
});

test('con una versión instalada la abre sin consultar al servidor, salvo que se pida actualizar', async (t) => {
  const { mm, server, state } = await setup(t, { releases: { testmod: [rel('1.0.0')] } });
  await mm.ensureModule('testmod', TOKEN);
  state.releases.testmod.unshift(rel('1.1.0'));
  const before = server.requests.length;
  const opened = await mm.ensureModule('testmod', TOKEN);
  assert.equal(opened.version, '1.0.0');
  assert.equal(server.requests.length, before, 'no hubo pedidos al servidor');
  const updated = await mm.ensureModule('testmod', TOKEN, () => {}, { update: true });
  assert.equal(updated.version, '1.1.0');
  assert.deepEqual(mm.installedVersions('testmod'), ['1.0.0', '1.1.0']);
});

test('rechaza una descarga corrupta (hash distinto) sin dejar nada instalado', async (t) => {
  const { mm, state, modDir } = await setup(t, { releases: { testmod: [rel('2.0.0')] } });
  state.corrupt = { 'testmod@2.0.0': true };
  await assert.rejects(mm.ensureModule('testmod', TOKEN), /corrupta/);
  assert.deepEqual(mm.installedVersions('testmod'), []);
  assert.equal(fs.existsSync(modDir('testmod', '2.0.0')), false);
  assert.deepEqual(fs.readdirSync(path.dirname(modDir('testmod', 'x'))), [], 'sin .zip ni .partial');
});

test('rechaza un paquete con firma inválida (no ejecuta código no publicado por el servidor)', async (t) => {
  const { mm, modDir } = await setup(t, { releases: { testmod: [rel('2.0.0', { badSignature: true })] } });
  await assert.rejects(mm.ensureModule('testmod', TOKEN), /firma válida/);
  assert.equal(fs.existsSync(modDir('testmod', '2.0.0')), false);
});

test('rechaza un paquete con rutas que se salen de la carpeta del módulo (zip slip)', async (t) => {
  const evil = rel('2.0.0', { extraEntries: [{ rawName: '../../escape.txt', data: 'x' }] });
  const { mm, userData } = await setup(t, { releases: { testmod: [evil] } });
  await assert.rejects(mm.ensureModule('testmod', TOKEN), /ruta fuera de la carpeta/);
  assert.equal(fs.existsSync(path.join(userData, 'escape.txt')), false);
  assert.equal(fs.existsSync(path.join(userData, 'modules', 'escape.txt')), false);
  assert.deepEqual(mm.installedVersions('testmod'), []);
});

test('rechaza un paquete firmado cuyo module.json no corresponde al módulo/versión pedidos', async (t) => {
  const wrong = rel('2.0.0', { manifest: { id: 'otro', version: '2.0.0', entry: 'main.cjs', launcherApi: 1 } });
  const { mm } = await setup(t, { releases: { testmod: [wrong] } });
  await assert.rejects(mm.ensureModule('testmod', TOKEN), /no corresponde/);
  assert.deepEqual(mm.installedVersions('testmod'), []);
});

test('no instala módulos que necesitan un launcher más nuevo (launcherApi)', async (t) => {
  const { mm } = await setup(t, { releases: { testmod: [rel('3.0.0', { launcherApi: 99 })] } });
  await assert.rejects(mm.ensureModule('testmod', TOKEN), /instalador/);
  await assert.rejects(mm.ensureModuleVersion('testmod', '3.0.0', TOKEN), /instalador/);
});

test('sin conexión: abre la versión instalada; sin nada instalado informa el error del servidor', async (t) => {
  const { mm, state } = await setup(t, { releases: { testmod: [rel('1.0.0')] } });
  await mm.ensureModule('testmod', TOKEN);
  state.down = true;
  const opened = await mm.ensureModule('testmod', TOKEN, () => {}, { update: true });
  assert.equal(opened.version, '1.0.0');
  await assert.rejects(mm.ensureModule('otromod', TOKEN), /mantenimiento/);
});

test('conserva las 2 versiones más nuevas y la elegida del historial', async (t) => {
  const releases = { testmod: [rel('1.3.0'), rel('1.2.0'), rel('1.1.0'), rel('1.0.0')] };
  const { mm } = await setup(t, { releases });
  for (const v of ['1.0.0', '1.1.0', '1.2.0']) await mm.ensureModuleVersion('testmod', v, TOKEN);
  assert.deepEqual(mm.installedVersions('testmod'), ['1.1.0', '1.2.0']);
  // elegir una versión vieja del historial: se instala y se conserva junto a las dos más nuevas
  await mm.ensureModuleVersion('testmod', '1.0.0', TOKEN);
  assert.deepEqual(mm.installedVersions('testmod'), ['1.0.0', '1.1.0', '1.2.0']);
  await mm.ensureModule('testmod', TOKEN, () => {}, { update: true });
  assert.deepEqual(mm.installedVersions('testmod'), ['1.2.0', '1.3.0']);
});

test('historial: valida la versión pedida y avisa si el servidor ya no la tiene', async (t) => {
  const { mm } = await setup(t, { releases: { testmod: [rel('1.0.0')] } });
  await assert.rejects(mm.ensureModuleVersion('testmod', '../1.0.0', TOKEN), /Versión inválida/);
  await assert.rejects(mm.ensureModuleVersion('testmod', '9.9.9', TOKEN), /ya no está disponible/);
});

test('historial sin servidor: muestra igual las versiones instaladas', async (t) => {
  const { mm, state } = await setup(t, { releases: { testmod: [rel('1.1.0', { notes: 'arreglos' }), rel('1.0.0')] } });
  await mm.ensureModuleVersion('testmod', '1.0.0', TOKEN);
  const online = await mm.getModuleReleases('testmod', TOKEN);
  assert.equal(online.error, null);
  assert.deepEqual(online.releases.map(r => [r.version, r.installed, r.notes]), [['1.1.0', false, 'arreglos'], ['1.0.0', true, null]]);
  state.down = true;
  const offline = await mm.getModuleReleases('testmod', TOKEN);
  assert.match(offline.error, /mantenimiento/);
  assert.deepEqual(offline.releases.map(r => [r.version, r.installed, !!r.localOnly]), [['1.0.0', true, true]]);
  assert.equal(offline.newestInstalled, '1.0.0');
});

test('estado del módulo: informa actualización disponible y si está bloqueada por el launcher', async (t) => {
  const { mm, state } = await setup(t, { releases: { testmod: [rel('1.0.0')] } });
  await mm.ensureModule('testmod', TOKEN);
  state.releases.testmod.unshift(rel('1.1.0'));
  let st = await mm.getModuleStatus({ id: 'testmod', name: 'Test' }, TOKEN);
  assert.equal(st.installedVersion, '1.0.0');
  assert.equal(st.updateAvailable, true);
  assert.equal(st.updateBlocked, false);
  state.releases.testmod.unshift(rel('2.0.0', { launcherApi: 99 }));
  st = await mm.getModuleStatus({ id: 'testmod', name: 'Test' }, TOKEN);
  assert.equal(st.updateBlocked, true);
  state.down = true;
  st = await mm.getModuleStatus({ id: 'testmod', name: 'Test' }, TOKEN);
  assert.equal(st.installedVersion, '1.0.0', 'sin servidor sigue disponible lo instalado');
  assert.equal(st.updateAvailable, false);
});

test('carga el módulo en el proceso: llama a start(ctx) con el contexto del launcher', async (t) => {
  const { mm } = await setup(t, { releases: { testmod: [rel('1.0.0')] } });
  const installed = await mm.ensureModule('testmod', TOKEN);
  const nodePathBefore = process.env.NODE_PATH;
  t.after(() => { if (nodePathBefore === undefined) delete process.env.NODE_PATH; else process.env.NODE_PATH = nodePathBefore; });
  const result = mm.loadModule(installed, { license: { username: 'ana' }, logDir: '/logs' });
  assert.deepEqual(result, { started: 'testmod@1.0.0' });
  const [start] = global.__moduleStarts;
  assert.equal(start.ctx.moduleId, 'testmod');
  assert.equal(start.ctx.moduleVersion, '1.0.0');
  assert.equal(start.ctx.moduleDir, installed.dir);
  assert.deepEqual(start.ctx.license, { username: 'ana' });
  assert.ok(process.env.NODE_PATH.split(path.delimiter).some(p => p.endsWith('node_modules')), 'agrega las dependencias del instalador');
});

test('un módulo sin start() es un error claro', async (t) => {
  const bad = rel('1.0.0', { startSource: '' });
  const { mm, modDir } = await setup(t, { releases: { testmod: [bad] } });
  const installed = await mm.ensureModule('testmod', TOKEN);
  fs.writeFileSync(path.join(modDir('testmod', '1.0.0'), 'main.cjs'), 'module.exports = {};');
  assert.throws(() => mm.loadModule(installed, {}), /no exporta start\(\)/);
});

test('abrir otra versión del mismo módulo reemplaza sus handlers de IPC en vez de fallar', async (t) => {
  const handlerSource = (v) => `require('electron').ipcMain.handle('canal-del-modulo', () => '${v}');`;
  const releases = { testmod: [rel('1.1.0', { startSource: handlerSource('1.1.0') }), rel('1.0.0', { startSource: handlerSource('1.0.0') })] };
  const { mm, fake } = await setup(t, { releases });
  mm.loadModule(await mm.ensureModuleVersion('testmod', '1.0.0', TOKEN), {});
  assert.equal(await fake.invoke('canal-del-modulo'), '1.0.0');
  mm.loadModule(await mm.ensureModuleVersion('testmod', '1.1.0', TOKEN), {});
  assert.equal(await fake.invoke('canal-del-modulo'), '1.1.0');
});
