import { LEVELS, THEME_NAMES, TILE, type Cell, type Level, type Theme, type GenerationInfo, sameCell } from './levels';
import { seededRandom, createPuzzle, isPuzzleComplete } from './puzzle';
import { solveLevel, type Solution } from './solver';

export const GENERATOR_VERSION=22, MAX_GENERATION_ATTEMPTS=18;
type Rect={x:number;y:number;width:number;height:number};
const themes:Theme[]=['kitchen','bathroom','basement','utility','office','technical'];
const titles:Record<Theme,string>={kitchen:'Keittiön vesivuoto',bathroom:'Kylpyhuoneen yllätys',basement:'Kellarin putkipulma',utility:'Kodinhoitohuoneen vuoto',office:'Toimiston vesivahinko',technical:'Teknisen tilan pelastus'};
export const mixSeed=(seed:number,index:number)=>{let n=(seed+Math.imul(index+1,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x85ebca6b);n=Math.imul(n^(n>>>13),0xc2b2ae35);return(n^(n>>>16))>>>0};
const distance=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function hashLayout(width:number,height:number,walls:Cell[]){let hash=2166136261;const data=`${width}x${height}:${walls.map(p=>p.y*width+p.x).sort((a,b)=>a-b).join(',')}`;for(let i=0;i<data.length;i++)hash=Math.imul(hash^data.charCodeAt(i),16777619);return(hash>>>0).toString(16).padStart(8,'0')}
export function replayCode(seed:number,difficulty:number){return `KHT-${(seed>>>0).toString(16).padStart(8,'0').toUpperCase()}-D${difficulty}`}
export function parseReplayCode(value:string):{seed:number;difficulty:number}|null{const match=/^KHT-([0-9A-F]{1,8})-D(\d{1,2})$/i.exec(value.trim());if(!match)return null;const difficulty=Number(match[2]);return difficulty>=1&&difficulty<=12?{seed:parseInt(match[1],16)>>>0,difficulty}:null}
export function fairTime(solution:Solution,rows:number,columns:number,difficulty:number,valves:number){const expectedSeconds=solution.walkingTiles*TILE/180+solution.plan.length*.7+rows*columns*1.35+valves*1.4;return{expectedSeconds,time:Math.max(90,Math.ceil(expectedSeconds*2.15+24+Math.max(0,4-difficulty)*5))}}

function candidate(seed:number,difficulty:number,attempt:number):Level|null{
  const random=seededRandom(mixSeed(seed,attempt)),integer=(min:number,max:number)=>min+Math.floor(random()*(max-min+1)),pick=<T,>(values:T[])=>values[Math.floor(random()*values.length)];
  const width=difficulty<3?15:pick([15,17,19]),height=difficulty<3?11:pick([11,13]),size=width*height,walls=new Uint8Array(size);
  const idx=(p:Cell)=>p.y*width+p.x,cell=(n:number)=>({x:n%width,y:Math.floor(n/width)}),inside=(p:Cell)=>p.x>0&&p.y>0&&p.x<width-1&&p.y<height-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x===0||y===0||x===width-1||y===height-1)walls[y*width+x]=1;
  const horizontal=random()<.5,firstSide=random()<.5,cut=horizontal?integer(4,height-5):integer(5,width-6);
  const gate:Cell=horizontal?{x:integer(2,width-3),y:cut}:{x:cut,y:integer(2,height-3)};
  if(horizontal){for(let x=1;x<width-1;x++)walls[cut*width+x]=1}else for(let y=1;y<height-1;y++)walls[y*width+cut]=1;
  walls[idx(gate)]=0;
  const a:Rect=horizontal?{x:1,y:1,width:width-2,height:cut-1}:{x:1,y:1,width:cut-1,height:height-2};
  const b:Rect=horizontal?{x:1,y:cut+1,width:width-2,height:height-cut-2}:{x:cut+1,y:1,width:width-cut-2,height:height-2};
  const main=firstSide?a:b,back=firstSide?b:a;
  const contains=(r:Rect,p:Cell)=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
  const rooms:Rect[]=[];
  function divide(r:Rect,depth:number){
    const vertical=r.width>=8&&(r.height<7||random()<.55);
    if(depth<=0||(!vertical&&r.height<7)){rooms.push(r);return}
    if(vertical){const x=integer(r.x+3,r.x+r.width-4),door=integer(r.y,r.y+r.height-1);for(let y=r.y;y<r.y+r.height;y++)if(y!==door&&!(difficulty<=2&&y===door+1))walls[y*width+x]=1;divide({...r,width:x-r.x},depth-1);divide({...r,x:x+1,width:r.x+r.width-x-1},depth-1)}
    else{const y=integer(r.y+3,r.y+r.height-4),door=integer(r.x,r.x+r.width-1);for(let x=r.x;x<r.x+r.width;x++)if(x!==door&&!(difficulty<=2&&x===door+1))walls[y*width+x]=1;divide({...r,height:y-r.y},depth-1);divide({...r,y:y+1,height:r.y+r.height-y-1},depth-1)}
  }
  divide(main,1+Number(difficulty>=4)+Number(difficulty>=9));divide(back,1+Number(difficulty>=6));
  // Keep the only inter-room gate and its immediate approach clear.
  for(const d of [-1,1]){const p=horizontal?{x:gate.x,y:gate.y+d}:{x:gate.x+d,y:gate.y};if(inside(p))walls[idx(p)]=0}
  const marks=new Int32Array(size),queue=new Int32Array(size);let mark=0;
  function flood(start:number,box=-1,closed=false){mark++;queue[0]=start;marks[start]=mark;let length=1;for(let i=0;i<length;i++){const p=queue[i];for(const d of [-width,1,width,-1]){const n=p+d;if(n<0||n>=size||((d===1||d===-1)&&Math.floor(n/width)!==Math.floor(p/width))||walls[n]||n===box||(closed&&n===idx(gate))||marks[n]===mark)continue;marks[n]=mark;queue[length++]=n}}return Array.from(queue.subarray(0,length))}
  const first=walls.findIndex((v,i)=>!v&&i!==idx(gate));if(first<0)return null;
  if(flood(first).length!==walls.filter(v=>!v).length)return null;
  const theme=pick(themes),palette:Record<Theme,string[]>={kitchen:['counter','shelf','plant'],bathroom:['basin','toilet','plant'],basement:['boiler','shelf','plant'],utility:['washer','counter','shelf'],office:['desk','plant','shelf'],technical:['boiler','shelf','washer']};
  const decor:Level['decor']=[];
  const furnitureCandidates=Array.from({length:size},(_,n)=>n).filter(n=>{const p=cell(n);return !walls[n]&&distance(p,gate)>2&&[-width,1,width,-1].some(d=>walls[n+d])});
  for(let i=furnitureCandidates.length-1;i>0;i--){const j=integer(0,i);[furnitureCandidates[i],furnitureCandidates[j]]=[furnitureCandidates[j],furnitureCandidates[i]]}
  for(const n of furnitureCandidates){if(decor.length>=4+Math.floor(difficulty/2))break;walls[n]=1;const from=walls.findIndex(v=>!v);if(flood(from).length!==walls.filter(v=>!v).length){walls[n]=0;continue}decor.push({cell:cell(n),asset:pick(palette[theme])})}
  const mainCells=Array.from({length:size},(_,n)=>cell(n)).filter(p=>!walls[idx(p)]&&contains(main,p)&&distance(p,gate)>1);
  const backCells=Array.from({length:size},(_,n)=>cell(n)).filter(p=>!walls[idx(p)]&&contains(back,p)&&distance(p,gate)>1);
  if(mainCells.length<18||backCells.length<10)return null;
  let crate:Cell|undefined,plate:Cell|undefined,actor:Cell|undefined;
  for(let trial=0;trial<12&&!crate;trial++){
    const goal=pick(mainCells);let box=idx(goal),player=-1;const adjacent=[-width,1,width,-1].map(d=>box+d).filter(n=>n>=0&&n<size&&!walls[n]&&n!==idx(gate)&&contains(main,cell(n)));if(!adjacent.length)continue;player=pick(adjacent);
    const seen=new Set<number>([box]);let pulls=0,lastOffset=0;
    for(let pull=0;pull<3+Math.min(8,difficulty);pull++){
      flood(player,box,true);const options:number[]=[];
      for(const d of [-width,1,width,-1]){const stand=box-d,retreat=box-2*d;if(stand<0||retreat<0||stand>=size||retreat>=size||walls[stand]||walls[retreat]||marks[stand]!==mark||stand===idx(gate)||retreat===idx(gate)||!contains(main,cell(stand))||!contains(main,cell(retreat))||seen.has(stand))continue;if((d===1||d===-1)&&(Math.floor(box/width)!==Math.floor(stand/width)||Math.floor(box/width)!==Math.floor(retreat/width)))continue;options.push(d)}
      if(!options.length)break;const turns=options.filter(d=>d!==lastOffset),d=pick(difficulty>=5&&turns.length&&random()<.7?turns:options);player=box-2*d;box-=d;seen.add(box);pulls++;lastOffset=d;
    }
    if(pulls<2||box===idx(goal))continue;
    crate=cell(box);plate=goal;actor=cell(player);
  }
  if(!crate||!plate||!actor)return null;
  const reachable=flood(idx(actor),idx(crate),true).map(cell).filter(p=>contains(main,p));
  const used=[crate,plate,gate],choose=(values:Cell[],farFrom?:Cell)=>{let choices=values.filter(p=>!used.some(u=>sameCell(u,p)));if(!choices.length)return null;if(farFrom){choices=choices.sort((p,q)=>distance(q,farFrom)-distance(p,farFrom));choices=choices.slice(0,Math.max(3,Math.ceil(choices.length*.4)))}const chosen=pick(choices);used.push(chosen);return chosen};
  const start=choose(reachable,crate);if(!start)return null;
  const valve=choose(reachable,start);if(!valve)return null;const valves=[valve];
  if(difficulty>=6&&random()<.6){const other=choose(reachable,valve);if(other)valves.push(other)}
  const tools:Cell[]=[];for(let i=0;i<(difficulty>=5?3:2);i++){const tool=choose(reachable,i%2?valve:start);if(!tool)return null;tools.push(tool)}
  const leak=choose(backCells,gate);if(!leak)return null;
  const bonus=difficulty>=3&&random()<.4?choose(backCells,leak)||undefined:undefined;
  return{id:1,title:titles[theme],location:`Työkohde · ${THEME_NAMES[theme]}`,tip:'Sulje vesi, kerää välineet ja avaa reitti vuodon luo.',time:120,puzzleRows:difficulty<3?1:difficulty<6?2:3,puzzleColumns:difficulty>=10?4:3,theme,width,height,walls:Array.from({length:size},(_,n)=>n).filter(n=>walls[n]).map(cell),start,valve,valves,tools,leak,crate,plate,gate,decor,seed:seed>>>0,difficulty,bonus};
}

export function fallbackLevel(seed:number,difficulty:number):Level {
  const source=LEVELS[(seed>>>0)%LEVELS.length],flipX=!!(seed&1),flipY=!!(seed&2),transpose=!!(seed&4),point=(p:Cell)=>{const q={x:flipX?source.width-1-p.x:p.x,y:flipY?source.height-1-p.y:p.y};return transpose?{x:q.y,y:q.x}:q};
  const theme=themes[(seed>>>3)%themes.length];
  return{...source,id:1,tutorial:false,seed:seed>>>0,difficulty,theme,title:titles[theme],location:`Työkohde · ${THEME_NAMES[theme]}`,width:transpose?source.height:source.width,height:transpose?source.width:source.height,walls:source.walls.map(point),decor:source.decor.map(d=>({...d,cell:point(d.cell)})),start:point(source.start),valve:point(source.valve),valves:[point(source.valve)],tools:source.tools.map(point),leak:point(source.leak),crate:point(source.crate),plate:point(source.plate),gate:point(source.gate),puzzleRows:difficulty<3?1:difficulty<6?2:3,puzzleColumns:difficulty>=10?4:3};
}
function finish(level:Level,solution:Solution,startTime:number,attempts:number,fallback:boolean){
  const budget=fairTime(solution,level.puzzleRows,level.puzzleColumns||3,level.difficulty||1,(level.valves||[level.valve]).length);
  const generation:GenerationInfo={version:22,attempts,fallback,milliseconds:performance.now()-startTime,states:solution.states,pushes:solution.plan.length,walkingTiles:solution.walkingTiles,expectedSeconds:budget.expectedSeconds,layoutHash:hashLayout(level.width,level.height,level.walls)};
  return{...level,time:budget.time,generation};
}
export function generateLevel(seed:number,difficulty=1,maxAttempts=MAX_GENERATION_ATTEMPTS):Level {
  const startTime=performance.now();seed>>>=0;difficulty=Math.max(1,Math.min(12,Math.floor(difficulty)||1));
  for(let attempt=0;attempt<Math.min(MAX_GENERATION_ATTEMPTS,Math.max(0,maxAttempts));attempt++){
    const level=candidate(seed,difficulty,attempt);if(!level)continue;
    const solution=solveLevel(level,1800);if(!solution.solvable||solution.plan.length<Math.min(4,1+Math.floor(difficulty/4)))continue;
    const puzzle=createPuzzle(level.puzzleRows,mixSeed(seed,23),level.puzzleColumns);puzzle.masks=[...puzzle.solved];if(!isPuzzleComplete(puzzle))continue;
    return finish(level,solution,startTime,attempt+1,false);
  }
  const level=fallbackLevel(seed,difficulty),solution=solveLevel(level);if(!solution.solvable)throw new Error('Validated fallback unavailable');return finish(level,solution,startTime,Math.max(0,maxAttempts),true);
}
