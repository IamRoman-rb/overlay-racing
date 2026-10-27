// Arma el paquete del módulo de carrera (release-modules/racing-<versión>.zip) que después se publica en el servidor.
// Lleva el código del módulo (main.cjs + src/scripts), la interfaz ya compilada (dist/) y module.json.
// Las librerías (express, socket.io, puppeteer, ...) NO van: las trae el instalador.
//
//   npm run module:pack        (la versión sale de module.json: subila antes de empaquetar una versión nueva)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'module.json'), 'utf-8'));

console.log(`Compilando la interfaz del módulo "${manifest.id}"...`);
execSync('npx vite build', { cwd: root, stdio: 'inherit' });

const zip = new AdmZip();
zip.addLocalFile(path.join(root, 'module.json'));
zip.addLocalFile(path.join(root, manifest.entry));
zip.addLocalFolder(path.join(root, 'dist'), 'dist');
zip.addLocalFolder(path.join(root, 'src', 'scripts'), 'src/scripts');
zip.addLocalFile(path.join(root, 'src', 'assets', 'logo.png'), 'src/assets');

const outDir = path.join(root, 'release-modules');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${manifest.id}-${manifest.version}.zip`);
zip.writeZip(outFile);

console.log(`\nPaquete listo: ${outFile} (${(fs.statSync(outFile).size / 1024 / 1024).toFixed(1)} MB)`);
console.log('Para publicarlo: npm run module:publish');
