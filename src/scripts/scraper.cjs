const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let browser = null;
let page = null;
let pageJustNavigated = false;
let raceMonitorFrame = null;
let navError = null;
let rmNotLive = { code: null, at: 0, url: '' };

// Busca un navegador Chromium para el scraper: primero el que descarga Puppeteer (existe en la
// PC de desarrollo pero NO en la de un cliente con la app portable), y si no está, usa el
// Chrome o Edge instalado en el sistema (Edge viene con todo Windows 10/11).
// Busca un ejecutable de Chromium dentro de una carpeta (hasta 4 niveles de profundidad).
function findChromiumIn(dir, depth = 0) {
  const names = process.platform === 'win32'
    ? ['chrome.exe']
    : ['chrome'];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return null; }
  for (const name of names) {
    const hit = entries.find(en => en.isFile() && en.name === name);
    if (hit) return path.join(dir, hit.name);
  }
  if (depth >= 4) return null;
  for (const en of entries) {
    if (en.isDirectory()) {
      const found = findChromiumIn(path.join(dir, en.name), depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function findBrowserExecutable() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  // Chromium que se empaqueta junto con la app (carpeta "chromium" en los recursos del .exe):
  // así el programa funciona aunque la PC no tenga Chrome, Edge ni ninguna otra dependencia.
  const bundledRoots = [];
  if (process.resourcesPath) bundledRoots.push(path.join(process.resourcesPath, 'chromium'));
  bundledRoots.push(path.join(__dirname, '..', '..', 'chromium'));
  for (const root of bundledRoots) {
    if (fs.existsSync(root)) {
      const found = findChromiumIn(root);
      if (found) return found;
    }
  }

  try {
    const bundled = puppeteer.executablePath();
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch (e) { /* Puppeteer sin Chromium descargado */ }

  const candidates = [];
  if (process.platform === 'win32') {
    const roots = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env['LOCALAPPDATA']].filter(Boolean);
    for (const root of roots) {
      candidates.push(
        path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      );
    }
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge');
  }
  return candidates.find(p => fs.existsSync(p)) || null;
}

function scraperError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function toErrorObject(e) {
  return { code: e?.code && typeof e.code === 'string' && e.code.startsWith('SCRAPER_') ? e.code : 'SCRAPER_ERROR', message: e?.message || '' };
}

async function initBrowser() {

  if (!browser) {

    console.log(
      `🚀 Abriendo motor de Scrapping en segundo plano...`
    );

    const executablePath = findBrowserExecutable();
    if (!executablePath) {
      throw scraperError('SCRAPER_NO_BROWSER', 'No se encontró Chrome, Edge ni Chromium en esta PC.');
    }
    console.log(`🧭 Navegador del scraper: ${executablePath}`);

    try {
    browser = await puppeteer.launch({

      executablePath,

      headless: true,

      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    } catch (e) {
      browser = null;
      throw scraperError('SCRAPER_LAUNCH_FAILED', e.message);
    }

    page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080
    });

  }

  return page;
}
// 1. MOTOR SPEEDHIVE
// =========================================================================
async function scrapeSpeedhive(inputCode) {
  if (!inputCode) {
    return {
      session: {},
      drivers: []
    };
  }

  let code = inputCode.trim();

  if (code.includes('speedhive.mylaps.com')) {
    const match = code.match(
      /livetiming\/([^/?#]+)/i
    );

    if (match) {
      code = match[1];
    }
  }

  code = code
    .replace(/\/active\/?$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const url =
    `https://speedhive.mylaps.com/livetiming/${code}/active`;

  try {

    const p = await initBrowser();
    if (!p.url().startsWith(url)) {

      console.log(
        `⏳ Conectando a Speedhive: ${url}`
      );

      navError = null;
      await p.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }).catch(err => {

        navError = err.message;
        console.log(
          `⚠️ goto Speedhive: ${err.message}`
        );

      });
      pageJustNavigated = true;
    }

    async function handleCookiebot() {

      try {

        const result = await p.evaluate(() => {

          const bodyText =
            document.body?.innerText || '';

          const hasCookiebot =
            /We use cookies to facilitate/i.test(bodyText) ||
            /Allow all cookies/i.test(bodyText) ||
            /Reject all cookies/i.test(bodyText);

          if (!hasCookiebot) {
            return {
              detected: false,
              clicked: false
            };
          }
          const elements = Array.from(
            document.querySelectorAll(
              'button, a, [role="button"]'
            )
          );

          const reject = elements.find(el => {

            const text =
              (el.innerText ||
                el.textContent ||
                '')
                .trim()
                .toLowerCase();

            return (
              text === 'reject all cookies' ||
              text.includes('reject all cookies')
            );
          });

          if (reject) {

            reject.click();

            return {
              detected: true,
              clicked: true,
              button: 'reject'
            };
          }
          const rejectFallback =
            elements.find(el => {

              const text =
                (el.innerText ||
                  el.textContent ||
                  '')
                  .trim()
                  .toLowerCase();

              return (
                text.includes('reject') &&
                text.includes('cookie')
              );
            });

          if (rejectFallback) {

            rejectFallback.click();

            return {
              detected: true,
              clicked: true,
              button: 'reject-fallback'
            };
          }

          return {
            detected: true,
            clicked: false
          };

        });

        if (result.detected) {

          console.log(
            `🍪 Cookiebot detectado`
          );

          if (result.clicked) {

            console.log(
              `🍪 Cookiebot: ${result.button}`
            );

            // Dar tiempo a Cookiebot para cerrar
            await new Promise(
              resolve => setTimeout(resolve, 1500)
            );
          }
        }

        return result;

      } catch (e) {

        console.log(
          `⚠️ Error manejando Cookiebot: ${e.message}`
        );

        return {
          detected: false,
          clicked: false
        };
      }
    }
    if (pageJustNavigated) {
      await handleCookiebot();

      await p.waitForFunction(() => {

        const text =
          document.body?.innerText || '';

        return !/Allow all cookies/i.test(text);

      }, {
        timeout: 10000
      }).catch(() => {

        console.log(
          `⚠️ Cookiebot todavía aparece en pantalla`
        );

      });

      await new Promise(
        resolve => setTimeout(resolve, 2000)
      );

      pageJustNavigated = false;
    }
    async function findSpeedhiveFrame() {

      const frames = p.frames();

      for (const frame of frames) {

        try {

          const result = await frame.evaluate(() => {

            const rows =
              document.querySelectorAll(
                '.datatable-row'
              );

            if (rows.length === 0) {
              return {
                found: false,
                rows: 0
              };
            }

            const competitor =
              rows[0].querySelector(
                '.datatable-cell-competitor'
              );

            const number =
              rows[0].querySelector(
                '.datatable-cell-display-number'
              );

            return {
              found:
                !!competitor ||
                !!number,

              rows: rows.length
            };

          });

          if (result.found) {

            return frame;
          }

        } catch (e) {
          // El frame puede estar navegando.
        }
      }

      return null;
    }
    let speedhiveFrame = null;

    const maxAttempts = 30;

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt++
    ) {
      // Si la navegación ya falló (sin internet, sitio bloqueado), no tiene sentido esperar 30s
      if (navError && attempt >= 3) break;

      if (
        attempt === 1 ||
        attempt === 5 ||
        attempt === 10
      ) {
        await handleCookiebot();
      }

      speedhiveFrame =
        await findSpeedhiveFrame();

      if (speedhiveFrame) {

        const count =
          await speedhiveFrame.evaluate(() => {

            return document.querySelectorAll(
              '.datatable-row'
            ).length;

          }).catch(() => 0);

        console.log(
          `✅ Speedhive: leaderboard encontrado ` +
          `(${count} filas)`
        );

        break;
      }

      if (
        attempt === 1 ||
        attempt === 5 ||
        attempt === 10 ||
        attempt === 20 ||
        attempt === 30
      ) {

        console.log(
          `🔎 Speedhive intento ${attempt}/${maxAttempts}`
        );

        console.log(
          `🔎 Frames:`,
          p.frames().map(frame => frame.url())
        );
      }

      await new Promise(
        resolve => setTimeout(resolve, 1000)
      );
    }
    if (!speedhiveFrame) {

      console.log(
        `⚠️ Speedhive: no se encontró el leaderboard.`
      );

      const debug =
        await p.evaluate(() => {

          return {

            url: location.href,

            title: document.title,

            bodyText:
              document.body?.innerText
                ?.slice(0, 2000) || '',

            iframes:
              Array.from(
                document.querySelectorAll('iframe')
              ).map(
                iframe => iframe.src || ''
              ),

            htmlLength:
              document.documentElement?.outerHTML
                ?.length || 0
          };

        }).catch(() => null);

      console.log(
        `🔎 Speedhive DEBUG:`,
        debug
      );

      return {
        session: {
          name: '',
          totalTime: '-',
          laps: '-'
        },
        drivers: [],
        ...(navError ? { error: { code: 'SCRAPER_NAV_FAILED', message: navError } } : {})
      };
    }
    const result =
      await speedhiveFrame.evaluate(() => {

        const sessionData = {
          name: '',
          totalTime: '-',
          laps: '-'
        };

        const data = [];
        const getCellText = (
          row,
          className
        ) => {

          const cell =
            row.querySelector(
              `.datatable-cell-${className}`
            );

          if (!cell) {
            return '';
          }

          const textElement =
            cell.querySelector(
              '.text-truncate'
            );

          return (
            textElement?.textContent ||
            cell.textContent ||
            ''
          ).trim();
        };
        // En la vista /active de Speedhive el nombre de la sesión (ej. "125cc 4T Libre - 1era Manga")
        // va en <h1 class="session-name">; los demás son respaldo por si cambian las clases.
        const sessionSelectors = [
          'h1.session-name',
          '.session-name',
          '.session-title',
          '[class*="session-name"]',
          '[class*="session-title"]',
          '.active-session-header h1',
          'h1.title'
        ];

        for (
          const selector of sessionSelectors
        ) {

          const element =
            document.querySelector(
              selector
            );

          if (
            element &&
            element.textContent.trim()
          ) {

            sessionData.name =
              element.textContent.trim();

            break;
          }
        }
        const rows =
          Array.from(
            document.querySelectorAll(
              '.datatable-row'
            )
          );

        rows.forEach(row => {

          const pos =
            getCellText(
              row,
              'position'
            );

          let number =
            getCellText(
              row,
              'display-number'
            );

          let name =
            getCellText(
              row,
              'competitor'
            );

          const nationality =
            getCellText(
              row,
              'nationality'
            );

          const className =
            getCellText(
              row,
              'class-name'
            );

          const laps =
            getCellText(
              row,
              'laps'
            ) || '0';

          const lastLap =
            getCellText(
              row,
              'last-lap-time'
            ) || '-';

          const difference =
            getCellText(
              row,
              'difference'
            );

          const gap =
            getCellText(
              row,
              'gap'
            );

          const totalTime =
            getCellText(
              row,
              'total-time'
            ) || '-';

          const bestLap =
            getCellText(
              row,
              'best-lap-time'
            ) || '-';

          const sector1 =
            getCellText(
              row,
              'section-0'
            );

          const sector2 =
            getCellText(
              row,
              'section-1'
            );

          const sector3 =
            getCellText(
              row,
              'section-2'
            );
          if (!number && name) {

            const match =
              name.match(
                /^#?(\d+)\s+(.*)$/
              );

            if (match) {

              number = match[1];
              name = match[2];
            }
          }

          if (!name && number) {
            name = `Piloto ${number}`;
          }
          if (
            pos &&
            (name || number)
          ) {

            data.push({

              pos,

              number:
                number || '-',

              name:
                name || '',

              nationality:
                nationality || '',

              make:
                className || '',

              laps,

              lastLap,

              diff:
                gap &&
                  gap !== '-' &&
                  gap !== ''
                  ? gap
                  : (
                    difference ||
                    '-'
                  ),

              totalTime,

              bestLap,

              sector1:
                sector1 || '',

              sector2:
                sector2 || '',

              sector3:
                sector3 || ''
            });
          }
        });
        if (
          data.length > 0
        ) {

          sessionData.laps =
            data[0].laps;
        }

        return {
          session: sessionData,
          drivers: data
        };
      });
    console.log(
      `✅ [1s Tick] Speedhive - ` +
      `"${result.session.name}" | ` +
      `Pilotos: ${result.drivers.length}`
    );

    if (
      result.drivers.length > 0
    ) {

      console.log(
        `🏁 Líder:`,
        result.drivers[0]
      );
    }

    return result;

  } catch (e) {

    console.error(
      `⚠️ Error Speedhive:`,
      e.message
    );

    if (
      browser &&
      (
        e.message.includes(
          'Execution context'
        ) ||
        e.message.includes(
          'Target closed'
        ) ||
        e.message.includes(
          'Session closed'
        )
      )
    ) {

      await browser.close()
        .catch(() => { });

      browser = null;
      page = null;
    }

    return {
      session: {},
      drivers: [],
      error: toErrorObject(e)
    };
  }
}

// =========================================================================
// 2. MOTOR RACE MONITOR
// =========================================================================
async function scrapeRaceMonitor(inputCode) {
  if (!inputCode) return { session: {}, drivers: [] };

  let code = inputCode.trim();
  if (code.includes('race-monitor.com')) {
    const match = code.match(/Race\/(\d+)/);
    if (match) code = match[1];
  }

  const url = `https://www.race-monitor.com/Live/Race/${code}`;

  try {
    const p = await initBrowser();
    let justNavigated = false;

    // Si Race Monitor ya nos redirigió a "Resultados" (la carrera terminó / no está en vivo), no
    // volvemos a navegar cada segundo: reintentamos cada 20s por si la sesión arranca.
    const notLiveRecently = rmNotLive.code === code && Date.now() - rmNotLive.at < 20000;
    if (notLiveRecently) {
      return { session: {}, drivers: [], error: { code: 'SCRAPER_RACE_NOT_LIVE', message: rmNotLive.url } };
    }

    if (p.url() !== url && p.url() !== url + '/') {
      console.log(`⏳ Conectando a Race Monitor: ${url}`);
      navError = null;
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(err => { navError = err.message; });
      await new Promise(r => setTimeout(r, 2000));
      raceMonitorFrame = null; // navegamos a una carrera nueva: hay que rebuscar el frame
      justNavigated = true;

      if (/\/Results\//i.test(p.url())) {
        console.log(`ℹ️ Race Monitor redirigió a Resultados (${p.url()}): la carrera no está en vivo.`);
        rmNotLive = { code, at: Date.now(), url: p.url() };
        return { session: {}, drivers: [], error: { code: 'SCRAPER_RACE_NOT_LIVE', message: p.url() } };
      }
    }

    const evalFrame = async (frame) => {
      return frame.evaluate(() => {
        const sessionData = { name: '', totalTime: '-', laps: '-' };
        const data = [];

        const sessionNameEl = document.querySelector('.timingHeader div[style*="top: 7px"][style*="left: 60px"]');
        if (sessionNameEl) sessionData.name = sessionNameEl.textContent.trim();

        const timeEl = document.querySelector('.timingHeader div[style*="top: 21px"][style*="left: 60px"]');
        if (timeEl) sessionData.totalTime = timeEl.textContent.trim();

        // Estado de la pista que informa Race Monitor arriba a la derecha: "Green", "Yellow", "Red"...
        const flagEl = document.querySelector('.timingHeader div[style*="top: 7px"][style*="right: 40px"]');
        sessionData.flag = flagEl ? flagEl.textContent.trim().toLowerCase() : '';

        const rows = document.querySelectorAll('.racerRowWide, .racerRow, .racerRowStacked');
        rows.forEach(row => {
          const pos = row.querySelector('.position')?.textContent.trim() || '';
          let rawName = row.querySelector('.racerName')?.textContent.trim() || '';
          let number = '-'; let name = rawName;

          if (rawName.startsWith('#') || /^\d+\s/.test(rawName)) {
            const parts = rawName.split(' ');
            number = parts[0].replace('#', '').trim();
            name = parts.slice(1).join(' ').trim();
          }

          if (!name && number) name = `Piloto ${number}`;

          const category = row.querySelector('.racerCategory')?.textContent.trim() || '';
          const laps = row.querySelector('.lapsValue')?.textContent.trim() || '0';
          const lastLap = row.querySelector('.lastTimeValue')?.textContent.trim() || '-';
          const bestLap = row.querySelector('.bestTimeValue')?.textContent.trim() || '-';
          let diff = row.querySelector('.diffValue')?.textContent.trim() || '-';
          let gap = row.querySelector('.gapValue')?.textContent.trim() || '-';

          if (pos && (name || number)) {
            data.push({
              pos, number, name, make: category, laps, lastLap, bestLap, totalTime: '-',
              diff: gap !== '-' && gap !== '' ? gap : diff
            });
          }
        });

        if (data.length > 0) sessionData.laps = data[0].laps;
        return { session: sessionData, drivers: data };
      });
    };

    let finalResult = { session: { name: '', totalTime: '-', laps: '-' }, drivers: [] };

    // --- CAMINO RÁPIDO: ya tenemos el frame bueno cacheado, vamos directo ---
    if (raceMonitorFrame) {
      try {
        const cachedData = await evalFrame(raceMonitorFrame);
        if (cachedData && cachedData.drivers.length > 0) {
          console.log(`✅ [1s Tick] Race Monitor - "${cachedData.session.name}" | Pilotos: ${cachedData.drivers.length}`);
          return cachedData;
        }
        // El frame cacheado ya no tiene datos (recargó / cambió sesión): invalidar y rebuscar abajo
        raceMonitorFrame = null;
      } catch (e) {
        // El frame se destruyó (navegación, iframe removido, etc.): invalidar y rebuscar abajo
        raceMonitorFrame = null;
      }
    }

    // --- CAMINO LENTO: buscar el frame correcto entre todos los iframes (sólo cuando hace falta) ---
    // Tras una navegación nueva se espera hasta 25s a que cargue la tabla (PCs lentas o conexiones
    // lentas tardan más que la PC de desarrollo); en los ticks siguientes, solo 3s.
    const maxSeconds = justNavigated ? 25 : 3;
    for (let sec = 0; sec < maxSeconds && finalResult.drivers.length === 0; sec++) {
      for (const frame of p.frames()) {
        try {
          const frameData = await evalFrame(frame);
          if (frameData && frameData.drivers.length > 0) {
            finalResult = frameData;
            raceMonitorFrame = frame; // cachear para los próximos ticks
            break;
          }
        } catch (e) {}
      }
      if (finalResult.drivers.length === 0 && sec < maxSeconds - 1) await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`✅ [1s Tick] Race Monitor - "${finalResult.session.name}" | Pilotos: ${finalResult.drivers.length}`);
    if (finalResult.drivers.length === 0 && navError) {
      return { ...finalResult, error: { code: 'SCRAPER_NAV_FAILED', message: navError } };
    }
    return finalResult;
  } catch (e) {
    console.error(`⚠️ Error Race Monitor:`, e.message);
    raceMonitorFrame = null;
    if (browser && (e.message.includes('Execution context') || e.message.includes('Target closed'))) {
      await browser.close().catch(() => { }); browser = null; page = null;
    }
    return { session: {}, drivers: [], error: toErrorObject(e) };
  }
}

// Datos para el panel de diagnóstico: qué navegador se va a usar y de dónde sale.
function getBrowserInfo() {
  const executablePath = findBrowserExecutable();
  const bundledDir = process.resourcesPath ? path.join(process.resourcesPath, 'chromium') : '';
  return {
    executablePath,
    bundledPresent: !!(bundledDir && fs.existsSync(bundledDir) && findChromiumIn(bundledDir)),
    browserRunning: !!browser
  };
}

module.exports = { scrapeSpeedhive, scrapeRaceMonitor, getBrowserInfo };