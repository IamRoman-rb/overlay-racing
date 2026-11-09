// Secciones de botones de la pestaña PANEL. El orden y cuáles se ven se eligen en PERSONALIZAR > SECCIONES DEL PANEL
// (config.panelSectionOrder = [ids] y config.panelSectionHidden = [ids]). `label` es una clave de traducción.
export const PANEL_SECTIONS = [
  { id: 'flags', label: 'panel.flagsSection' },
  { id: 'personal', label: 'panel.personalSection' },
  { id: 'category', label: 'race.categorySection' },
  { id: 'trackAlert', label: 'graphics.trackAlert' },
  { id: 'grid', label: 'panel.gridSection' },
  { id: 'startingLights', label: 'graphics.startingLights' },
  { id: 'graphics', label: 'panel.graphicsSection' },
  { id: 'branding', label: 'graphics.branding' },
  { id: 'battle', label: 'panel.battleSection' },
  { id: 'analysis', label: 'race.analysisSection' },
  { id: 'qualifying', label: 'race.qualiSection' },
  { id: 'virtualChamp', label: 'graphics.virtualChamp' },
  { id: 'lapTimes', label: 'graphics.lapTimesHistory' },
  { id: 'voting', label: 'panel.votingSection' },
  { id: 'backup', label: 'panel.backupSection' },
  { id: 'closing', label: 'panel.closingSection' }
];

const IDS = PANEL_SECTIONS.map(s => s.id);

// Orden guardado (sin ids viejos) y, al final, las secciones que no figuran (por ejemplo, una sección nueva del programa)
export function getSectionOrder(config) {
  const saved = Array.isArray(config?.panelSectionOrder) ? config.panelSectionOrder.filter(id => IDS.includes(id)) : [];
  const unique = saved.filter((id, i) => saved.indexOf(id) === i);
  IDS.forEach(id => { if (!unique.includes(id)) unique.push(id); });
  return unique;
}

export function isSectionHidden(config, id) {
  return Array.isArray(config?.panelSectionHidden) && config.panelSectionHidden.includes(id);
}

// Estilo que ubica una sección: `order` dentro del contenedor flex del PANEL y oculta las que se sacaron
export function sectionPlacement(config, id) {
  const order = getSectionOrder(config).indexOf(id);
  return isSectionHidden(config, id) ? { order, display: 'none' } : { order };
}
