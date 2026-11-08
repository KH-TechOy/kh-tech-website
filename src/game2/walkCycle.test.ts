import { describe, expect, it } from 'vitest';
import { WalkCycle } from './walkCycle';

describe('walking follows real travel rather than wall-clock time',()=>{
  it('visits all six side poses in order and completes the same gait at different frame rates',()=>{
    const a=new WalkCycle({x:0,y:0}),b=new WalkCycle({x:0,y:0});
    const frames=new Set<string>();let fa='',fb='';
    for(let x=2;x<=144;x+=2){fa=a.sample({x,y:0},'right',true,true,false);frames.add(fa)}
    for(let x=8;x<=144;x+=8)fb=b.sample({x,y:0},'right',true,true,false);
    expect([...frames]).toEqual(['right-walk-0','right-walk-1','right-walk-2','right-walk-3','right-walk-4','right-walk-5']);
    expect(fa).toBe(fb);
  });
  it('stops at a wall, freezes on pause and uses idle with reduced motion',()=>{
    const cycle=new WalkCycle({x:0,y:0});
    expect(cycle.sample({x:30,y:0},'left',true,true,false)).toBe('left-walk-1');
    expect(cycle.sample({x:30,y:0},'left',false,false,false)).toBe('left-walk-1');
    expect(cycle.sample({x:30,y:0},'left',true,true,false)).toBe('left-0');
    expect(cycle.sample({x:40,y:0},'right',true,true,true)).toBe('right-0');
  });
  it('keeps the correct stride after a delayed frame with a larger real movement',()=>{
    const cycle=new WalkCycle({x:0,y:0});
    expect(cycle.sample({x:200,y:0},'right',true,true,false)).toBe('right-walk-2');
  });
});
