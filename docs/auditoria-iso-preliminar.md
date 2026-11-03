# Auditoría preliminar de normas ISO/IEC aplicables — Overlay Graphics

> **Esto no es una certificación ni una declaración de conformidad.** Es una revisión del repositorio hecha con evidencia
> técnica. Sirve para detectar brechas y falta de evidencia, no para afirmar que el software o la organización "cumplen ISO".
> Sólo un organismo de certificación acreditado puede certificar un sistema de gestión (por ejemplo, ISO/IEC 27001), y las
> normas de producto y de proceso revisadas acá no se certifican mirando código.

| Dato | Valor |
|---|---|
| Fecha | 2026-11-03 |
| Commit base | `f07f8f3` (rama `main`) más los cambios sin commitear de ese momento (diagnóstico del overlay, compatibilidad con Chromium 77 y los controles de este informe) |
| Alcance | `football/`, `race/main.cjs` (superficie de red), `launcher/`, `scripts/`, `package.json`, `.gitignore`, `.env.example`, `README.md`, `DISTRIBUCION.md` |
| Fuera de alcance | Backend `overlayracing.site` (licencias, firma de paquetes, panel admin), PCs de clientes, vMix/OBS reales, procesos de la empresa |
| Método | Lectura de código, reproducción automatizada del hallazgo de seguridad, pruebas automáticas nuevas, prueba de punta a punta con navegadores reales (Chrome 152 y Chromium 77), `eslint` |
| Texto de las normas | **No se tuvo acceso al texto completo de ninguna norma.** Las referencias salen de los resúmenes públicos de los catálogos (ISO, IEC, IEEE y organismos nacionales). No se atribuyen requisitos o cláusulas específicas que no se pudieron verificar. |

## 1. Cómo leer los estados

| Estado | Significado |
|---|---|
| **Evidencia parcial** | Hay artefactos en el repo que aportan evidencia para algunos aspectos de la norma, sin llegar a cubrirla. |
| **Brecha observada** | Hay una condición técnica concreta en el repositorio que va en contra de lo que la norma busca. |
| **No hay evidencia suficiente** | No se encontró el artefacto (plan, registro, criterio). Eso **no** demuestra un incumplimiento: puede existir fuera del repo. |
| **No evaluable desde el repo** | Depende de la organización, de clientes o de un uso real que no se puede observar en el código. |
| **No aplicable** | La norma no corresponde al objeto revisado. |

"**Incumplimiento confirmado**" se usa sólo para defectos técnicos reproducidos. Ninguna norma de esta lista permite declarar
un incumplimiento formal a partir de este repositorio solo.

## 2. Tabla por norma

| Norma (edición vigente verificada) | Aplicabilidad | Estado | Evidencia concreta (archivo:línea) | Motivo | Riesgo | Acción recomendada |
|---|---|---|---|---|---|---|
| **ISO/IEC 25010:2023** — modelo de calidad de producto (9 características; 2.ª edición, reemplaza a la de 2011) | Alta: el producto es software | **Brecha observada** (seguridad, fiabilidad, compatibilidad) + **evidencia parcial** | Escritura de estado por red sin control (H-01, corregido); `flex gap` sin alternativa en 34 lugares de `football/src/graphics/*.jsx` (H-04); escritura atómica de datos `football/main.cjs:49-57`; diagnóstico remoto `football/src/diag.js` | Los defectos afectan integridad (seguridad), disponibilidad del panel (fiabilidad) y presentación en navegadores viejos (compatibilidad). No hay requisitos de calidad medibles escritos. | Alto antes de H-01; medio ahora | Definir requisitos de calidad medibles por característica (p. ej. "un cambio del panel llega al overlay remoto en < 1 s en vMix 23/29") y verificarlos con pruebas. |
| **ISO/IEC 25019:2023** — modelo de calidad en uso (1.ª edición) | Alta: el uso real es vMix/OBS en PCs de clientes | **No evaluable desde el repo** / **no hay evidencia suficiente** | No hay matriz de versiones soportadas. Hay diagnóstico que registra el navegador de cada overlay (`football/src/windows/Overlay.jsx`, `bridge.diag`) | La calidad en uso se mide en el contexto real (operador, PC, versión de vMix, red). | Medio | Documentar contextos de uso soportados (vMix 23 = Chrome 77, vMix 29 = CEF 103/115, OBS) y registrar pruebas en esos contextos. |
| **ISO/IEC/IEEE 29119** (serie; partes vigentes según catálogos: -1:2022, -2:2021, -3:2021, -4:2021, -5:2024) — pruebas de software | Alta | **No hay evidencia suficiente** (antes); **evidencia parcial nueva** | Antes: `package.json` sólo tenía `lint`. Ahora: `npm test` → `football/test/server-security.test.cjs` (3 pruebas). `npm run lint` da 551 problemas: 509 en archivos generados que el lint no ignora (`*/dist`, `release/`, `chromium/`, `.claude/worktrees`) y 42 en `race/src` (reglas de React hooks y variables sin usar). `football/src`, `launcher/` y `scripts/` no tienen problemas de lint. | No hay plan, casos ni registros de prueba. Una prueba no es un proceso de pruebas. | Medio | Política y plan de pruebas mínimos; ignorar los compilados en `eslint.config.js`; pruebas de regresión del flujo panel → overlay remoto; registrar resultados por release. |
| **ISO/IEC/IEEE 12207:2026** — procesos del ciclo de vida del software (2.ª edición, abril 2026; reemplaza a 2017) | Media-alta | **Evidencia parcial** | `DISTRIBUCION.md` y `README.md` describen empaquetado, publicación, firma y actualización. `scripts/release-modules.cjs` automatiza el empaquetado. | No hay en el repo gestión de requisitos, control de cambios formal (PR/revisión), gestión de defectos, criterio de liberación ni registro de cambios. Puede existir fuera (GitHub Issues, etc.). | Medio | Registro de cambios por versión de módulo, criterio de "listo para publicar" (lint + pruebas + prueba en vMix), uso de PR con revisión. |
| **ISO 9241-210:2019** — diseño centrado en las personas | Media (hay UI de operación en vivo) | **No hay evidencia suficiente** | Hay interfaz de edición (EDITOR, PERSONALIZAR) y avisos de diagnóstico al operador | No se encontró investigación con usuarios, evaluación de usabilidad ni criterios de aceptación. No es un juicio sobre la calidad visual de la interfaz. | Bajo-medio | Registrar tareas críticas del operador (poner al aire, editar en vivo) y hacer pruebas de usabilidad con operadores reales. |
| **ISO/IEC 27034-1:2011** — seguridad de aplicaciones, visión general y conceptos | Alta | **Incumplimiento técnico confirmado y corregido parcialmente** (H-01); **brecha observada** (H-02, H-03); **evidencia parcial** (H-05) | Ver hallazgos §3 | La norma da un marco para integrar seguridad al ciclo de vida de la aplicación; no es un checklist de código. Lo observado son defectos concretos de control de acceso y validación de entradas. | Alto | Inventario de superficies de red con su modelo de confianza; controles de §3; revisión de seguridad por release. |
| **ISO/IEC 27001:2022** (+ Amd 1:2024, "cambios por acción climática") — sistema de gestión de seguridad de la información | De la organización, no del código | **No evaluable desde el repo** | El repo sólo aporta evidencia técnica (firma de paquetes, secretos fuera de Git, logs) | Riesgos, políticas, responsables, controles del Anexo A, auditorías internas y mejora continua son de la organización. | — | Ver §6: evidencias externas necesarias. |

## 3. Hallazgos técnicos

Prioridad: **Crítica** = explotable hoy con impacto directo al aire o pérdida de datos sin requisitos especiales; **Alta** =
explotable con acceso a la red local o a una URL pública, impacto al aire o en datos; **Media** = degrada funcionalidad o
compatibilidad en contextos concretos; **Baja** = mejora de robustez o de evidencia.

### H-01 · Escritura de estado del módulo Fútbol por red sin control — **Alta · incumplimiento confirmado · corregido (con riesgo residual)**

- **Condición (antes):** `football/main.cjs` escucha en `0.0.0.0:8080` (`server.listen`, línea 212), Socket.IO con
  `cors: { origin: '*' }` (línea 183) y `socket.on('fb-push-state', ...)` llamaba a `pushState` sin ninguna verificación.
  `pushState` (línea 128) reemplaza todo el estado, lo reparte a overlays y paneles y lo guarda en `football-data.json`.
- **CORS no es autenticación:** CORS sólo restringe qué páginas web pueden **leer** respuestas HTTP. No se aplica a WebSocket
  y no afecta a programas que no son navegadores. Con `origin: '*'` y sin chequear `Origin`, además, **cualquier página web** abierta en
  un navegador de la red (incluida la PC de producción, con `ws://localhost:8080`) podía conectarse y escribir.
- **Consecuencia (reproducida):** un cliente con `Origin: https://sitio-ajeno.example` mandó `{"teams":[null]}`. El estado
  se guardó tal cual en `football-data.json` y borró los equipos cargados. Con ese archivo, el panel falla al dibujar
  (`TypeError: Cannot read properties of null (reading 'id')` en `teamOfSide`), y eso se repite **en cada arranque**, porque
  el estado malformado quedó guardado. El overlay al aire también lo recibía.
- **Quién llega al puerto:** cualquier equipo de la red local si el Firewall de Windows permitió la app (lo pide la primera vez que
  abre el puerto), y cualquier página web abierta en un navegador de esa red. No está expuesto a Internet salvo que se abra
  el puerto en el router (no se observó un túnel en el módulo de fútbol).
- **Uso legítimo que hay que mantener:** OBS/vMix **leen** por `http://<IP>:8080/#/overlay`, y un panel abierto en otra PC
  (`http://<IP>:8080/#/`) **escribe** (`football/src/bridge.js:42`; está previsto en `ControlPanel.jsx`).
- **Controles implementados** (`football/main.cjs`, sin cambiar el uso por IP):
  1. **Filtro de origen para escribir** (`isAllowedWriteOrigin`, línea 101): sólo se acepta la página servida por el propio
     programa (`Origin` = `Host`), localhost, o clientes sin `Origin`. Una página de otro sitio no puede escribir.
     **Leer no cambia**: los overlays reciben el estado sin importar su origen.
  2. **Validación de forma** (`checkIncomingState`, línea 80): se rechazan estados con estructura imposible (no objeto, equipos o
     jugadores nulos, listas que no son listas, textos que el dibujo trata como string con otro tipo). El panel propio
     siempre manda un estado normalizado, y la validación lo acepta. Se comprobó con el estado por defecto, con un estado completo
     de prueba y con el `football-data.json` real de desarrollo. Sólo se aplica a lo que llega por red; el IPC de las
     ventanas propias no cambia.
  3. **Rechazo visible:** al que mandó un cambio rechazado se le devuelve el estado vigente (un panel legítimo ve que no se
     aplicó, en vez de quedar desincronizado) y se registra en el log (`[football] cambio rechazado de <IP>: <motivo>`, con
     un límite por cliente).
  4. **Copias de seguridad** (`backupSavedData`, línea 114): al abrir el módulo se copia `football-data.json` a
     `football-backups/football-data-AAAAMMDD-HHMMSS.json` (las últimas 5, sólo si el archivo es válido). Recuperación:
     con el programa cerrado, copiar la copia elegida sobre `football-data.json`.
- **Riesgo residual (no resuelto, requiere decisión):** un **programa** en la red (no un navegador) puede omitir `Origin` y
  seguir escribiendo un estado con forma válida (p. ej. borrar equipos). También queda abierto el *DNS rebinding*: un sitio
  hace que su dominio resuelva a la IP local, y entonces `Origin` coincide con `Host`. Para separar de verdad lectura y escritura hace falta
  una **credencial de escritura**, por ejemplo un código que el panel local muestre y que el panel remoto se abra con
  `http://<IP>:8080/?clave=XXXX#/`. Eso **cambia el uso actual del panel remoto**, así que no se implementó sin consultarlo.
  Los overlays no se verían afectados porque sólo leen.
- **Validación:** `npm test` (ver §5). Pasos manuales: abrir el programa, abrir `http://<IP>:8080/#/` en otra PC, poner el
  marcador al aire y verificar que el overlay en vMix lo muestra; el log no debe tener "cambio rechazado".

### H-02 · Carrera: página de comisarios sin autenticación, publicada por el túnel público — **Alta · brecha observada · no corregido (requiere decisión)**

- **Condición:** `race/main.cjs` sirve `GET /comisarios`, `POST /comisarios/trigger` y `POST /comisarios/hide` (líneas 513-540)
  sin ningún control. Cuando no hay configuración cloud, el módulo abre un túnel de Cloudflare al puerto 8080
  (`createPublicTunnel`, línea 189) y la URL de votación que se muestra **al aire en el QR** es `<túnel>/votar`
  (`getVotingUrl`, línea 84). La de comisarios es la misma base con `/comisarios` (`getStewardUrl`, línea 89).
- **Consecuencia:** cualquier espectador que lea el QR puede deducir `<túnel>/comisarios` y poner al aire una sanción con
  texto libre (`reason`). Con la configuración cloud (`comisarioToken`) la URL lleva un token, pero el
  endpoint local por túnel sigue respondiendo.
- **Por qué no se corrigió:** agregar un token cambia el flujo de los comisarios que usan la URL local o del túnel. Hay que
  definir cómo la reciben.
- **Propuesta:** exigir un token aleatorio por sesión en `/comisarios*` (como ya hace el modo cloud), o no publicar
  `/comisarios` por el túnel y dejarlo sólo en la red local. Validar `reason` (largo máximo).
- **Validación:** con el túnel activo, `curl -X POST <túnel>/comisarios/trigger -H "Content-Type: application/json" -d "{\"reason\":\"prueba\"}"`
  hoy pone la alerta al aire; después del cambio debería responder 401/404.
- Relacionado: `POST /vote` no limita votos por cliente (manipulación de la votación del público). Por diseño, la votación es
  abierta; definir si importa.

### H-03 · Ventanas Electron con `nodeIntegration: true` y `contextIsolation: false` — **Media · brecha observada · no corregido**

- `football/main.cjs:217`, `race/main.cjs:1122,1126`, `launcher/main.cjs:74,83`. Cualquier inyección de HTML/JS en esas
  ventanas tendría acceso completo al sistema. Hoy no se encontró `dangerouslySetInnerHTML`, `eval` ni `innerHTML` con datos en las
  interfaces React de `football/src` y `race/src`, y React escapa los textos. H-01 era la vía para meter datos externos en
  esas ventanas y ahora está más acotada.
- **Propuesta:** migrar a `contextIsolation: true` + `preload` con una API mínima. Es un cambio grande que necesita sus
  propias pruebas, por eso no se hizo acá.

### H-04 · Fútbol: `flex gap` sin alternativa para vMix 23 (Chrome 77) — **Media · brecha observada · no corregido**

- 34 usos de `gap:` en `football/src/graphics/{Branding,EventAlert,Lineup,MatchIntro,Scorebug}.jsx`. Chrome 77 no
  soporta `gap` en flex (desde Chrome 84), así que las separaciones desaparecen en ese navegador. El tapado con logo ya se corrigió
  (`LogoCover.jsx`, sin `inset` ni `gap`); Carrera tiene `race/src/utils/flexGapPolyfill.js` y Fútbol no.
- Los tamaños de texto y objetos movidos del EDITOR se guardan por "camino" dentro de la gráfica. Si la gráfica al aire tiene
  otra estructura que la de la vista previa (otro tipo de evento, otro lado, otro modo de logos), el camino no existe y el
  cambio no se aplica. Eso no depende del navegador. Ahora se avisa en el log (`EDITOR: la gráfica ... no tiene el objeto ...`) y
  las vistas previas usan la misma variante que sale al aire (`demoLive` en `football/src/state.js`).
- **Pendiente de validación en vMix real** (ver §6).

### H-05 · Cadena de distribución de módulos — **Evidencia parcial (favorable)**

Verificado en el código, no sólo en la documentación:

- `launcher/moduleManager.cjs:165`: se compara el SHA-256 del ZIP descargado con el que informa el servidor.
- `launcher/moduleManager.cjs:45-53`: se verifica la firma Ed25519 sobre `módulo:versión:sha256` con
  `launcher/release-public-key.pem` (clave pública Ed25519). En la app instalada, sin clave **no se ejecuta** (línea 48). Sólo
  en desarrollo se omite, con un aviso.
- `launcher/moduleManager.cjs:64-69`: la extracción rechaza rutas que salen de la carpeta destino (*zip slip*), y después se
  comprueba que `module.json` corresponda al módulo y la versión pedidos.
- La descarga exige el token de sesión de la licencia (`launcher/api.cjs`).
- Secretos: `.env` está en `.gitignore` y nunca se commiteó (`git log --all -- .env` vacío). Sólo está versionada la clave
  **pública**. `.env.example` no tiene valores.

Límites y observaciones:

- **La firma la aplica el servidor al recibir el paquete** (`scripts/release-modules.cjs`, `DISTRIBUCION.md`). La raíz de confianza
  es entonces la cuenta de administrador del backend y la custodia de `RELEASE_SIGNING_KEY`. Quien obtenga esas credenciales
  publica código que los clientes ejecutan. Esto no se puede evaluar desde este repo (§6).
- No hay protección contra volver a una versión anterior firmada (*downgrade*) más allá de lo que decida el servidor.
- El instalador `.exe` no está firmado con un certificado de código (`DISTRIBUCION.md`). Eso es distinto de la firma de los
  módulos.
- `launcher/logger.cjs` copia toda la consola a un archivo (rota a 1 MB). No se encontró registro de contraseñas. Los
  overlays remotos mandan al log su IP y su navegador (`userAgent`); eso conviene declararlo si se piden logs a clientes.

### H-06 · Fútbol: el tamaño máximo de mensaje Socket.IO limita al panel remoto — **Media · brecha observada · no corregido**

- `football/main.cjs` usa el límite por defecto de Socket.IO (1 MB por mensaje recibido). El estado incluye escudos y fotos
  en Base64. Con equipos con imágenes, un panel remoto que manda el estado completo supera ese límite y el servidor
  **corta la conexión sin aviso**. A los overlays no les afecta, porque sólo reciben. Carrera usa 25 MB y sirve
  los logos por HTTP. Esto no se cambió porque subir el límite agranda la superficie de H-01. Lo recomendable es servir las imágenes por
  HTTP, como en Carrera, o mandar cambios parciales.

## 4. Priorización

| Prioridad | Acción | Estado |
|---|---|---|
| Alta | H-01: filtro de origen, validación, rechazo visible y copias de seguridad | **Hecho** (este cambio) |
| Alta | H-01 residual: credencial de escritura para paneles remotos | Pendiente: requiere decidir cómo se entrega la clave al operador |
| Alta | H-02: token o restricción de `/comisarios` en Carrera | Pendiente: requiere decisión sobre el flujo de comisarios |
| Media | H-04: alternativa a `flex gap` en Fútbol y prueba en vMix 23/29 | Pendiente |
| Media | H-06: imágenes por HTTP en Fútbol (como en Carrera) | Pendiente |
| Media | H-03: `contextIsolation` + `preload` | Pendiente (cambio grande) |
| Media | Plan de pruebas mínimo y criterio de liberación de módulos (29119 / 12207) | Pendiente |
| Baja | `eslint.config.js`: ignorar `**/dist`, `release`, `chromium`, `.claude`; resolver los 42 avisos de `race/src` | Pendiente |
| Baja | Matriz de contextos soportados (25019) y registro de cambios por versión | Pendiente |

## 5. Evidencia nueva que aporta este cambio (y lo que no)

- `football/test/server-security.test.cjs` (`npm test`) levanta el `main.cjs` real con Electron simulado y datos en una
  carpeta temporal. **Riesgo que cubre:** que se vuelva a permitir escribir/persistir estado desde otro origen o con forma inválida, o
  que la protección rompa el uso legítimo. Verifica que un overlay con cualquier origen lee, que un panel por IP escribe y su cambio
  llega al overlay y se guarda (sin `live`), que otro origen y un estado malformado se rechazan sin tocar el archivo y que se crea
  la copia de seguridad. También deja documentado que un cliente sin `Origin` **todavía puede escribir** (riesgo residual).
  Resultado: 3/3 pruebas pasan.
- Reproducción del hallazgo antes y después del cambio: antes, el estado ajeno se persistió y el panel fallaba; después, se rechaza y el
  archivo queda intacto.
- Prueba de punta a punta con navegadores reales sobre el `football/dist` recompilado: panel en Chrome 152 abierto por la IP de la
  red (`http://192.168.0.28:8080/#/`) puso el marcador al aire; el overlay en **Chromium 77** (el de vMix 23) lo mostró;
  0 rechazos registrados. Lo mismo por `127.0.0.1`.
- **Esto no demuestra conformidad con ninguna norma.** Es evidencia técnica puntual. Falta la validación en vMix y OBS reales y toda la
  evaluación de procesos y organización.

## 6. Evidencias externas necesarias (pendientes de validación)

**Uso real (vMix / OBS / PCs de clientes)**
1. En una PC con vMix 23 y otra con vMix 29: agregar un input "Web Browser" con `http://<IP>:8080/#/overlay`, cambiar en el
   EDITOR un tamaño de texto y en PERSONALIZAR una transición con tapado de logo, ponerlas al aire y verificar que se ven. Revisar el log del
   programa: `overlay conectado · <navegador>`, `configuración recibida · ...`, y que no aparezcan avisos
   `EDITOR: ... no tiene el objeto` ni `Tapado ... sin tamaño`.
2. Repetir con OBS (Browser source).
3. Con un panel remoto (otra PC): editar y confirmar que no aparece `cambio rechazado` en el log.
4. Registrar qué versiones de vMix/OBS usan los clientes (matriz de compatibilidad).

**Organización (ISO/IEC 27001, 12207, 29119, 9241-210)**
- Análisis y tratamiento de riesgos, Declaración de Aplicabilidad, políticas de seguridad y responsables.
- Custodia de `RELEASE_SIGNING_KEY` y de las credenciales de administrador del backend (quién accede, MFA, rotación).
- Seguridad del backend `overlayracing.site` (licencias, tokens, publicación de releases, logs).
- Proceso de cambios y liberación: revisiones, aprobación, registro de defectos, notas de versión, soporte a clientes.
- Plan y registros de pruebas por release.
- Actividades con usuarios (operadores) y criterios de aceptación de las tareas críticas.
- Gestión de incidentes y respaldo de datos de clientes.

## 7. Fuentes consultadas

Catálogos oficiales y de organismos de normalización (sólo resúmenes públicos; el texto completo es pago y no se consultó).
`iso.org` bloqueó la descarga automática, y las ediciones se confirmaron por los resultados de búsqueda de esos catálogos.

- ISO/IEC 25010:2023 — https://www.iso.org/standard/78176.html · vista previa: https://cdn.standards.iteh.ai/samples/78176/13ff8ea97048443f99318920757df124/ISO-IEC-25010-2023.pdf
- ISO/IEC 25019:2023 — https://www.iso.org/standard/78177.html · https://webstore.iec.ch/publication/90105
- ISO/IEC/IEEE 29119 (serie) — https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html · https://shop.standards.ie/en-ie/standards/iso-iec-ieee-29119-1-2022-601862_saig_iso_iso_3097961 (la edición 2024 de la parte 5 sólo se confirmó en fuentes secundarias)
- ISO/IEC/IEEE 12207:2026 — https://www.iso.org/standard/90219.html
- ISO 9241-210:2019 — https://www.iso.org/standard/77520.html
- ISO/IEC 27034-1:2011 — https://www.iso.org/standard/44378.html · https://webstore.iec.ch/publication/11311 (no se pudo confirmar el corrigendum Cor 1:2014)
- ISO/IEC 27001:2022 y Amd 1:2024 — https://www.iso.org/standard/27001 · https://committee.iso.org/standard/88435.html
