// Empaquetado: configuración de electron-builder y "cierre" de dependencias de lo que se distribuye.
//
// El instalador sólo lleva launcher/** y package.json (+ node_modules de "dependencies"), y cada módulo se publica como
// un .zip armado por scripts/release-modules.cjs. Si el código distribuido requiere un archivo que no entra en el
// paquete, o una librería que sólo está en devDependencies, el programa instalado falla al abrir. Estas pruebas
// arman el .zip real de cada módulo (con un dist mínimo, sin compilar) y siguen sus require() desde el entry.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');
const AdmZip = require('adm-zip');
const { packageModule, readManifest } = require('../scripts/release-modules.cjs');
const { LAUNCHER_API } = require('../launcher/config.cjs');

const REPO = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const RUNTIME_PROVIDED = new Set(['electron']); // lo pone el propio Electron en tiempo de ejecución
const builtins = new Set([...builtinModules, ...builtinModules.map(m => `node:${m}`)]);

function literalRequires(source) {
  const out = [];
  const re = /require\(\s*(['"])([^'"]+)\1\s*\)/g;
  let m;
  while ((m = re.exec(source))) out.push(m[2]);
  return out;
}

function packageName(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

// Recorre los require() literales desde `entry` dentro de `baseDir`. Devuelve los relativos que no existen y los
// paquetes externos usados.
function walk(entry, baseDir) {
  const missing = [];
  const external = new Set();
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    if (!file.endsWith('.cjs') && !file.endsWith('.js')) return; // .json y otros: sólo tienen que existir
    for (const spec of literalRequires(fs.readFileSync(file, 'utf8'))) {
      if (spec.startsWith('.')) {
        const target = path.resolve(path.dirname(file), spec);
        const rel = path.relative(baseDir, target);
        if (rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(target)) missing.push(`${path.relative(baseDir, file)} -> ${spec}`);
        else visit(target);
      } else if (!builtins.has(spec)) {
        external.add(packageName(spec));
      }
    }
  };
  visit(path.join(baseDir, entry));
  return { missing, external: [...external].sort(), files: [...seen] };
}

function assertExternalsShipped(external, label) {
  const shipped = new Set(Object.keys(pkg.dependencies || {}));
  const notShipped = external.filter(name => !shipped.has(name) && !RUNTIME_PROVIDED.has(name));
  assert.deepEqual(notShipped, [], `${label} usa paquetes que el instalador no incluye (deben estar en "dependencies")`);
}

// Copia temporal del módulo con lo que lee packageModule, más un dist mínimo (la prueba no depende de un build).
function packageRealModule(t, dirName) {
  const mod = readManifest(dirName, REPO);
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), `overlay-pkg-${dirName}-`));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const copy = path.join(tmp, dirName);
  fs.mkdirSync(copy, { recursive: true });
  fs.cpSync(mod.dir, copy, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(mod.dir, src).split(path.sep);
      return !['dist', 'node_modules', 'sponsors', 'football-backups'].includes(rel[0]);
    },
  });
  fs.mkdirSync(path.join(copy, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(copy, 'dist', 'index.html'), '<!doctype html>');
  const zipFile = packageModule({ ...mod, dir: copy }, path.join(tmp, 'out'));
  const extracted = path.join(tmp, 'extracted');
  new AdmZip(zipFile).extractAllTo(extracted, true);
  return { mod, extracted };
}

test('package.json: el instalador arranca por el launcher y sólo empaqueta launcher/** y package.json', () => {
  assert.equal(pkg.main, 'launcher/main.cjs');
  assert.ok(fs.existsSync(path.join(REPO, pkg.main)));
  assert.deepEqual(pkg.build.files, ['launcher/**/*', 'package.json']);
  assert.equal(pkg.build.directories.output, 'release');
  assert.ok(fs.existsSync(path.join(REPO, 'launcher', 'release-public-key.pem')), 'el instalador lleva la clave para verificar módulos');
  assert.ok(fs.existsSync(path.join(REPO, pkg.build.win.icon)));
  assert.ok(pkg.build.extraResources.some(r => r.from === 'chromium' && r.to === 'chromium'), 'Chromium para el scraper');
  assert.ok(pkg.build.asarUnpack.some(p => p.includes('node_modules/puppeteer')), 'puppeteer fuera del asar');
  assert.match(pkg.build.nsis.artifactName, /\$\{version\}/);
  assert.match(pkg.build.portable.artifactName, /\$\{version\}/);
});

test('las pruebas y el arnés no quedan dentro de lo que se empaqueta en el instalador', () => {
  const launcherFiles = fs.readdirSync(path.join(REPO, 'launcher'), { recursive: true }).map(String);
  assert.deepEqual(launcherFiles.filter(f => /test/i.test(f)), []);
});

test('launcher: todos sus require() existen dentro de launcher/ y sus librerías están en "dependencies"', () => {
  const { missing, external } = walk('main.cjs', path.join(REPO, 'launcher'));
  assert.deepEqual(missing, []);
  assertExternalsShipped(external, 'El launcher');
});

for (const dirName of ['race', 'football']) {
  test(`módulo ${dirName}: el .zip publicado contiene todo lo que requiere su proceso principal`, (t) => {
    const { mod, extracted } = packageRealModule(t, dirName);
    assert.ok(fs.existsSync(path.join(extracted, 'module.json')));
    const { missing, external } = walk(mod.manifest.entry, extracted);
    assert.deepEqual(missing, [], 'require() a archivos que no entran en el paquete del módulo');
    assertExternalsShipped(external, `El módulo ${dirName}`);
    // paquetes ESM que el módulo pide al launcher con ctx.importDep('...')
    const source = fs.readFileSync(path.join(extracted, mod.manifest.entry), 'utf8');
    const esm = [...source.matchAll(/importDep\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => packageName(m[1]));
    assertExternalsShipped(esm, `El módulo ${dirName} (importDep)`);
  });

  test(`módulo ${dirName}: manifiesto válido y compatible con este launcher`, () => {
    const { manifest } = readManifest(dirName, REPO);
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
    assert.equal(manifest.entry, 'main.cjs');
    assert.ok((manifest.launcherApi || 1) <= LAUNCHER_API, 'un módulo con launcherApi mayor no se podría abrir');
  });
}
