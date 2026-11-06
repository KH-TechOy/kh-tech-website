export const N=1,E=2,S=4,W=8;
export type PipePort={index:number;side:number};
export type PipePuzzle={width:number;height:number;masks:number[];solved:number[];exitSide:number;entry:PipePort;exit:PipePort};
export function rotateMask(mask:number){return((mask<<1)&15)|((mask>>3)&1)}
export function seededRandom(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000}}
export function createPuzzle(rows:number,seed:number,columns=3):PipePuzzle{
  const width=Math.max(3,Math.min(4,columns)),height=Math.max(1,Math.min(3,rows)),size=width*height,random=seededRandom(seed);
  const outside=(index:number)=>[...(index<width?[N]:[]),...(index%width===width-1?[E]:[]),...(index>=size-width?[S]:[]),...(index%width===0?[W]:[])];
  const neighbors=(index:number)=>[...(index>=width?[index-width]:[]),...(index%width<width-1?[index+1]:[]),...(index<size-width?[index+width]:[]),...(index%width>0?[index-1]:[])];
  let path:number[]=[];
  const boundary=Array.from({length:size},(_,index)=>index).filter(index=>outside(index).length);
  for(let attempt=0;attempt<8&&!path.length;attempt++){
    const visited=new Uint8Array(size),candidate:number[]=[],start=boundary[Math.floor(random()*boundary.length)];let calls=0;
    function search(index:number):boolean{
      if(++calls>12000)return false;candidate.push(index);visited[index]=1;
      if(candidate.length===size){if(outside(index).length)return true;visited[index]=0;candidate.pop();return false}
      const options=neighbors(index).filter(n=>!visited[n]).map(n=>({n,score:neighbors(n).filter(m=>!visited[m]).length+random()*.8})).sort((a,b)=>a.score-b.score);
      for(const option of options)if(search(option.n))return true;
      visited[index]=0;candidate.pop();return false;
    }
    if(search(start))path=[...candidate];
  }
  if(!path.length)for(let y=0;y<height;y++)for(let x=0;x<width;x++)path.push(y*width+(y%2?width-1-x:x));
  const entry={index:path[0],side:0},exit={index:path[size-1],side:0};
  const incoming=outside(entry.index),outgoing=outside(exit.index);entry.side=incoming[Math.floor(random()*incoming.length)];exit.side=outgoing[Math.floor(random()*outgoing.length)];
  const side=(a:number,b:number)=>b===a-width?N:b===a+width?S:b===a-1?W:E,solved=new Array<number>(size).fill(0);
  path.forEach((index,i)=>{solved[index]=(i===0?entry.side:side(index,path[i-1]))|(i===size-1?exit.side:side(index,path[i+1]))});
  const masks=solved.map(value=>{for(let i=Math.floor(random()*4);i>0;i--)value=rotateMask(value);return value});
  const puzzle={width,height,masks,solved,entry,exit,exitSide:exit.side};if(isPuzzleComplete(puzzle))puzzle.masks[entry.index]=rotateMask(puzzle.masks[entry.index]);return puzzle;
}
export function createTutorialPuzzle():PipePuzzle{return{width:3,height:1,masks:[N|S,N|S,N|S],solved:[E|W,E|W,E|W],entry:{index:0,side:W},exit:{index:2,side:E},exitSide:E}}
export function tracePuzzle(puzzle:PipePuzzle):Set<number>{
  const {width,height,masks,entry}=puzzle,connected=new Set<number>();if(!(masks[entry.index]&entry.side))return connected;
  const queue=[entry.index];connected.add(entry.index);
  const steps=[{bit:N,back:S,dx:0,dy:-1},{bit:E,back:W,dx:1,dy:0},{bit:S,back:N,dx:0,dy:1},{bit:W,back:E,dx:-1,dy:0}];
  for(let i=0;i<queue.length;i++){const index=queue[i],x=index%width,y=Math.floor(index/width);for(const d of steps){const nx=x+d.dx,ny=y+d.dy,n=ny*width+nx;if(nx>=0&&ny>=0&&nx<width&&ny<height&&(masks[index]&d.bit)&&(masks[n]&d.back)&&!connected.has(n)){connected.add(n);queue.push(n)}}}
  return connected;
}
export function isPuzzleComplete(puzzle:PipePuzzle){return tracePuzzle(puzzle).size===puzzle.masks.length&&!!(puzzle.masks[puzzle.exit.index]&puzzle.exit.side)}
