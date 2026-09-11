function getLoginHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Overlay Racing — Iniciar sesión</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #121212; color: #fff; font-family: Arial, Helvetica, sans-serif;
  }
  .card {
    width: 340px; background: #1a1a1a; border: 1px solid #333333; border-radius: 8px;
    padding: 30px 28px;
  }
  h1 { font-size: 18px; margin: 0 0 4px; letter-spacing: 1px; }
  .subtitle { font-size: 12px; color: #888888; margin: 0 0 22px; }
  label { display: block; font-size: 10px; color: #888888; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 6px; margin-top: 14px; }
  input {
    width: 100%; background: #242424; border: 1px solid #333333; color: #fff;
    padding: 11px 12px; font-size: 14px; border-radius: 4px; outline: none; font-family: inherit;
  }
  button {
    width: 100%; margin-top: 22px; padding: 13px; font-size: 13px; font-weight: bold;
    letter-spacing: 0.5px; text-transform: uppercase; border: none; border-radius: 4px;
    background: #e74c3c; color: #fff; cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: default; }
  .error {
    margin-top: 14px; font-size: 12px; color: #f87171; background: rgba(231,76,60,0.1);
    border: 1px solid #e74c3c; border-radius: 4px; padding: 10px 12px; display: none;
  }
  .error.show { display: block; }
  .footer { margin-top: 18px; font-size: 10px; color: #555; text-align: center; }
</style>
</head>
<body>
  <div class="card">
    <h1>🏁 OVERLAY RACING</h1>
    <p class="subtitle">Ingresá tu usuario y contraseña</p>

    <label for="username">USUARIO</label>
    <input type="text" id="username" autocomplete="username">

    <label for="password">CONTRASEÑA</label>
    <input type="password" id="password" autocomplete="current-password">

    <button id="btnLogin">Ingresar</button>

    <div class="error" id="errorBox"></div>
    <div class="footer">Esta licencia queda vinculada a esta computadora</div>
  </div>

<script>
  const { ipcRenderer } = require('electron');

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const btnLogin = document.getElementById('btnLogin');
  const errorBox = document.getElementById('errorBox');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }

  async function attemptLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Completá usuario y contraseña');
      return;
    }

    errorBox.classList.remove('show');
    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando...';

    try {
      const result = await ipcRenderer.invoke('attempt-license-login', { username, password });
      if (!result || !result.success) {
        showError(result?.error || 'No se pudo iniciar sesión');
        btnLogin.disabled = false;
        btnLogin.textContent = 'Ingresar';
      }
      // Si tuvo éxito, el proceso principal cierra esta ventana y abre el software
    } catch (e) {
      showError('Error inesperado. Intentá de nuevo.');
      btnLogin.disabled = false;
      btnLogin.textContent = 'Ingresar';
    }
  }

  btnLogin.addEventListener('click', attemptLogin);
  passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });
  usernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') passwordInput.focus(); });
</script>
</body>
</html>`;
}

module.exports = { getLoginHtml };