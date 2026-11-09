'use strict';
// HTML de la planilla de resultados que main.cjs imprime a PDF (webContents.printToPDF). Usa los datos ya procesados
// (con las correcciones manuales aplicadas) y la configuración del panel: logos, campeonato, categoría y circuito.

const TEXT = {
  es: {
    results: 'RESULTADOS', qualifying: 'CLASIFICACIÓN', general: 'CLASIFICACIÓN GENERAL', byClass: 'CLASE', winners: 'GANADORES POR CLASE',
    pos: 'POS', num: 'Nº', driver: 'PILOTO', cls: 'CLASE', laps: 'VUELTAS', total: 'TIEMPO TOTAL', diff: 'DIFERENCIA',
    best: 'MEJOR VUELTA', notes: 'OBSERVACIONES', fastest: 'VUELTA MÁS RÁPIDA', penalty: 'Penalización +{s} s', dsq: 'Descalificado',
    circuit: 'Circuito', session: 'Sesión', date: 'Fecha', generated: 'Generado el {date} con Overlay Graphics. Resultados sujetos a confirmación oficial.',
    noData: 'No hay datos de la carrera.', classPos: 'POS. CLASE'
  },
  en: {
    results: 'RESULTS', qualifying: 'QUALIFYING', general: 'OVERALL CLASSIFICATION', byClass: 'CLASS', winners: 'CLASS WINNERS',
    pos: 'POS', num: 'NO.', driver: 'DRIVER', cls: 'CLASS', laps: 'LAPS', total: 'TOTAL TIME', diff: 'GAP',
    best: 'BEST LAP', notes: 'NOTES', fastest: 'FASTEST LAP', penalty: '+{s} s time penalty', dsq: 'Disqualified',
    circuit: 'Circuit', session: 'Session', date: 'Date', generated: 'Generated on {date} with Overlay Graphics. Results subject to official confirmation.',
    noData: 'No race data.', classPos: 'CLASS POS.'
  },
  pt: {
    results: 'RESULTADOS', qualifying: 'CLASSIFICAÇÃO', general: 'CLASSIFICAÇÃO GERAL', byClass: 'CLASSE', winners: 'VENCEDORES POR CLASSE',
    pos: 'POS', num: 'Nº', driver: 'PILOTO', cls: 'CLASSE', laps: 'VOLTAS', total: 'TEMPO TOTAL', diff: 'DIFERENÇA',
    best: 'MELHOR VOLTA', notes: 'OBSERVAÇÕES', fastest: 'VOLTA MAIS RÁPIDA', penalty: 'Punição +{s} s', dsq: 'Desclassificado',
    circuit: 'Circuito', session: 'Sessão', date: 'Data', generated: 'Gerado em {date} com Overlay Graphics. Resultados sujeitos a confirmação oficial.',
    noData: 'Sem dados da corrida.', classPos: 'POS. CLASSE'
  },
  de: {
    results: 'ERGEBNISSE', qualifying: 'QUALIFYING', general: 'GESAMTWERTUNG', byClass: 'KLASSE', winners: 'KLASSENSIEGER',
    pos: 'POS', num: 'NR.', driver: 'FAHRER', cls: 'KLASSE', laps: 'RUNDEN', total: 'GESAMTZEIT', diff: 'ABSTAND',
    best: 'BESTE RUNDE', notes: 'BEMERKUNGEN', fastest: 'SCHNELLSTE RUNDE', penalty: '+{s} s Zeitstrafe', dsq: 'Disqualifiziert',
    circuit: 'Strecke', session: 'Session', date: 'Datum', generated: 'Erstellt am {date} mit Overlay Graphics. Ergebnisse vorbehaltlich offizieller Bestätigung.',
    noData: 'Keine Renndaten.', classPos: 'KLASSE POS.'
  },
  fr: {
    results: 'RÉSULTATS', qualifying: 'QUALIFICATIONS', general: 'CLASSEMENT GÉNÉRAL', byClass: 'CLASSE', winners: 'VAINQUEURS PAR CLASSE',
    pos: 'POS', num: 'Nº', driver: 'PILOTE', cls: 'CLASSE', laps: 'TOURS', total: 'TEMPS TOTAL', diff: 'ÉCART',
    best: 'MEILLEUR TOUR', notes: 'OBSERVATIONS', fastest: 'TOUR LE PLUS RAPIDE', penalty: 'Pénalité +{s} s', dsq: 'Disqualifié',
    circuit: 'Circuit', session: 'Session', date: 'Date', generated: 'Généré le {date} avec Overlay Graphics. Résultats sous réserve de confirmation officielle.',
    noData: 'Aucune donnée de course.', classPos: 'POS. CLASSE'
  }
};

const esc = (v) => String(v === undefined || v === null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Solo imágenes embebidas (data URL de png / jpeg / svg): nunca rutas ni direcciones externas
const safeImage = (v) => (typeof v === 'string' && /^data:image\/(png|jpe?g|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/.test(v) ? v : '');

const dash = (v) => (v === undefined || v === null || v === '' ? '—' : v);

function lapSeconds(str) {
  const s = String(str || '').trim();
  if (!/^\d+(:\d+){0,2}(\.\d+)?$/.test(s)) return null;
  const val = s.split(':').reduce((acc, part) => acc * 60 + parseFloat(part), 0);
  return Number.isFinite(val) && val > 0 ? val : null;
}

function buildResultsHtml({ leaderboard, config = {}, language = 'es', date = new Date() }) {
  const t = TEXT[language] || TEXT.es;
  const fmt = (s, vars) => Object.keys(vars || {}).reduce((acc, k) => acc.split(`{${k}}`).join(vars[k]), s);
  const session = (leaderboard && leaderboard.session) || {};
  const drivers = Array.isArray(leaderboard && leaderboard.drivers) ? leaderboard.drivers : [];
  const qualifying = !!session.qualifying;
  const multiclass = !!session.multiclass && Array.isArray(session.classes) && session.classes.length > 0;
  const accent = /^#[0-9a-f]{3,8}$/i.test(config.themeMain || '') ? config.themeMain : '#e74c3c';
  const locale = { es: 'es-AR', en: 'en-GB', pt: 'pt-BR', de: 'de-DE', fr: 'fr-FR' }[language] || 'es-AR';
  const dateText = date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dateTimeText = `${dateText} ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;

  const category = config.categoryName || session.detectedCategory || '';
  const title = category || config.campeonato || session.name || t.results;

  const fastest = drivers.reduce((best, d) => {
    const s = lapSeconds(d.bestLap);
    return s !== null && (!best || s < best.s) ? { d, s } : best;
  }, null);

  const notesOf = (d) => {
    const notes = [];
    if (d.dsq) notes.push(t.dsq);
    if (d.penaltySeconds) notes.push(fmt(t.penalty, { s: d.penaltySeconds }));
    return notes.join(' · ');
  };

  // Diferencia con el líder de la clase (en las tablas por clase la columna de la fuente es respecto del general)
  const classDiff = (d, leader) => {
    if (d.dsq) return 'DSQ';
    if (!leader || leader === d) return '—';
    if (qualifying) {
      const a = lapSeconds(d.bestLap); const b = lapSeconds(leader.bestLap);
      return a !== null && b !== null ? `+${(a - b).toFixed(3)}` : '—';
    }
    const lapsDown = (parseInt(leader.laps, 10) || 0) - (parseInt(d.laps, 10) || 0);
    if (lapsDown > 0) return `+${lapsDown} ${lapsDown === 1 ? 'LAP' : 'LAPS'}`;
    const a = lapSeconds(d.totalTime); const b = lapSeconds(leader.totalTime);
    return a !== null && b !== null ? `+${(a - b).toFixed(3)}` : '—';
  };

  const rowsHtml = (list, { classPos = false, showClass = false } = {}) => list.map(d => {
    const isFastest = fastest && fastest.d === d;
    const diff = classPos ? classDiff(d, list.find(x => x.classLeader)) : (String(d.pos) === '1' ? '—' : dash(d.diff));
    const timeCell = qualifying
      ? `<td class="mono strong">${esc(dash(d.bestLap))}</td><td class="mono">${esc(diff)}</td>`
      : `<td class="mono">${esc(dash(d.totalTime))}</td><td class="mono">${esc(diff)}</td><td class="mono${isFastest ? ' fastest' : ''}">${esc(dash(d.bestLap))}</td>`;
    return `<tr class="${d.dsq ? 'dsq' : ''}">
      <td class="pos">${esc(classPos ? (d.dsq ? 'DSQ' : dash(d.classPos)) : dash(d.pos))}</td>
      <td class="num">${esc(dash(d.number))}</td>
      <td class="name">${esc(String(d.name || '').toUpperCase())}</td>
      ${showClass ? `<td>${esc(dash(d.cls || d.make))}</td>` : ''}
      <td class="center">${esc(dash(d.laps))}</td>
      ${timeCell}
      <td class="notes">${esc(notesOf(d))}</td>
    </tr>`;
  }).join('');

  const headHtml = ({ classPos = false, showClass = false } = {}) => `<tr>
    <th class="pos">${classPos ? t.classPos : t.pos}</th><th class="num">${t.num}</th><th>${t.driver}</th>
    ${showClass ? `<th>${t.cls}</th>` : ''}
    <th class="center">${t.laps}</th>
    ${qualifying ? `<th>${t.best}</th><th>${t.diff}</th>` : `<th>${t.total}</th><th>${t.diff}</th><th>${t.best}</th>`}
    <th>${t.notes}</th>
  </tr>`;

  const tables = [];
  if (!drivers.length) {
    tables.push(`<p class="empty">${t.noData}</p>`);
  } else {
    tables.push(`<h2>${multiclass ? t.general : (qualifying ? t.qualifying : t.results)}</h2>
      <table><thead>${headHtml({ showClass: multiclass })}</thead><tbody>${rowsHtml(drivers, { showClass: multiclass })}</tbody></table>`);
    if (multiclass) {
      const winners = session.classes.map(cls => drivers.find(d => d.cls === cls && d.classLeader)).filter(Boolean);
      if (winners.length) {
        tables.push(`<h2>${t.winners}</h2><table class="winners"><tbody>${winners.map(w => `<tr>
          <td class="cls">${esc(w.cls)}</td><td class="num">${esc(w.number)}</td><td class="name">${esc(String(w.name || '').toUpperCase())}</td>
          <td class="mono">${esc(qualifying ? dash(w.bestLap) : dash(w.totalTime))}</td></tr>`).join('')}</tbody></table>`);
      }
      session.classes.forEach(cls => {
        const list = drivers.filter(d => d.cls === cls);
        if (!list.length) return;
        tables.push(`<h2 class="class-title">${t.byClass}: ${esc(cls)}</h2>
          <table><thead>${headHtml({ classPos: true })}</thead><tbody>${rowsHtml(list, { classPos: true })}</tbody></table>`);
      });
    }
  }

  const logo = safeImage(config.logo);
  const categoryLogo = safeImage(config.categoryLogo);
  const meta = [
    config.circuito ? `<span><b>${t.circuit}:</b> ${esc(config.circuito)}</span>` : '',
    session.name ? `<span><b>${t.session}:</b> ${esc(session.name)}</span>` : '',
    `<span><b>${t.date}:</b> ${esc(dateText)}</span>`
  ].filter(Boolean).join('');

  return `<!doctype html>
<html lang="${esc(language)}"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  :root { color-scheme: light; }
  html, body { background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 10.5px; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid ${accent}; padding-bottom: 10px; margin-bottom: 12px; }
  header img { max-height: 58px; max-width: 150px; object-fit: contain; }
  .titles { flex: 1; text-align: center; padding: 0 12px; }
  .titles .champ { font-size: 11px; letter-spacing: 1px; color: #555; text-transform: uppercase; font-weight: bold; }
  .titles h1 { margin: 2px 0; font-size: 22px; text-transform: uppercase; }
  .titles .kind { font-size: 13px; font-weight: bold; color: ${accent}; letter-spacing: 2px; }
  .meta { display: flex; flex-wrap: wrap; justify-content: center; margin-bottom: 10px; color: #333; }
  .meta span { margin: 0 10px; }
  h2 { font-size: 12px; letter-spacing: 1px; margin: 16px 0 6px; padding: 5px 8px; background: #111; color: #fff; }
  h2.class-title { background: ${accent}; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th { text-align: left; font-size: 9px; letter-spacing: 0.5px; color: #555; border-bottom: 2px solid #111; padding: 5px 6px; }
  td { padding: 5px 6px; border-bottom: 1px solid #ddd; }
  tbody tr:nth-child(even) td { background: #f5f5f5; }
  .pos { width: 46px; font-weight: bold; }
  .num { width: 40px; font-weight: bold; }
  .name { font-weight: bold; }
  .center { text-align: center; }
  .mono { font-family: Consolas, 'Courier New', monospace; white-space: nowrap; }
  .strong { font-weight: bold; }
  .fastest { color: #7b2cbf; font-weight: bold; }
  .notes { color: #b03a2e; font-size: 9.5px; }
  tr.dsq td { color: #888; text-decoration: line-through; }
  tr.dsq td.notes, tr.dsq td.pos { text-decoration: none; color: #b03a2e; }
  .winners .cls { font-weight: bold; color: ${accent}; width: 160px; }
  .fastest-box { margin-top: 14px; padding: 8px 10px; border-left: 4px solid #7b2cbf; background: #f3ecfb; font-size: 11px; }
  .empty { text-align: center; color: #777; padding: 40px; }
  footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #ccc; color: #777; font-size: 8.5px; text-align: center; }
  .page { padding: 28px 30px; }
</style></head>
<body><div class="page">
  <header>
    <div style="width:150px">${logo ? `<img src="${logo}" alt="">` : ''}</div>
    <div class="titles">
      ${config.campeonato && config.campeonato !== title ? `<div class="champ">${esc(config.campeonato)}</div>` : ''}
      <h1>${esc(title)}</h1>
      <div class="kind">${qualifying ? t.qualifying : t.results}</div>
    </div>
    <div style="width:150px;text-align:right">${categoryLogo ? `<img src="${categoryLogo}" alt="">` : ''}</div>
  </header>
  <div class="meta">${meta}</div>
  ${tables.join('\n')}
  ${fastest ? `<div class="fastest-box"><b>${t.fastest}:</b> #${esc(fastest.d.number)} ${esc(String(fastest.d.name || '').toUpperCase())} — <span class="mono">${esc(fastest.d.bestLap)}</span></div>` : ''}
  <footer>${esc(fmt(t.generated, { date: dateTimeText }))}</footer>
</div></body></html>`;
}

module.exports = { buildResultsHtml };
