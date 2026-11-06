import { describe, expect, it } from 'vitest';
import { TUTORIAL_LEVEL, TILE } from './levels';
import { project, wallRuns } from './projection';

describe('presentation preserves the navigation plane',()=>{
  it('keeps each wall footprint represented once while fixtures and door openings remain separate',()=>{
    const level={...TUTORIAL_LEVEL,width:7,height:5,walls:[{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:1,y:2},{x:3,y:2},{x:5,y:1}],decor:[{asset:'shelf' as const,cell:{x:5,y:1}}]};
    const runs=wallRuns(level),covered=runs.flatMap(run=>Array.from({length:run.length/TILE},(_,i)=>`${run.x/TILE+i},${run.y/TILE}`));
    expect(covered.sort()).toEqual(['1,1','1,2','2,1','3,1','3,2']);
    expect(new Set(covered).size).toBe(covered.length);
    expect(runs.filter(r=>r.y===TILE&&r.front)).toEqual([{x:2*TILE,y:TILE,length:TILE,front:true}]);
  });
  it('projects a logical tile footprint without modifying player coordinates or height units',()=>{
    const point={x:200,y:360};const projected=project(point);
    expect(point).toEqual({x:200,y:360});expect(projected).toEqual({x:200,y:259.2});
    expect(project({x:point.x+TILE,y:point.y+TILE})).toEqual({x:280,y:316.8});
  });
});
