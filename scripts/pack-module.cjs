// Arma el paquete de un módulo (release-modules/<id>-<versión>.zip) que después se publica en el servidor.
// Lleva el código del módulo, la interfaz ya compilada (dist/) y module.json.
// Las librerías (express, socket.io, puppeteer, ...) NO van: las trae el instalador.
//
//   npm run module:pack              módulo de carrera (module.json de la raíz; subí la versión antes de empaquetar)
//   npm run football:pack            módulo de fútbol (football/module.json)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

const root = path.join(__dirname, '..');
const moduleName = process.argv[2] || 'racing';
const isFootball = moduleName === 'football';
const moduleDir = isFootball ? path.join(root, 'football') : root;
const manifest = JSON.parse(fs.readFileSync(path.join(moduleDir, 'module.json'), 'utf-8'));

console.log(`Compilando la interfaz del módulo "${manifest.id}"...`);
execSync(isFootball ? 'npx vite build --config football/vite.config.js' : 'npx vite build', { cwd: root, stdio: 'inherit' });

const zip = new AdmZip();
zip.addLocalFile(path.join(moduleDir, 'module.json'));
zip.addLocalFile(path.join(moduleDir, manifest.entry));
zip.addLocalFolder(path.join(moduleDir, 'dist'), 'dist');
if (isFootball) {
  zip.addLocalFile(path.join(moduleDir, 'assets', 'logo.png'), 'assets');
} else {
  zip.addLocalFolder(path.join(root, 'src', 'scripts'), 'src/scripts');
  zip.addLocalFile(path.join(root, 'src', 'assets', 'logo.png'), 'src/assets');
}

const outDir = path.join(root, 'release-modules');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${manifest.id}-${manifest.version}.zip`);
zip.writeZip(outFile);

console.log(`\nPaquete listo: ${outFile} (${(fs.statSync(outFile).size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`Para publicarlo: npm run ${isFootball ? 'football:publish' : 'module:publish'}`);
