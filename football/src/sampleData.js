// Datos de ejemplo (equipos inventados) para probar las gráficas sin cargar nada a mano
import { uid, emptyPlayer, autoLineup } from './state';

const NORTE = [
  ['1', 'Matías Ledesma', 'POR'], ['2', 'Bruno Carrizo', 'DEF'], ['3', 'Tomás Bianchi', 'DEF'], ['4', 'Lucas Ferrero', 'DEF'],
  ['6', 'Iván Sotelo', 'DEF'], ['5', 'Agustín Peralta', 'MED'], ['8', 'Federico Roldán', 'MED'], ['10', 'Joaquín Almada', 'MED'],
  ['7', 'Nicolás Vera', 'MED'], ['9', 'Gonzalo Echeverría', 'DEL'], ['11', 'Santiago Quiroga', 'DEL'], ['12', 'Hugo Barrios', 'POR'],
  ['13', 'Emanuel Giménez', 'DEF'], ['14', 'Darío Salvatierra', 'MED'], ['16', 'Rodrigo Palacios', 'MED'], ['17', 'Axel Montenegro', 'DEL'],
  ['19', 'Julián Cabrera', 'DEL'], ['21', 'Mauro Insúa', 'DEF']
];
const SUR = [
  ['1', 'Pablo Dessanti', 'POR'], ['2', 'Cristian Lamas', 'DEF'], ['4', 'Walter Oyarzún', 'DEF'], ['3', 'Esteban Torrilla', 'DEF'],
  ['5', 'Mariano Quinteros', 'DEF'], ['6', 'Leandro Fabbri', 'MED'], ['8', 'Ramiro Altamirano', 'MED'], ['20', 'Gastón Arévalo', 'MED'],
  ['10', 'Ezequiel Mansilla', 'MED'], ['9', 'Franco Bustamante', 'DEL'], ['7', 'Sebastián Olmos', 'DEL'], ['22', 'Ignacio Pereyra', 'POR'],
  ['15', 'Ulises Cardozo', 'DEF'], ['18', 'Valentín Ojeda', 'MED'], ['14', 'Cristóbal Ibarra', 'MED'], ['11', 'Thiago Maidana', 'DEL'],
  ['23', 'Lautaro Heredia', 'DEL'], ['13', 'Bautista Riveros', 'DEF']
];

function makeTeam(name, short, color1, color2, stadium, coach, staff, roster) {
  const players = roster.map(([number, full, pos]) => ({ ...emptyPlayer(), number, name: full, pos }));
  players.find(p => p.number === '10').captain = true;
  return {
    id: uid(), name, short, color1, color2, logo: null, stadium,
    coach: { name: coach, photo: null },
    staff: staff.map(([role, person]) => ({ id: uid(), role, name: person })),
    players
  };
}

// Devuelve { teams, matchPatch } con dos equipos de ejemplo y un partido armado entre ellos
export function sampleData() {
  const home = makeTeam('Club Atlético Norte', 'NOR', '#c8102e', '#ffffff', 'Estadio Monumental del Norte', 'Ricardo Salinas',
    [['Ayudante de campo', 'Hernán Duarte'], ['Preparador físico', 'Marcos Aguirre'], ['Entrenador de arqueros', 'Pablo Sandoval']], NORTE);
  const away = makeTeam('Deportivo Sur', 'SUR', '#0b5ed7', '#f6c000', 'Estadio Ciudad del Sur', 'Alejandro Corvalán',
    [['Ayudante de campo', 'Diego Maldonado'], ['Preparador físico', 'Leonel Paz'], ['Entrenador de arqueros', 'Sergio Cabral']], SUR);
  const homeLineup = autoLineup(home, '4-4-2');
  const awayLineup = autoLineup(away, '4-3-3');
  return {
    teams: [home, away],
    matchPatch: {
      competition: 'Torneo de Ejemplo', round: 'Fecha 12', stadium: home.stadium, date: '2026-11-08', time: '21:00', referee: 'Fernando Olivera',
      homeId: home.id, awayId: away.id,
      home: { formation: '4-4-2', ...homeLineup },
      away: { formation: '4-3-3', ...awayLineup }
    }
  };
}
