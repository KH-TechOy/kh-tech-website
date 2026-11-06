import { type Cell, type Direction, type Level, DIRECTIONS, sameCell } from './levels';
export function isWall(level: Level, p: Cell, gateOpen: boolean) { return p.x < 0 || p.y < 0 || p.x >= level.width || p.y >= level.height || level.walls.some(w => sameCell(w,p)) || (!gateOpen && sameCell(level.gate,p)); }
export function canPush(level: Level, crate: Cell, direction: Direction, gateOpen: boolean) {
  const d=DIRECTIONS[direction],to={x:crate.x+d.x,y:crate.y+d.y};
  if(isWall(level,to,gateOpen))return false;
  if(sameCell(to,level.plate))return true;
  const blocked=(x:number,y:number)=>isWall(level,{x,y},gateOpen);
  return !((blocked(to.x-1,to.y)||blocked(to.x+1,to.y))&&(blocked(to.x,to.y-1)||blocked(to.x,to.y+1)));
}
export function walkPath(level: Level, start: Cell, target: Cell, crate: Cell, gateOpen: boolean): Cell[] | null {
  const width=level.width,size=width*level.height,walls=new Uint8Array(size),parents=new Int32Array(size).fill(-2),queue=new Int32Array(size);
  const index=(p:Cell)=>p.y*width+p.x;
  level.walls.forEach(p=>{walls[index(p)]=1});if(!gateOpen)walls[index(level.gate)]=1;walls[index(crate)]=1;
  if(start.x<0||start.y<0||target.x<0||target.y<0||start.x>=width||target.x>=width||start.y>=level.height||target.y>=level.height)return null;
  const from=index(start),to=index(target);if(walls[from]||walls[to])return null;
  queue[0]=from;parents[from]=-1;let length=1;
  for(let i=0;i<length;i++){const p=queue[i];if(p===to){const path:Cell[]=[];for(let n=p;n>=0;n=parents[n])path.push({x:n%width,y:Math.floor(n/width)});return path.reverse()}for(const delta of [-width,1,width,-1]){const n=p+delta;if(n<0||n>=size||((delta===1||delta===-1)&&Math.floor(n/width)!==Math.floor(p/width))||walls[n]||parents[n]!==-2)continue;parents[n]=p;queue[length++]=n}}
  return null;
}
export type PushStep={walk:Cell[];direction:Direction;crate:Cell};
export type Solution={solvable:boolean;plan:PushStep[];states:number;walkingTiles:number;reason?:string};
export function solveLevel(level:Level,stateLimit=4000,initialOpen=false):Solution {
  const width=level.width,size=width*level.height,index=(p:Cell)=>p.y*width+p.x,cell=(n:number)=>({x:n%width,y:Math.floor(n/width)});
  const walls=new Uint8Array(size);level.walls.forEach(p=>{if(p.x>=0&&p.y>=0&&p.x<width&&p.y<level.height)walls[index(p)]=1});
  const gate=index(level.gate),plate=index(level.plate),leak=index(level.leak),start=index(level.start),crate=index(level.crate);
  const invalid=[level.start,level.crate,level.plate,level.gate,level.leak,...(level.valves||[level.valve]),...level.tools,...(level.bonus?[level.bonus]:[])].some(p=>p.x<1||p.y<1||p.x>=width-1||p.y>=level.height-1||walls[index(p)]);
  const fail=(reason:string,states=0):Solution=>({solvable:false,plan:[],states,walkingTiles:0,reason});
  if(invalid||(crate===gate&&!initialOpen)||start===crate)return fail('invalid-object');
  const visited=new Int32Array(size),queue=new Int32Array(size);let token=0;
  const blocked=(n:number,box:number,open:boolean)=>n<0||n>=size||walls[n]===1||n===box||(!open&&n===gate);
  function flood(player:number,box:number,open:boolean){token++;queue[0]=player;visited[player]=token;let length=1,canonical=player;for(let i=0;i<length;i++){const p=queue[i];canonical=Math.min(canonical,p);for(const delta of [-width,1,width,-1]){const n=p+delta;if(n<0||n>=size||((delta===1||delta===-1)&&Math.floor(n/width)!==Math.floor(p/width))||visited[n]===token||blocked(n,box,open))continue;visited[n]=token;queue[length++]=n}}return canonical}
  flood(start,crate,initialOpen);
  if([...(level.valves||[level.valve]),...level.tools].some(p=>visited[index(p)]!==token))return fail('objective-before-gate');
  type Node={player:number;box:number;open:boolean;parent:number;direction:number};
  const nodes:Node[]=[{player:start,box:crate,open:initialOpen,parent:-1,direction:-1}],seen=new Set<number>();
  const directions:Direction[]=['up','right','down','left'],offsets=[-width,1,width,-1];
  for(let i=0;i<nodes.length&&seen.size<stateLimit;i++){
    const node=nodes[i],canonical=flood(node.player,node.box,node.open),signature=(node.box*2+Number(node.open))*size+canonical;
    if(seen.has(signature))continue;seen.add(signature);
    if(node.open&&visited[leak]===token&&(!level.bonus||visited[index(level.bonus)]===token)){
      const chain:number[]=[];for(let n=i;nodes[n].parent>=0;n=nodes[n].parent)chain.push(n);chain.reverse();
      const plan:PushStep[]=[];let actor=level.start,box=level.crate,open=initialOpen;
      for(const n of chain){const child=nodes[n],d=DIRECTIONS[directions[child.direction]],behind={x:box.x-d.x,y:box.y-d.y};const path=walkPath(level,actor,behind,box,open);if(!path)return fail('certificate-walk',seen.size);plan.push({walk:path,direction:directions[child.direction],crate:cell(child.box)});actor=box;box=cell(child.box);open=child.open}
      let walkingTiles=0;actor=level.start;box=level.crate;open=initialOpen;
      for(const target of [...(level.valves||[level.valve]),...level.tools]){const path=walkPath(level,actor,target,box,open);if(!path)return fail('sequence',seen.size);walkingTiles+=path.length-1;actor=target}
      for(const step of plan){const d=DIRECTIONS[step.direction],path=walkPath(level,actor,{x:box.x-d.x,y:box.y-d.y},box,open);if(!path)return fail('push-sequence',seen.size);walkingTiles+=path.length;actor=box;box=step.crate;open ||= sameCell(box,level.plate)}
      const finish=walkPath(level,actor,level.leak,box,open);if(!finish)return fail('finish-sequence',seen.size);walkingTiles+=finish.length-1;
      return{solvable:true,plan,states:seen.size,walkingTiles};
    }
    for(let d=0;d<4;d++){
      const offset=offsets[d],behind=node.box-offset,to=node.box+offset;
      if(behind<0||behind>=size||to<0||to>=size||visited[behind]!==token||blocked(to,-1,node.open)||((d===1||d===3)&&Math.floor(to/width)!==Math.floor(node.box/width)))continue;
      if(to!==plate){const horizontal=blocked(to-1,-1,node.open)||blocked(to+1,-1,node.open),vertical=blocked(to-width,-1,node.open)||blocked(to+width,-1,node.open);if(horizontal&&vertical)continue}
      nodes.push({player:node.box,box:to,open:node.open||to===plate,parent:i,direction:d});
    }
  }
  return fail(seen.size>=stateLimit?'state-limit':'no-push-solution',seen.size);
}
