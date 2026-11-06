import { TILE, type Cell, type Level } from './levels';

// Orthographic three-quarter presentation. Input and collision stay in the model plane.
export const FLOOR_DEPTH=.72;
export function project(point:Cell){return{x:point.x,y:point.y*FLOOR_DEPTH}}
export function wallRuns(level:Level){
  const fixtures=new Set(level.decor.map(d=>`${d.cell.x},${d.cell.y}`));
  const solid=new Set(level.walls.filter(c=>!fixtures.has(`${c.x},${c.y}`)).map(c=>`${c.x},${c.y}`));
  const runs:Array<{x:number;y:number;length:number;front:boolean}>=[];
  for(let y=0;y<level.height;y++){
    let x=0;
    while(x<level.width){
      if(!solid.has(`${x},${y}`)){x++;continue}
      const start=x,front=!solid.has(`${x},${y+1}`);
      while(x<level.width&&solid.has(`${x},${y}`)&&!solid.has(`${x},${y+1}`)===front)x++;
      runs.push({x:start*TILE,y:y*TILE,length:(x-start)*TILE,front});
    }
  }
  return runs;
}
