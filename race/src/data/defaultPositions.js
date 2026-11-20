// Posiciones iniciales de cada gráfica en el lienzo (1920x1080).
// Debe quedar idéntico al defaultPositions de race/main.cjs (ahí vive la copia que se usa para sembrar
// posiciones.json en el primer arranque; main.cjs no puede importar este archivo porque el paquete del
// módulo sólo lleva main.cjs y dist). La prueba race/test/defaultPositions.test.mjs verifica que coincidan.
export const defaultPositions = {
  relator: { x: 380, y: 935, scale: 1 }, comentarista: { x: 380, y: 860, scale: 1 }, notero1: { x: 380, y: 785, scale: 1 },
  notero2: { x: 380, y: 710, scale: 1 }, circuito: { x: 380, y: 635, scale: 1 }, clima: { x: 380, y: 520, scale: 1 },
  ticker: { x: 0, y: 1020, scale: 1 }, grid: { x: 320, y: 180, scale: 1 }, finalResults: { x: 395, y: 190, scale: 1 },
  tower: { x: 20, y: 20, scale: 1 }, winner: { x: 680, y: 800, scale: 1 }, flags: { x: 640, y: 30, scale: 1 },
  fastestLap: { x: 1440, y: 110, scale: 1 }, battle: { x: 730, y: 140, scale: 1 }, customZocalo: { x: 380, y: 420, scale: 1 },
  votingQR: { x: 20, y: 745, scale: 1 }, votingResults: { x: 1440, y: 655, scale: 1 }, lapCounter: { x: 1740, y: 20, scale: 1 },
  virtualChamp: { x: 1440, y: 235, scale: 1 }, pitStop: { x: 850, y: 900, scale: 1 },
  startingLights: { x: 775, y: 470, scale: 1 }, lapTimesHistory: { x: 950, y: 350, scale: 1 },
  trackAlert: { x: 950, y: 610, scale: 1 }, penaltyAlert: { x: 950, y: 500, scale: 1 },
  driverInfo: { x: 380, y: 335, scale: 1 },
  branding: { x: 1640, y: 900, scale: 1 },
  evento: { x: 560, y: 20, scale: 1 },
  sectors: { x: 1440, y: 360, scale: 1 }, gapChart: { x: 730, y: 640, scale: 1 },
  gainers: { x: 1440, y: 470, scale: 1 }, qualifying: { x: 20, y: 20, scale: 1 },
  trackMap: { x: 1460, y: 610, scale: 1 }, raceNotice: { x: 760, y: 820, scale: 1 },
  circuitIntro: { x: 470, y: 230, scale: 1 }, circuitRecord: { x: 1500, y: 700, scale: 1 },
  lapCompare: { x: 640, y: 880, scale: 1 }, windVectors: { x: 0, y: 0, scale: 1 }, sponsorLive: { x: 1560, y: 40, scale: 1 },
  formationLap: { x: 660, y: 60, scale: 1 }, sessionStatus: { x: 560, y: 20, scale: 1 },
  lapProgress: { x: 1600, y: 20, scale: 1 },
  trackConditions: { x: 1400, y: 560, scale: 1 }, weatherRadar: { x: 1360, y: 300, scale: 1 }
};
