// Ventana de módulos: aparece después del login y muestra sólo los módulos que incluye la licencia.
const { icon, PATHS } = require('./icons.cjs');

function getModulesHtml() {
  // Todos los íconos ya dibujados, para que la ventana pida el que corresponda a cada módulo por nombre
  const icons = {};
  Object.keys(PATHS).forEach(name => { icons[name] = icon(name, 'currentColor', '2.4em'); });
  const iconsJson = JSON.stringify(icons).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Overlay Graphics — Módulos</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #121212; color: #fff; font-family: Arial, Helvetica, sans-serif; }
  header {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 18px 28px; background: #1a1a1a; border-bottom: 1px solid #333;
  }
  h1 { font-size: 17px; margin: 0; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
  .account { text-align: right; font-size: 11px; color: #888; line-height: 1.5; }
  .account b { color: #fff; font-size: 12px; }
  .logout {
    margin-left: 18px; background: #242424; color: #ccc; border: 1px solid #333; border-radius: 4px;
    padding: 8px 12px; font-size: 11px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  }
  .logout:hover { filter: brightness(1.2); }
  main { padding: 28px; }
  h2 { font-size: 12px; color: #888; letter-spacing: 1px; margin: 0 0 6px; text-transform: uppercase; }
  .hint { font-size: 12px; color: #666; margin: 0 0 22px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; }
  .card {
    background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 22px; display: flex; flex-direction: column; gap: 10px;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .card.ready:hover { border-color: #e74c3c; transform: translateY(-2px); }
  .card.soon { opacity: 0.6; }
  .card .ico { color: #e74c3c; }
  .card h3 { margin: 0; font-size: 17px; letter-spacing: 0.5px; }
  .card p { margin: 0; font-size: 12px; color: #999; line-height: 1.5; flex: 1; }
  .meta { font-size: 10px; color: #666; letter-spacing: 0.5px; min-height: 13px; }
  .open {
    width: 100%; padding: 12px; border: none; border-radius: 4px; background: #e74c3c; color: #fff; font-size: 12px; font-weight: bold;
    letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    transition: transform 0.08s ease, filter 0.12s ease;
  }
  .open:hover:not(:disabled) { filter: brightness(1.15); }
  .open:active:not(:disabled) { transform: translateY(2px) scale(0.97); filter: brightness(0.8); }
  .open:disabled { background: #333; color: #888; cursor: default; }
  .bar { height: 6px; background: #242424; border-radius: 3px; overflow: hidden; display: none; }
  .bar.show { display: block; }
  .bar i { display: block; height: 100%; width: 0; background: #2ecc71; transition: width 0.15s linear; }
  .error { font-size: 11px; color: #f87171; background: rgba(231,76,60,0.1); border: 1px solid #e74c3c; border-radius: 4px; padding: 8px 10px; display: none; }
  .error.show { display: block; }
  .empty { color: #888; font-size: 13px; padding: 40px 0; text-align: center; }
  .update {
    font-size: 11px; line-height: 1.5; color: #f1c40f; background: rgba(241,196,15,0.08);
    border: 1px solid rgba(241,196,15,0.45); border-radius: 4px; padding: 8px 10px; display: none;
  }
  .update.show { display: block; }
  .update b { color: #fff; }
  .update .notes { color: #bbb; display: block; margin-top: 2px; }
  .actions { display: flex; flex-direction: column; gap: 8px; }
  .open.update-btn { background: #f1c40f; color: #000; }
  .open.secondary { background: #242424; color: #ccc; border: 1px solid #333; }
</style>
</head>
<body>
<header>
  <h1>${icon('sports_score', '#e74c3c', '1.2em')} OVERLAY GRAPHICS</h1>
  <div style="display:flex;align-items:center">
    <div class="account"><b id="username"></b><br><span id="planInfo"></span></div>
    <button class="logout" id="btnLogout">${icon('logout', 'currentColor', '1.2em')} Cerrar sesión</button>
  </div>
</header>
<main>
  <h2>Tus módulos</h2>
  <p class="hint">Elegí con cuál querés trabajar. Se abre la última versión: si hay una nueva, se descarga sola.</p>
  <div class="grid" id="grid"></div>
</main>

<script>
  const { ipcRenderer } = require('electron');
  const ICONS = ${iconsJson};
  const PLAN_LABELS = { annual: 'Licencia anual', perpetual: 'Licencia fija', monthly: 'Licencia mensual' };
  const PHASES = { checking: 'Buscando actualizaciones...', downloading: 'Descargando', verifying: 'Verificando el paquete...', installing: 'Instalando...', opening: 'Abriendo...' };

  const grid = document.getElementById('grid');
  let cards = {};
  let busy = false; // mientras se descarga / abre un módulo no se vuelve a armar la lista

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T') + 'Z');
    return isNaN(d) ? '' : d.toLocaleDateString('es-AR');
  }

  function small(svg) { return svg.split('2.4em').join('1.3em'); }

  function metaText(m) {
    if (!m.available) return 'PRÓXIMAMENTE';
    if (m.installedVersion === 'dev') return 'DESARROLLO (CÓDIGO LOCAL)';
    if (m.installedVersion) return 'VERSIÓN INSTALADA ' + m.installedVersion;
    return 'VERSIÓN DISPONIBLE ' + m.version + ' · SE DESCARGA AL ABRIR';
  }

  // Cada módulo se llama "Overlay <módulo>" (Overlay Racing, Overlay Fútbol, Overlay Streaming); funciona igual si el servidor ya manda el nombre completo
  const MODULE_LABELS = { racing: 'Racing', football: 'Fútbol', events: 'Streaming' };
  function moduleTitle(m) {
    const base = MODULE_LABELS[m.id] || m.name || m.id;
    return base.toLowerCase().startsWith('overlay') ? base : 'Overlay ' + base;
  }

  function makeButton(className, html, onClick) {
    const btn = document.createElement('button');
    btn.className = 'open ' + className;
    btn.innerHTML = html;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function buildCard(m) {
    const card = document.createElement('div');
    card.className = 'card ' + (m.available ? 'ready' : 'soon');
    const ico = document.createElement('div');
    ico.className = 'ico';
    ico.innerHTML = ICONS[m.icon] || ICONS.extension || '';
    const title = document.createElement('h3');
    title.textContent = moduleTitle(m);
    const desc = document.createElement('p');
    desc.textContent = m.description || '';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = metaText(m);

    // Aviso de actualización: se ofrece, pero nunca se obliga (se puede abrir la versión instalada)
    const update = document.createElement('div');
    update.className = 'update';
    if (m.updateAvailable) {
      update.classList.add('show');
      const head = document.createElement('div');
      head.innerHTML = m.updateBlocked
        ? '<b>Hay una versión nueva (' + m.version + ')</b> que necesita un instalador más nuevo. Mientras tanto podés seguir usando la ' + m.installedVersion + '.'
        : '<b>Actualización disponible: ' + m.version + '</b> (tenés la ' + m.installedVersion + ')';
      update.appendChild(head);
      if (m.notes) {
        const notes = document.createElement('span');
        notes.className = 'notes';
        notes.textContent = m.notes;
        update.appendChild(notes);
      }
    }

    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    bar.appendChild(fill);
    const error = document.createElement('div');
    error.className = 'error';

    const actions = document.createElement('div');
    actions.className = 'actions';
    const buttons = [];
    if (!m.available) {
      const b = makeButton('', 'No disponible todavía', () => {});
      b.disabled = true;
      buttons.push(b);
    } else if (m.updateAvailable && !m.updateBlocked) {
      buttons.push(makeButton('secondary', small(ICONS.download) + ' Actualizar', () => updateModule(m.id)));
      buttons.push(makeButton('update-btn', small(ICONS.download) + ' Actualizar y abrir', () => openModule(m.id, true)));
      buttons.push(makeButton('secondary', 'Entrar directamente', () => openModule(m.id, false)));
    } else if (m.updateAvailable) {
      buttons.push(makeButton('', small(ICONS.play_arrow) + ' Abrir versión ' + m.installedVersion, () => openModule(m.id, false)));
    } else {
      const label = m.installedVersion ? ' Abrir' : ' Descargar y abrir';
      const icon = m.installedVersion ? ICONS.play_arrow : ICONS.download;
      buttons.push(makeButton('', small(icon) + label, () => openModule(m.id, false)));
    }
    buttons.forEach(b => actions.appendChild(b));

    card.append(ico, title, desc, meta, update, bar, error, actions);
    cards[m.id] = { card, buttons, bar, fill, meta, error, m };
    return card;
  }

  function setButtonsEnabled(enabled) {
    Object.values(cards).forEach(c => c.buttons.forEach(b => { b.disabled = !enabled || !c.m.available; }));
  }

  async function openModule(id, update) {
    const c = cards[id];
    busy = true;
    setButtonsEnabled(false);
    c.error.classList.remove('show');
    c.bar.classList.add('show');
    c.fill.style.width = '0';
    c.meta.textContent = (update ? PHASES.checking : PHASES.opening).toUpperCase();
    const result = await ipcRenderer.invoke('open-module', { id, update });
    if (result && result.error) {
      c.error.textContent = result.error;
      c.error.classList.add('show');
      c.bar.classList.remove('show');
      c.meta.textContent = metaText(c.m);
      busy = false;
      setButtonsEnabled(true);
    }
    // Si se abrió bien, el proceso principal cierra esta ventana
  }

  async function updateModule(id) {
    const c = cards[id];
    busy = true; setButtonsEnabled(false); c.error.classList.remove('show'); c.bar.classList.add('show');
    c.meta.textContent = PHASES.checking.toUpperCase();
    const result = await ipcRenderer.invoke('update-module', { id });
    if (result && result.error) {
      c.error.textContent = result.error; c.error.classList.add('show'); c.bar.classList.remove('show');
      c.meta.textContent = metaText(c.m); busy = false; setButtonsEnabled(true);
    } else { busy = false; await refresh(); setButtonsEnabled(true); }
  }

  ipcRenderer.on('module-status', (event, s) => {
    const c = cards[s.id];
    if (!c) return;
    const label = PHASES[s.phase] || '';
    const pct = s.phase === 'downloading' ? Math.round((s.progress || 0) * 100) : null;
    c.meta.textContent = (pct === null ? label : label + ' ' + pct + '%').toUpperCase();
    c.fill.style.width = pct === null ? '100%' : pct + '%';
  });

  document.getElementById('btnLogout').addEventListener('click', () => ipcRenderer.send('launcher-logout'));

  function render(state) {
    document.getElementById('username').textContent = state.username;
    const expires = state.expiresAt ? ' · vence el ' + formatDate(state.expiresAt) : '';
    document.getElementById('planInfo').textContent = (PLAN_LABELS[state.plan] || '') + expires;
    grid.innerHTML = '';
    cards = {};
    if (!state.modules.length) {
      grid.innerHTML = '<div class="empty">Tu licencia no incluye módulos todavía. Contactá al proveedor.</div>';
      return;
    }
    state.modules.forEach(m => grid.appendChild(buildCard(m)));
  }

  // Al abrir la ventana y cada vez que vuelve al frente se busca si hay versiones nuevas publicadas
  async function refresh() {
    if (busy) return;
    render(await ipcRenderer.invoke('get-launcher-state'));
  }
  window.addEventListener('focus', refresh);
  refresh();
</script>
</body>
</html>`;
}

module.exports = { getModulesHtml };
