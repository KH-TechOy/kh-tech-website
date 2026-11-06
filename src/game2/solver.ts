import { type Cell, type Direction, type Level, DIRECTIONS, cellKey, sameCell } from './levels';
export function isWall(level: Level, p: Cell, gateOpen: boolean) { return p.x < 0 || p.y < 0 || p.x >= level.width || p.y >= level.height || level.walls.some(w => sameCell(w,p)) || (!gateOpen && sameCell(level.gate,p)); }
export function canPush(level: Level, crate: Cell, direction: Direction, gateOpen: boolean) {
  const d=DIRECTIONS[direction],to={x:crate.x+d.x,y:crate.y+d.y};
  if(isWall(level,to,gateOpen))return false;
  if(sameCell(to,level.plate))return true;
  const blocked=(x:number,y:number)=>isWall(level,{x,y},gateOpen);
  // Do not allow a non-goal box to be pushed into a static corner.
  return !((blocked(to.x-1,to.y)||blocked(to.x+1,to.y))&&(blocked(to.x,to.y-1)||blocked(to.x,to.y+1)));
}
export function walkPath(level: Level, start: Cell, target: Cell, crate: Cell, gateOpen: boolean): Cell[] | null {
  const queue=[start],parent=new Map<string,Cell|null>([[cellKey(start),null]]);
  for(let i=0;i<queue.length;i++){const p=queue[i];if(sameCell(p,target)){const path:Cell[]=[];let current:Cell|null=p;while(current){path.push(current);current=parent.get(cellKey(current))||null}return path.reverse()}for(const d of Object.values(DIRECTIONS)){const n={x:p.x+d.x,y:p.y+d.y};if(!parent.has(cellKey(n))&&!isWall(level,n,gateOpen)&&!sameCell(n,crate)){parent.set(cellKey(n),p);queue.push(n)}}}
  return null;
}
export type PushStep={walk:Cell[];direction:Direction;crate:Cell};
export function solveLevel(level: Level): {solvable:boolean;plan:PushStep[];states:number} {
  type Node={player:Cell;crate:Cell;open:boolean;plan:PushStep[]};
  const queue:Node[]=[{player:level.start,crate:level.crate,open:false,plan:[]}],seen=new Set<string>();
  for(let i=0;i<queue.length&&i<4000;i++){
    const state=queue[i];
    const reachable:Cell[]=[];
    const q=[state.player],visited=new Set([cellKey(state.player)]);
    for(let j=0;j<q.length;j++){const p=q[j];reachable.push(p);for(const d of Object.values(DIRECTIONS)){const n={x:p.x+d.x,y:p.y+d.y},k=cellKey(n);if(!visited.has(k)&&!isWall(level,n,state.open)&&!sameCell(n,state.crate)){visited.add(k);q.push(n)}}}
    const region=[...visited].sort()[0],signature=`${cellKey(state.crate)}|${state.open}|${region}`;
    if(seen.has(signature))continue;seen.add(signature);
    if(state.open&&[level.valve,...level.tools,level.leak].every(p=>visited.has(cellKey(p))))return {solvable:true,plan:state.plan,states:seen.size};
    for(const [direction,d] of Object.entries(DIRECTIONS) as [Direction,Cell][]){
      const behind={x:state.crate.x-d.x,y:state.crate.y-d.y};
      if(!visited.has(cellKey(behind))||!canPush(level,state.crate,direction,state.open))continue;
      const to={x:state.crate.x+d.x,y:state.crate.y+d.y};
      const path=walkPath(level,state.player,behind,state.crate,state.open);
      if(path)queue.push({player:state.crate,crate:to,open:state.open||sameCell(to,level.plate),plan:[...state.plan,{walk:path,direction,crate:to}]});
    }
  }
  return {solvable:false,plan:[],states:seen.size};
}
