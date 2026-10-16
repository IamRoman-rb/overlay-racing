# Cómo generar y distribuir el instalador

## Generar el instalador

```bash
npm run dist            # instalador (Race-Dynamics-Setup-x.y.z.exe) en release/
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
