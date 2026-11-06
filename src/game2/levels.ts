export const TILE = 80;
export type Cell = { x: number; y: number };
export type Direction = 'up' | 'right' | 'down' | 'left';
export const DIRECTIONS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 },
};
export const cellKey = (p: Cell) => `${p.x},${p.y}`;
export const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const center = (p: Cell) => ({ x: (p.x + .5) * TILE, y: (p.y + .5) * TILE });

export type Level = {
  id: number; title: string; location: string; tip: string; time: number; puzzleRows: number;
  theme: 'kitchen' | 'basement' | 'office'; width: number; height: number; walls: Cell[];
  start: Cell; valve: Cell; leak: Cell; tools: [Cell, Cell]; crate: Cell; plate: Cell; gate: Cell;
  decor: {cell:Cell;asset:string}[];
};
type Layout = Pick<Level, 'start' | 'valve' | 'leak' | 'tools' | 'crate' | 'plate' | 'gate'> & { extra: Cell[] };
const vertical = (x: number, ys: number[]) => ys.map(y => ({ x, y }));
function makeLevel(id: number, title: string, location: string, theme: Level['theme'], time: number, puzzleRows: number, layout: Layout): Level {
  const width = 15, height = 11, walls: Cell[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1 || (y === 6 && x !== layout.gate.x)) walls.push({ x, y });
  }
  const reserved=[layout.start,layout.valve,layout.leak,...layout.tools,layout.crate,layout.plate,layout.gate];
  const candidates=[{cell:{x:1,y:1},asset:'plant'},{cell:{x:3,y:1},asset:'counter'},{cell:{x:12,y:1},asset:theme==='basement'?'boiler':'counter'},{cell:{x:1,y:4},asset:'shelf'},{cell:{x:13,y:4},asset:'plant'},{cell:{x:1,y:7},asset:'plant'},{cell:{x:13,y:7},asset:theme==='basement'?'boiler':'shelf'},{cell:{x:1,y:9},asset:'shelf'},{cell:{x:13,y:9},asset:'plant'}];
  const decor=candidates.filter(({cell})=>!reserved.some(p=>sameCell(p,cell))&&!layout.extra.some(p=>sameCell(p,cell)));
  return { id, title, location, theme, time, puzzleRows, width, height, walls: [...walls, ...layout.extra, ...decor.map(d=>d.cell)],decor,
    start: layout.start, valve: layout.valve, leak: layout.leak, tools: layout.tools, crate: layout.crate, plate: layout.plate, gate: layout.gate,
    tip: id === 1 ? 'Sulje punainen venttiili. Työnnä laatikko hehkuvalle kytkimelle ja hae osat oven takaa.' : 'Kytkin avaa huolto-oven. Hae työkalupakki ja tiiviste, sitten yhdistä putket vuotokohdassa.',
  };
}
export const LEVELS: Level[] = [
  makeLevel(1, 'Keittiön vesivahinko', 'Koti · Lohja', 'kitchen', 90, 1, {
    start: {x:2,y:2}, valve:{x:10,y:2}, crate:{x:4,y:4}, plate:{x:6,y:4}, gate:{x:8,y:6},
    tools:[{x:3,y:8},{x:10,y:8}], leak:{x:12,y:8}, extra:[],
  }),
  makeLevel(2, 'Kellarin painekoe', 'Taloyhtiö · Kellari', 'basement', 85, 2, {
    start:{x:2,y:2}, valve:{x:12,y:2}, crate:{x:10,y:3}, plate:{x:7,y:3}, gate:{x:3,y:6},
    tools:[{x:3,y:8},{x:11,y:8}], leak:{x:12,y:9}, extra:[...vertical(6,[1,2]), ...vertical(6,[7,8])],
  }),
  makeLevel(3, 'Toimiston yllätys', 'Toimisto · Uusimaa', 'office', 80, 2, {
    start:{x:2,y:2}, valve:{x:12,y:4}, crate:{x:5,y:4}, plate:{x:5,y:2}, gate:{x:11,y:6},
    tools:[{x:2,y:8},{x:9,y:9}], leak:{x:12,y:8}, extra:[...vertical(8,[1,2,4]), ...vertical(7,[7,8])],
  }),
  makeLevel(4, 'Pesutuvan pulma', 'Taloyhtiö · Pesutupa', 'kitchen', 78, 3, {
    start:{x:2,y:3}, valve:{x:3,y:1}, crate:{x:11,y:3}, plate:{x:11,y:5}, gate:{x:7,y:6},
    tools:[{x:3,y:9},{x:9,y:8}], leak:{x:12,y:9}, extra:[...vertical(6,[2,3,4]), ...vertical(4,[7,8])],
  }),
  makeLevel(5, 'Huoltokäytävä', 'Kiinteistö · Huoltotila', 'office', 75, 3, {
    start:{x:2,y:4}, valve:{x:11,y:4}, crate:{x:4,y:2}, plate:{x:7,y:2}, gate:{x:5,y:6},
    tools:[{x:3,y:8},{x:12,y:8}], leak:{x:11,y:9}, extra:[...vertical(9,[2,3,4]), ...vertical(8,[7,8])],
  }),
  makeLevel(6, 'Teknisen tilan pelastus', 'Kiinteistö · Tekninen tila', 'basement', 70, 3, {
    start:{x:2,y:2}, valve:{x:12,y:2}, crate:{x:11,y:4}, plate:{x:8,y:4}, gate:{x:9,y:6},
    tools:[{x:2,y:9},{x:7,y:8}], leak:{x:12,y:9}, extra:[...vertical(5,[1,2,4]), ...vertical(5,[7,8]), {x:10,y:8}],
  }),
];
