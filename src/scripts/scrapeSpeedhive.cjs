const puppeteer = require('puppeteer');

// Variables globales para mantener el navegador abierto
let browser = null;
let page = null;

// Función para inicializar el navegador una sola vez
async function initBrowser() {
  if (!browser) {
    console.log(`🚀 Abriendo motor de Scrapping en segundo plano...`);
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-web-security']
    });
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
  }
  return page;
}

// =========================================================================
// 1. MOTOR SPEEDHIVE
// =========================================================================
async function scrapeSpeedhive(code) {
  if (!code) return { session: {}, drivers: [] };
  
  // URL ESTRICTA DE SPEEDHIVE
  const url = `https://speedhive.mylaps.com/livetiming/${code}/active`;

  try {
    const p = await initBrowser();
    if (p.url() !== url && p.url() !== url + '/') {
      console.log(`⏳ Conectando a Speedhive: ${url}`);
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    }
    
    await p.waitForSelector('.datatable-row', { timeout: 3000 }).catch(() => {});

    const result = await p.evaluate(() => {
      const sessionData = { totalTime: '-', laps: '-' };
      const data = [];
      
      const headers = document.querySelectorAll('.header');
      headers.forEach(h => {
        const text = h.innerText.toLowerCase();
        const valueEl = h.nextElementSibling;
        if (valueEl) {
          let val = valueEl.innerText.split(/provisional/i)[0].split(/official/i)[0].trim(); 
          if (text.includes('total time')) sessionData.totalTime = val;
          if (text.includes('laps')) sessionData.laps = val;
        }
      });

      const rows = document.querySelectorAll('.datatable-row');
      rows.forEach(row => {
        const getText = (colClass) => {
          const el = row.querySelector(`.datatable-cell-${colClass} .text-truncate`);
          return el ? el.innerText.trim() : '';
        };
        const posEl = row.querySelector('.datatable-cell-position .position-cell span');
        const pos = posEl ? posEl.innerText.trim() : '';
        const name = getText('competitor');

        if (pos && name) {
          let gapVal = getText('gap');
          let diffVal = getText('difference');
          data.push({
            pos, number: getText('display-number') || '-', name, make: '', 
            laps: getText('laps') || '-', lastLap: getText('last-lap-time') || '-',
            diff: gapVal && gapVal !== '' ? gapVal : (diffVal || '-'), 
            totalTime: getText('total-time') || '-', bestLap: getText('best-lap-time') || '-'
          });
        }
      });
      return { session: sessionData, drivers: data };
    });

    console.log(`✅ [1s Tick] Speedhive - Pilotos: ${result.drivers.length}`);
    return result;
  } catch (e) {
    console.error(`⚠️ Error Speedhive:`, e.message);
    if (browser) { await browser.close().catch(()=>{}); browser = null; page = null; }
    return { session: {}, drivers: [] };
  }
}

// =========================================================================
// 2. MOTOR RACE MONITOR
// =========================================================================
async function scrapeRaceMonitor(code) {
  if (!code) return { session: {}, drivers: [] };
  
  // URL ESTRICTA DE RACE MONITOR
  const url = `https://www.race-monitor.com/Live/Race/${code}`;

  try {
    const p = await initBrowser();
    if (p.url() !== url && p.url() !== url + '/') {
      console.log(`⏳ Conectando a Race Monitor: ${url}`);
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
    }
    
    await p.waitForSelector('.racerRowWide, .racerRow, .racerRowStacked', { timeout: 3000 }).catch(() => {});

    let finalResult = { session: { totalTime: '-', laps: '-' }, drivers: [] };
    const frames = p.frames();
    
    for (const frame of frames) {
      try {
        const frameData = await frame.evaluate(() => {
          const sessionData = { totalTime: '-', laps: '-' };
          const data = [];

          const timeEl = document.querySelector('.timingHeader div[style*="top: 21px"][style*="left: 60px"]');
          if (timeEl) sessionData.totalTime = timeEl.innerText.trim();

          const rows = document.querySelectorAll('.racerRowWide, .racerRow, .racerRowStacked');
          rows.forEach(row => {
            const pos = row.querySelector('.position')?.innerText.trim() || '';
            let rawName = row.querySelector('.racerName')?.innerText.trim() || '';
            let number = '-'; let name = rawName;
            if (rawName.startsWith('#')) {
              const parts = rawName.split(' ');
              number = parts[0].replace('#', '').trim();
              name = parts.slice(1).join(' ').trim();
            }
            const category = row.querySelector('.racerCategory')?.innerText.trim() || '';
            const laps = row.querySelector('.lapsValue')?.innerText.trim() || '-';
            const lastLap = row.querySelector('.lastTimeValue')?.innerText.trim() || '-';
            const bestLap = row.querySelector('.bestTimeValue')?.innerText.trim() || '-';
            let diff = row.querySelector('.diffValue')?.innerText.trim() || '-';
            let gap = row.querySelector('.gapValue')?.innerText.trim() || '-';

            if (name && pos) {
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
    
    console.log(`✅ [1s Tick] Race Monitor - Pilotos: ${finalResult.drivers.length}`);
    return finalResult;
  } catch (e) {
    console.error(`⚠️ Error Race Monitor:`, e.message);
    if (browser) { await browser.close().catch(()=>{}); browser = null; page = null; }
    return { session: {}, drivers: [] };
  }
}

// Exportamos AMBOS motores por separado
module.exports = { scrapeSpeedhive, scrapeRaceMonitor };