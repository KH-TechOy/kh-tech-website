export type Point={x:number;y:number};
export type LevelMap={walls:Set<string>;parts:[Point,Point];valve:Point;leak:Point};
const key=(p:Point)=>`${p.x},${p.y}`;
export function directionFromKey(key:string){return ({arrowup:'ArrowUp',w:'ArrowUp',arrowright:'ArrowRight',d:'ArrowRight',arrowdown:'ArrowDown',s:'ArrowDown',arrowleft:'ArrowLeft',a:'ArrowLeft'} as Record<string,string>)[key.toLowerCase()]||null}
export function generateLevel(random=Math.random,size=10,obstacleCount=12):LevelMap{
  const start={x:1,y:1};
  for(let attempt=0;attempt<100;attempt++){
    const walls=new Set<string>();
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(x===0||y===0||x===size-1||y===size-1)walls.add(`${x},${y}`);
    const candidates:Array<Point>=[];
    for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(!(x===1&&y===1))candidates.push({x,y});
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
    candidates.slice(0,obstacleCount).forEach(p=>walls.add(key(p)));
    const reachable=new Set<string>([key(start)]),queue=[start];
    for(let i=0;i<queue.length;i++){const p=queue[i];for(const d of [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]){const n={x:p.x+d.x,y:p.y+d.y},k=key(n);if(n.x>0&&n.y>0&&n.x<size-1&&n.y<size-1&&!walls.has(k)&&!reachable.has(k)){reachable.add(k);queue.push(n)}}}
    const free=[...reachable].map(s=>{const [x,y]=s.split(',').map(Number);return{x,y}}).filter(p=>key(p)!==key(start));
    if(free.length<4)continue;
    const picked:Point[]=[];while(picked.length<4){const i=Math.floor(random()*free.length),p=free[i];if(!picked.some(v=>key(v)===key(p)))picked.push(p)}
    return {walls,parts:[picked[0],picked[1]],valve:picked[2],leak:picked[3]};
  }
  throw new Error('Could not generate a solvable level');
}
