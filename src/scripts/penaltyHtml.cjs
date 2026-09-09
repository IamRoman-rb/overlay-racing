function getPenaltyHtml(drivers, campeonato, currentPenalty) {
  const safeDrivers = Array.isArray(drivers) ? drivers : [];
  const driversJson = JSON.stringify(safeDrivers).replace(/</g, '\\u003c');
  const current = currentPenalty || { isVisible: false, driverNumber: null, driverName: '', type: 'investigation', reason: '' };
  const currentJson = JSON.stringify(current).replace(/</g, '\\u003c');
  const title = campeonato ? String(campeonato).toUpperCase() : 'CARRERA';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Comisarios Deportivos — ${title}</title>
<style>
  :root {
    --bg: #121212; --panel: #1a1a1a; --input: #242424; --border: #333333;
    --text: #ffffff; --muted: #888888; --yellow: #ffcc00; --red: #e74c3c; --green: #2ecc71;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: Arial, Helvetica, sans-serif; padding: 16px 16px 40px;
  }
  h1 {
    font-size: 15px; letter-spacing: 1px; margin: 0 0 4px;
    display: flex; align-items: center; gap: 8px;
  }
  .subtitle { font-size: 11px; color: var(--muted); margin: 0 0 20px; }
  .status {
    display: none; align-items: center; gap: 10px;
    border-radius: 6px; padding: 12px 14px; margin-bottom: 20px;
    border: 1px solid var(--border); font-size: 12px; font-weight: bold;
  }
  .status.visible { display: flex; }
  .status .dot {
    width: 9px; height: 9px; border-radius: 50%; background: var(--red);
    animation: pulse 1s infinite; flex-shrink: 0;
  }
  @keyframes pulse { 0%{opacity:1} 50%{opacity:.3} 100%{opacity:1} }
  label {
    display: block; font-size: 10px; color: var(--muted); font-weight: bold;
    letter-spacing: 0.5px; margin-bottom: 6px; margin-top: 18px;
  }
  select, textarea, input[type=number] {
    width: 100%; background: var(--input); border: 1px solid var(--border);
    color: var(--text); padding: 12px; font-size: 14px; border-radius: 4px;
    font-family: inherit; outline: none;
  }
  textarea { min-height: 90px; resize: vertical; }
  .type-row { display: flex; gap: 8px; }
  .type-btn {
    flex: 1; padding: 14px 8px; font-size: 12px; font-weight: bold;
    border-radius: 4px; border: 1px solid var(--border); background: var(--input);
    color: var(--text); cursor: pointer; text-transform: uppercase;
  }
  .type-btn.active-investigation { background: var(--yellow); color: #000; border-color: var(--yellow); }
  .type-btn.active-penalty { background: var(--red); color: #fff; border-color: #c0392b; }
  .seconds-row { display: flex; align-items: center; gap: 10px; }
  .seconds-row input { width: 90px; text-align: center; }
  .actions { display: flex; gap: 10px; margin-top: 24px; }
  button.submit, button.hide {
    flex: 1; padding: 16px; font-size: 13px; font-weight: bold; border-radius: 4px;
    border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;
  }
  button.submit { background: var(--green); color: #fff; }
  button.submit:active { background: #27ae60; }
  button.hide { background: var(--red); color: #fff; flex: 0 0 110px; }
  button.hide:active { background: #c0392b; }
  button:disabled { opacity: 0.5; }
  .toast {
    position: fixed; left: 16px; right: 16px; bottom: 20px;
    background: var(--green); color: #fff; padding: 14px; border-radius: 6px;
    font-size: 13px; font-weight: bold; text-align: center;
    transform: translateY(120px); transition: transform 0.25s ease; z-index: 999;
  }
  .toast.error { background: var(--red); }
  .toast.show { transform: translateY(0); }
  .empty {
    color: var(--muted); font-size: 12px; text-align: center; padding: 20px;
    border: 1px dashed var(--border); border-radius: 6px; margin-top: 10px;
  }
</style>
</head>
<body>

  <h1>🚩 COMISARIOS DEPORTIVOS</h1>
  <p class="subtitle">${title} — cargá la sanción o marcá la maniobra bajo investigación. Sale al aire al instante.</p>

  <div id="status" class="status">
    <span class="dot"></span>
    <span id="statusText"></span>
  </div>

  <label for="driverSelect">PILOTO</label>
  <select id="driverSelect"><option value="">CARGANDO PILOTOS...</option></select>

  <label>TIPO</label>
  <div class="type-row">
    <button type="button" id="btnInvestigation" class="type-btn">🔎 INVESTIGACIÓN</button>
    <button type="button" id="btnPenalty" class="type-btn">🚫 SANCIÓN</button>
  </div>

  <label for="reason">MOTIVO (OPCIONAL)</label>
  <textarea id="reason" placeholder="Ej: Contacto en curva 4 con el auto #12..."></textarea>

  <label for="seconds">OCULTAR AUTOMÁTICAMENTE DESPUÉS DE (SEGUNDOS)</label>
  <div class="seconds-row">
    <input type="number" id="seconds" min="3" max="120" value="10">
  </div>

  <div class="actions">
    <button type="button" class="submit" id="btnSubmit">🔴 EMITIR EN PANTALLA</button>
    <button type="button" class="hide" id="btnHide">OCULTAR</button>
  </div>

  <div id="toast" class="toast"></div>

<script>
  const drivers = ${driversJson};
  let current = ${currentJson};
  let selectedType = 'investigation';

  const driverSelect = document.getElementById('driverSelect');
  const btnInvestigation = document.getElementById('btnInvestigation');
  const btnPenalty = document.getElementById('btnPenalty');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnHide = document.getElementById('btnHide');
  const toast = document.getElementById('toast');
  const statusBox = document.getElementById('status');
  const statusText = document.getElementById('statusText');

  function renderDrivers() {
    if (!drivers || drivers.length === 0) {
      driverSelect.innerHTML = '<option value="">SIN PILOTOS CARGADOS TODAVÍA</option>';
      return;
    }
    driverSelect.innerHTML = '<option value="">SELECCIONAR PILOTO...</option>' +
      drivers.map(d => '<option value="' + d.number + '">#' + d.number + ' — ' + (d.name || '') + '</option>').join('');
  }

  function renderType() {
    btnInvestigation.className = 'type-btn' + (selectedType === 'investigation' ? ' active-investigation' : '');
    btnPenalty.className = 'type-btn' + (selectedType === 'penalty' ? ' active-penalty' : '');
  }

  function renderStatus() {
    if (current && current.isVisible) {
      statusBox.classList.add('visible');
      const label = current.type === 'investigation' ? 'BAJO INVESTIGACIÓN' : 'SANCIÓN';
      statusText.textContent = 'EN AIRE: #' + (current.driverNumber || '?') + ' ' + (current.driverName || '') + ' — ' + label;
    } else {
      statusBox.classList.remove('visible');
    }
  }

  function showToast(msg, isError) {
    toast.textContent = msg;
    toast.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => { toast.className = 'toast'; }, 2500);
  }

  btnInvestigation.addEventListener('click', () => { selectedType = 'investigation'; renderType(); });
  btnPenalty.addEventListener('click', () => { selectedType = 'penalty'; renderType(); });

  btnSubmit.addEventListener('click', async () => {
    const driverNumber = driverSelect.value;
    if (!driverNumber) { showToast('⚠️ Seleccioná un piloto primero', true); return; }
    const driver = drivers.find(d => String(d.number) === String(driverNumber));
    const reason = document.getElementById('reason').value || '';
    let seconds = parseInt(document.getElementById('seconds').value, 10);
    if (!seconds || seconds <= 0) seconds = 10;

    btnSubmit.disabled = true;
    try {
      const res = await fetch('/comisarios/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverNumber: driver ? driver.number : driverNumber,
          driverName: driver ? driver.name : '',
          type: selectedType,
          reason: reason,
          autoHideSeconds: seconds
        })
      });
      if (!res.ok) throw new Error('bad status');
      current = { isVisible: true, driverNumber: driver ? driver.number : driverNumber, driverName: driver ? driver.name : '', type: selectedType, reason: reason };
      renderStatus();
      showToast('✅ Enviado al aire');
    } catch (e) {
      showToast('❌ No se pudo enviar. Revisá la conexión.', true);
    }
    btnSubmit.disabled = false;
  });

  btnHide.addEventListener('click', async () => {
    btnHide.disabled = true;
    try {
      const res = await fetch('/comisarios/hide', { method: 'POST' });
      if (!res.ok) throw new Error('bad status');
      current = { ...current, isVisible: false };
      renderStatus();
      showToast('Cartel ocultado');
    } catch (e) {
      showToast('❌ No se pudo ocultar. Revisá la conexión.', true);
    }
    btnHide.disabled = false;
  });

  renderDrivers();
  renderType();
  renderStatus();
</script>
</body>
</html>`;
}

module.exports = { getPenaltyHtml };
