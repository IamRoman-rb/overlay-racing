// Ciclo de vida del launcher (launcher/main.cjs) con un electron falso y el servidor de licencias/módulos falso:
// instancia única, login, ventana de módulos, apertura de un módulo (descarga + firma + start), regreso al launcher,
// cierre de la aplicación y manejo de errores. moduleManager.cjs y api.cjs son los reales.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  tempDir, createFakeElectron, loadWithFakeElectron, createSigner, useTestPublicKey, makeRelease, startFakeServer,
} = require('./helpers/launcherHarness.cjs');

const signer = createSigner();

async function bootLauncher(t, { lock = true, isPackaged = false, legacyUserData = false, releases } = {}) {
  const root = tempDir();
  const userData = path.join(root, 'Overlay Graphics');
  if (legacyUserData) fs.mkdirSync(path.join(root, 'Overlay Studio'), { recursive: true });
  const state = {
    users: { ana: 'secreta' },
    license: { sessionToken: 'tok-ana', modules: ['testmod'], moduleCatalog: [{ id: 'testmod', name: 'Test' }], plan: 'pro', expiresAt: '2027-12-31' },
    releases: releases || { testmod: [makeRelease(signer, { id: 'testmod', version: '1.0.0' })] },
  };
  const server = await startFakeServer(state);
  const fake = createFakeElectron({ userData, appData: root, isPackaged, lock, version: '2.2.2' });
  const restoreKey = useTestPublicKey(signer.publicPem);
  const nodePathBefore = process.env.NODE_PATH;
  const silence = { log: console.log, warn: console.warn, error: console.error };
  global.__moduleStarts = [];
  // Sin salida en pantalla: logger.cjs envuelve estas funciones mudas y sigue copiando todo al archivo de log.
  for (const level of ['log', 'warn', 'error']) console[level] = () => {};
  const loaded = loadWithFakeElectron(fake, 'main.cjs', { serverUrl: server.url });
  t.after(async () => {
    Object.assign(console, silence);
    loaded.restore();
    restoreKey();
    if (nodePathBefore === undefined) delete process.env.NODE_PATH; else process.env.NODE_PATH = nodePathBefore;
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const windows = () => fake.BrowserWindow.getAllWindows();
  const htmlOf = (w) => decodeURIComponent(w.url.replace('data:text/html;charset=utf-8,', ''));
  return { fake, app: fake.app, state, server, root, userData, windows, htmlOf };
}

async function login(env, username = 'ana', password = 'secreta') {
  return env.fake.invoke('attempt-license-login', { username, password });
}

test('segunda instancia: sale enseguida y no abre ventanas', async (t) => {
  const env = await bootLauncher(t, { lock: false });
  await env.app.fireReady();
  assert.deepEqual(env.app.calls.exit, [0]);
  assert.equal(env.windows().length, 0);
  assert.equal(env.app.listenerCount('second-instance'), 0);
});

test('primera instancia: al estar listo muestra el login y trae al frente la ventana si se abre otra copia', async (t) => {
  const env = await bootLauncher(t);
  assert.equal(env.windows().length, 0, 'nada antes de whenReady');
  await env.app.fireReady();
  const [loginWin] = env.windows();
  assert.ok(loginWin, 'ventana de login');
  assert.equal(loginWin.options.webPreferences.contextIsolation, false);
  assert.match(env.htmlOf(loginWin), /<html/i);
  env.app.emit('second-instance');
  assert.equal(loginWin.focused, true);
  assert.deepEqual(env.app.calls.exit, []);
});

test('el log del launcher se escribe en la carpeta de datos del usuario', async (t) => {
  const env = await bootLauncher(t);
  console.error('mensaje de diagnóstico de la prueba'); // silenciado en pantalla, pero el logger lo guarda
  const logFile = path.join(env.userData, 'race-dynamics.log');
  assert.ok(fs.existsSync(logFile));
  assert.match(fs.readFileSync(logFile, 'utf8'), /ERROR mensaje de diagnóstico de la prueba/);
});

test('instalación empaquetada con la carpeta vieja "Overlay Studio": la sigue usando', async (t) => {
  const env = await bootLauncher(t, { isPackaged: true, legacyUserData: true });
  assert.deepEqual(env.app.calls.setPath, [['userData', path.join(env.root, 'Overlay Studio')]]);
});

test('login: credenciales incorrectas y servidor caído devuelven un error legible', async (t) => {
  const env = await bootLauncher(t);
  await env.app.fireReady();
  assert.deepEqual(await login(env, 'ana', 'mal'), { success: false, error: 'Usuario o contraseña incorrectos' });
  env.state.down = true;
  assert.deepEqual(await login(env), { success: false, error: 'Servidor en mantenimiento' });
  await env.server.close();
  const offline = await login(env);
  assert.equal(offline.success, false);
  assert.match(offline.error, /No se pudo conectar al servidor/);
  assert.equal(env.windows().length, 1, 'sigue en el login');
});

test('login correcto: cambia a la ventana de módulos sin cerrar la aplicación y envía un id de PC estable', async (t) => {
  const env = await bootLauncher(t);
  await env.app.fireReady();
  assert.deepEqual(await login(env, 'ana', 'mal'), { success: false, error: 'Usuario o contraseña incorrectos' });
  assert.deepEqual(await login(env), { success: true });
  const [id1, id2] = env.state.machineIds;
  assert.match(id1, /^[0-9a-f]{64}$/, 'hash, no datos de la PC en crudo');
  assert.equal(id1, id2, 'el mismo id en cada intento');
  const wins = env.windows();
  assert.equal(wins.length, 1);
  assert.match(env.htmlOf(wins[0]), /<html/i);
  assert.equal(env.app.calls.quit, 0, 'cerrar el login al pasar a módulos no cierra el programa');
  const state = await env.fake.invoke('get-launcher-state');
  assert.equal(state.username, 'ana');
  assert.equal(state.plan, 'pro');
  assert.equal(state.modules.length, 1);
  assert.equal(state.modules[0].id, 'testmod');
  assert.equal(state.modules[0].installedVersion, null);
  assert.equal(state.modules[0].version, '1.0.0');
});

test('abrir un módulo: lo descarga, lo inicia con la licencia y cierra la ventana de módulos', async (t) => {
  const env = await bootLauncher(t);
  await env.app.fireReady();
  await login(env);
  const modulesWin = env.windows()[0];
  const res = await env.fake.invoke('open-module', { id: 'testmod' });
  assert.deepEqual(res, { ok: true });
  const phases = modulesWin.sent.filter(([ch]) => ch === 'module-status').map(([, s]) => s.phase);
  assert.deepEqual([...new Set(phases)], ['checking', 'downloading', 'verifying', 'installing', 'opening']);
  assert.equal(modulesWin.isDestroyed(), true);
  assert.equal(env.app.calls.quit, 0, 'el programa sigue vivo mientras corre el módulo');

  const [start] = global.__moduleStarts;
  assert.equal(start.ctx.moduleId, 'testmod');
  assert.deepEqual(start.ctx.license, { username: 'ana', modules: ['testmod'], plan: 'pro', expiresAt: '2027-12-31' });
  assert.equal(start.ctx.isDev, false);
  assert.equal(start.ctx.launcherVersion, '2.2.2');
  assert.equal(start.ctx.logPath, path.join(env.userData, 'race-dynamics.log'));
  assert.equal(typeof start.ctx.importDep, 'function');

  // con un módulo abierto no se abre otro, no se cierra el programa con las ventanas y no se cierra sesión
  assert.deepEqual(await env.fake.invoke('open-module', { id: 'testmod' }), { error: 'Ya hay un módulo abierto.' });
  env.app.emit('window-all-closed');
  assert.equal(env.app.calls.quit, 0);
  env.fake.emit('launcher-logout');
  assert.equal(env.windows().length, 0);

  // el módulo devuelve el control: vuelve la ventana de módulos y cerrar todo ya cierra el programa
  start.ctx.returnToLauncher();
  assert.equal(env.windows().length, 1);
  env.app.emit('window-all-closed');
  assert.equal(env.app.calls.quit, 1);
});

test('un módulo que no se puede abrir informa el error y deja volver a intentar', async (t) => {
  const bad = makeRelease(signer, { id: 'testmod', version: '1.0.0', badSignature: true });
  const env = await bootLauncher(t, { releases: { testmod: [bad] } });
  await env.app.fireReady();
  await login(env);
  const res = await env.fake.invoke('open-module', { id: 'testmod' });
  assert.match(res.error, /firma válida/);
  assert.equal(env.windows().length, 1, 'la ventana de módulos sigue abierta');
  env.state.releases.testmod = [makeRelease(signer, { id: 'testmod', version: '1.0.1' })];
  assert.deepEqual(await env.fake.invoke('open-module', { id: 'testmod' }), { ok: true }, 'no quedó marcado como abierto');
});

test('la licencia limita qué módulos se pueden abrir, actualizar o consultar', async (t) => {
  const env = await bootLauncher(t);
  await env.app.fireReady();
  const before = await env.fake.invoke('open-module', { id: 'testmod' });
  assert.equal(before.error, 'Tu licencia no incluye este módulo.', 'sin sesión');
  await login(env);
  for (const channel of ['open-module', 'update-module', 'get-module-releases']) {
    const r = await env.fake.invoke(channel, { id: 'otro' });
    assert.equal(r.error, 'Tu licencia no incluye este módulo.', channel);
  }
  assert.equal(global.__moduleStarts.length, 0);
});

test('actualizar e historial desde la ventana de módulos', async (t) => {
  const env = await bootLauncher(t);
  await env.app.fireReady();
  await login(env);
  assert.deepEqual(await env.fake.invoke('update-module', { id: 'testmod' }), { ok: true });
  env.state.releases.testmod.unshift(makeRelease(signer, { id: 'testmod', version: '1.1.0', notes: 'nueva' }));
  const hist = await env.fake.invoke('get-module-releases', { id: 'testmod' });
  assert.deepEqual(hist.releases.map(r => [r.version, r.installed]), [['1.1.0', false], ['1.0.0', true]]);
  env.state.down = true;
  const failed = await env.fake.invoke('update-module', { id: 'testmod' });
  assert.deepEqual(failed, { ok: true }, 'sin servidor queda la versión instalada');
});

test('cerrar sesión vuelve al login; cerrar el login sin otra ventana cierra el programa', async (t) => {
  const env = await bootLauncher(t);
  await env.app.fireReady();
  await login(env);
  env.fake.emit('launcher-logout');
  const [loginWin] = env.windows();
  assert.equal(env.windows().length, 1);
  assert.equal((await env.fake.invoke('get-launcher-state')).modules.length, 0, 'la sesión se borró');
  assert.equal(env.app.calls.quit, 0);
  loginWin.close();
  assert.equal(env.app.calls.quit, 1);
});
