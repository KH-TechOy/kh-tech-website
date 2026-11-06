// Clockwise bit order: north, east, south, west.
export const N = 1, E = 2, S = 4, W = 8;
export type PipePuzzle = { width: number; height: number; masks: number[]; solved: number[]; exitSide: number };
export function rotateMask(mask: number) { return ((mask << 1) & 15) | ((mask >> 3) & 1); }
export function seededRandom(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; }; }
export function createPuzzle(rows: number, seed: number): PipePuzzle {
  const width = 3, height = Math.max(1, Math.min(3, rows)), path: number[] = [];
  for (let y = 0; y < height; y++) for (let i = 0; i < width; i++) path.push(y * width + (y % 2 ? width - 1 - i : i));
  const solved = new Array<number>(width * height).fill(0);
  const side = (a: number, b: number) => b === a - width ? N : b === a + width ? S : b === a - 1 ? W : E;
  path.forEach((index, i) => { solved[index] = (i === 0 ? W : side(index, path[i - 1])) | (i === path.length - 1 ? (height % 2 ? E : W) : side(index, path[i + 1])); });
  const random = seededRandom(seed), masks = solved.map(mask => { for (let n = Math.floor(random() * 4); n > 0; n--) mask = rotateMask(mask); return mask; });
  const puzzle = { width, height, masks, solved, exitSide: height % 2 ? E : W };
  if (isPuzzleComplete(puzzle)) puzzle.masks[0] = rotateMask(puzzle.masks[0]);
  return puzzle;
}
export function tracePuzzle(puzzle: PipePuzzle): Set<number> {
  const { width, height, masks } = puzzle, connected = new Set<number>();
  if (!(masks[0] & W)) return connected;
  const queue = [0]; connected.add(0);
  const steps = [{bit:N,back:S,dx:0,dy:-1},{bit:E,back:W,dx:1,dy:0},{bit:S,back:N,dx:0,dy:1},{bit:W,back:E,dx:-1,dy:0}];
  for(let i=0;i<queue.length;i++){const index=queue[i],x=index%width,y=Math.floor(index/width);for(const d of steps){const nx=x+d.dx,ny=y+d.dy,n=ny*width+nx;if(nx>=0&&ny>=0&&nx<width&&ny<height&&(masks[index]&d.bit)&&(masks[n]&d.back)&&!connected.has(n)){connected.add(n);queue.push(n)}}}
  return connected;
}
export function isPuzzleComplete(puzzle: PipePuzzle) {
  const connected = tracePuzzle(puzzle), end = (puzzle.height - 1) * puzzle.width + (puzzle.height % 2 ? puzzle.width - 1 : 0);
  return connected.size === puzzle.masks.length && !!(puzzle.masks[end] & puzzle.exitSide);
}
