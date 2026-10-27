// En la app instalada no hay consola: todo console.log/warn/error se copia a un archivo para poder diagnosticar
// problemas en PCs de clientes (AJUSTES > DIAGNÓSTICO del módulo de carreras lo muestra).
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const util = require('util');

const logDir = app.getPath('userData');
const logPath = path.join(logDir, 'race-dynamics.log');

function installLogger() {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 1024 * 1024) fs.renameSync(logPath, logPath + '.old');
  } catch (e) {}
  for (const level of ['log', 'warn', 'error']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      try {
        const text = args.map(a => (typeof a === 'string' ? a : util.inspect(a, { depth: 3 }))).join(' ');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${level.toUpperCase()} ${text}\n`);
      } catch (e) {}
    };
  }
}

module.exports = { installLogger, logDir, logPath };
