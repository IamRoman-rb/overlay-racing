const puppeteer = require('puppeteer');

let browser = null;
let page = null;

async function initBrowser() {

  if (!browser) {

    console.log(
      `🚀 Abriendo motor de Scrapping en segundo plano...`
    );

    browser = await puppeteer.launch({

      headless: true,

      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

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

      await p.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }).catch(err => {

        console.log(
          `⚠️ goto Speedhive: ${err.message}`
        );

      });
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
        drivers: []
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
        const sessionSelectors = [
          '.session-name',
          '.session-title',
          '[class*="session-name"]',
          '[class*="session-title"]'
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
        .catch(() => {});

      browser = null;
      page = null;
    }

    return {
      session: {},
      drivers: []
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
    if (p.url() !== url && p.url() !== url + '/') {
      console.log(`⏳ Conectando a Race Monitor: ${url}`);
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
    }
    
    await p.waitForSelector('.racerRowWide, .racerRow, .racerRowStacked', { timeout: 3000 }).catch(() => {});

    let finalResult = { session: { name: '', totalTime: '-', laps: '-' }, drivers: [] };
    const frames = p.frames();
    
    for (const frame of frames) {
      try {
        const frameData = await frame.evaluate(() => {
          const sessionData = { name: '', totalTime: '-', laps: '-' };
          const data = [];

          const sessionNameEl = document.querySelector('.timingHeader div[style*="top: 7px"][style*="left: 60px"]');
          if (sessionNameEl) sessionData.name = sessionNameEl.textContent.trim();

          const timeEl = document.querySelector('.timingHeader div[style*="top: 21px"][style*="left: 60px"]');
          if (timeEl) sessionData.totalTime = timeEl.textContent.trim();

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

        if (frameData && frameData.drivers.length > 0) {
          finalResult = frameData;
          break;
        }
      } catch (e) {}
    }
    
    console.log(`✅ [1s Tick] Race Monitor - "${finalResult.session.name}" | Pilotos: ${finalResult.drivers.length}`);
    return finalResult;
  } catch (e) {
    console.error(`⚠️ Error Race Monitor:`, e.message);
    if (browser && (e.message.includes('Execution context') || e.message.includes('Target closed'))) { 
      await browser.close().catch(()=>{}); browser = null; page = null; 
    }
    return { session: {}, drivers: [] };
  }
}

module.exports = { scrapeSpeedhive, scrapeRaceMonitor };