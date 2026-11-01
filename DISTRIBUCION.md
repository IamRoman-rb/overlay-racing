# Cómo funciona el instalador y los módulos

El `.exe` que se le entrega al cliente es solo un **instalador / lanzador** (carpeta `launcher/`): inicia sesión con la
licencia, muestra los módulos que esa licencia incluye (Carrera y los que se sumen) y, al elegir uno, **descarga su última
versión del servidor** y lo abre. El código y la interfaz de cada módulo viven en el servidor (overlayracing.site), no en el
instalador, así que se pueden actualizar sin volver a distribuir el `.exe`.

```
instalador (launcher/) --login--> servidor: licencia -> módulos + token de sesión
        |
        +-- elige un módulo --> GET /api/public/modules/<id>/latest             (versión, hash, firma)
                                GET /api/public/modules/<id>/download/<versión>  (.zip)
                                verifica hash + firma Ed25519 -> descomprime en <datos del usuario>/modules/<id>/<versión>/
                                -> require(main.cjs del módulo).start(ctx)
```

- El instalador trae Electron, las librerías (express, socket.io, puppeteer, xlsx...) y el Chromium del scraper. Los módulos
  usan esas mismas librerías: si un módulo nuevo necesita una librería nueva, hay que sacar un instalador nuevo (el módulo
  puede declarar un `launcherApi` mayor y el instalador viejo le pide al cliente que se actualice).
- Cada paquete va **firmado**: el servidor lo firma con una clave privada (`RELEASE_SIGNING_KEY` en el `.env` del backend) y el
  instalador trae la pública (`launcher/release-public-key.pem`). Un paquete sin firma válida no se ejecuta.
- **Actualizaciones opcionales**: al abrir la ventana de módulos (y cada vez que vuelve al frente) el instalador consulta si hay
  una versión más nueva de cada módulo. Si la hay, la tarjeta muestra el aviso (con las notas de la versión) y dos botones:
  "Actualizar y abrir" y "Abrir sin actualizar". Nunca se obliga a actualizar, y con la versión instalada se puede trabajar
  aunque no haya internet. Solo la primera vez (sin nada instalado) la descarga es obligatoria.
- El instalador `.exe` es un asistente clásico: bienvenida, elegir la carpeta de instalación, instalar para este usuario o
  para todos, accesos directos y finalizar. Al desinstalar se conservan los datos y los módulos descargados.
- Las descargas exigen la sesión de la licencia: si está suspendida, vencida o no incluye el módulo, el servidor no lo entrega.

## Publicar una versión nueva de un módulo

1. Subir `version` en `race/module.json`, `football/module.json` o `streaming/module.json`.
2. `npm run module:pack` detecta los módulos modificados por Git y arma sus ZIP.
3. `npm run module:publish -- --notes "Notas de la versión"` compila y publica los módulos modificados. También acepta `--all` o un id/directorio (`race`, `racing`, `football`).

Las credenciales de administrador se leen de `.env` en la raíz (`OVERLAY_ADMIN_USER` y `OVERLAY_ADMIN_PASSWORD`). Se puede copiar `.env.example`; `.env` está excluido de Git. El servidor aplica la firma criptográfica al paquete.

```powershell
$env:OVERLAY_ADMIN_USER = "roman"
$env:OVERLAY_ADMIN_PASSWORD = "..."
npm run module:publish -- --notes "Notas de la versión"
```

Desde ese momento, cada cliente recibe la versión nueva la próxima vez que abre el módulo. Para probar contra un backend
local: `$env:OVERLAY_SERVER_URL = "http://localhost:8090"`.

## Desarrollo

`npm start` abre el instalador: el login y la lista de módulos usan el servidor real (o el de `OVERLAY_SERVER_URL`) y, al
elegir **Carrera**, se abre directo el código de `race/` con Vite, sin descargar nada. `OVERLAY_FORCE_DOWNLOAD=1` fuerza el
circuito real de descarga.

## Módulos nuevos (Fútbol, Eventos, ...)

Se agregan en el servidor (`MODULE_CATALOG` en `backend/src/licensePlans.js` del proyecto web) y se publica su paquete igual que
Carrera: un `module.json` con su `id` y un `main.cjs` que exporte `start(ctx)`. Mientras no tenga una versión publicada, el
cliente lo ve en su lista como "Próximamente".

## Módulo Fútbol (`football/`)

Sin proveedor de datos: equipos, plantel, cuerpo técnico, escudos, marcador y reloj se cargan a mano en el panel y se guardan en
`football-data.json` (en `football/` en desarrollo, en la carpeta de datos del usuario instalado). Tiene cuatro gráficas
(marcador + reloj, alineación, presentación del partido y alerta de gol / cambio / tarjeta) con el estilo de cinco ligas:
Bundesliga, Premier League, LaLiga, Liga Argentina y MLS (`football/src/leagues.js` y `football/src/graphics/`).

- Cada gráfica es independiente (pestaña PERSONALIZAR): posición arrastrando, escala, ancho y alto, opacidad, transición (con o sin
  tapado con el logo de la liga / productora), tipografía (41 de Google Fonts), todos los colores, borde y esquinas. La distribución
  de los botones del panel (vista previa a la derecha, izquierda, arriba o abajo) también se elige ahí.
- Los logos de la liga y de la productora se cargan en PARTIDO y se ponen al aire desde EN VIVO (liga, productora o ambos).
- `npm start` levanta Carrera desde `race/` (puerto 5173) y Fútbol desde `football/` (puerto 5174).
- Overlay: ventana propia del programa (fondo verde croma) o `http://<IP de la PC>:8080/#/overlay` como Browser source en OBS / vMix.

# Cómo generar y distribuir el instalador

## Generar el instalador

```bash
npm run dist            # instalador (Overlay-Graphics-Setup-x.y.z.exe) en release/ — solo el lanzador, sin los módulos
npm run dist:portable   # versión portable (más propensa a avisos del antivirus)
```

`npm run dist` descarga una sola vez el Chromium que usa el scraper de timing y lo incluye
dentro del instalador, así el programa funciona en PCs sin Node, Chrome ni Edge.

## Por qué Windows avisa que "puede dañar la computadora"

Ese cartel es **Windows SmartScreen** ("Windows protegió su PC" / "Editor desconocido"). Aparece con
cualquier `.exe` que **no tiene firma digital**, aunque no tenga ningún virus. No se puede quitar
solo con cambios de código: hay que firmar el ejecutable.

Lo que ya está hecho en el proyecto para reducir los avisos:

- Instalador NSIS en lugar de `.exe` portable. El portable se descomprime en una carpeta temporal en
  cada ejecución, que es justo el comportamiento que los antivirus miran con más sospecha.
- No pide permisos de administrador (`asInvoker`, instalación por usuario).
- El `.exe` trae datos de producto (nombre, empresa, copyright, versión), que ayudan a la reputación.

## Firmar el ejecutable (lo que realmente elimina el aviso)

1. Conseguir un **certificado de firma de código** (CA reconocida: Sectigo, DigiCert, SSL.com, etc.).
   - **EV** (más caro, token USB): SmartScreen lo acepta de inmediato.
   - **OV** (más barato): el aviso desaparece cuando la firma acumula reputación (semanas de uso).
2. Exportarlo como `.pfx` y definir estas variables antes de generar el instalador (PowerShell):

```powershell
$env:CSC_LINK = "C:\ruta\al\certificado.pfx"
$env:CSC_KEY_PASSWORD = "la-contraseña-del-pfx"
npm run dist
```

electron-builder firma automáticamente el instalador y el programa. Para verificar: clic derecho
sobre el `.exe` > Propiedades > Firmas digitales.

Las claves de EV con token USB no se pueden usar con `CSC_LINK`; en ese caso se firma con
`signtool` (ver la documentación de electron-builder sobre `win.sign`).

## Mientras no esté firmado

- Que el cliente haga clic en **"Más información" > "Ejecutar de todas formas"**.
- Si Windows Defender lo marca como amenaza, se puede enviar el instalador a
  <https://www.microsoft.com/wdsi/filesubmission> como "falso positivo". Microsoft suele
  resolverlo en pocos días.
- Descargar el instalador siempre desde la misma URL ayuda a que SmartScreen acumule reputación.
