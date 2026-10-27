// Llamadas del instalador al servidor de licencias y módulos.
const fs = require('fs');
const { SERVER_URL } = require('./config.cjs');

async function readError(response, fallback) {
  const data = await response.json().catch(() => ({}));
  return data?.error || fallback;
}

// Login de la licencia. Devuelve { ok, error?, ...datos de la licencia }. Nunca lanza por errores de red.
async function login({ username, password, machineId }) {
  try {
    const response = await fetch(`${SERVER_URL}/api/public/license/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, machineId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data?.error || 'No se pudo iniciar sesión' };
    return data;
  } catch (e) {
    return { ok: false, error: 'No se pudo conectar al servidor. Revisá tu conexión a internet.' };
  }
}

async function fetchLatest(moduleId, sessionToken) {
  const response = await fetch(`${SERVER_URL}/api/public/modules/${moduleId}/latest`, {
    headers: { Authorization: `Bearer ${sessionToken}` }
  });
  if (!response.ok) throw new Error(await readError(response, 'No se pudo consultar la última versión del módulo'));
  return response.json();
}

// Descarga el paquete a destFile informando el avance (0..1)
async function downloadPackage(moduleId, version, sessionToken, destFile, onProgress) {
  const response = await fetch(`${SERVER_URL}/api/public/modules/${moduleId}/download/${version}`, {
    headers: { Authorization: `Bearer ${sessionToken}` }
  });
  if (!response.ok || !response.body) throw new Error(await readError(response, 'No se pudo descargar el módulo'));

  const total = Number(response.headers.get('content-length')) || 0;
  let received = 0;
  const out = fs.createWriteStream(destFile);
  try {
    for await (const chunk of response.body) {
      received += chunk.length;
      if (!out.write(chunk)) await new Promise(resolve => out.once('drain', resolve));
      if (total && onProgress) onProgress(Math.min(1, received / total));
    }
  } finally {
    await new Promise(resolve => out.end(resolve));
  }
  return received;
}

module.exports = { login, fetchLatest, downloadPackage };
