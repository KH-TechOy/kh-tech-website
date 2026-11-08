import type { Cell, Direction } from './levels';

// One full left/right step pair per 144 logical pixels, at any input speed or FPS.
export class WalkCycle {
  private previous:Cell;
  private direction:Direction='down';
  private distance=0;
  private frame='down-0';
  constructor(start:Cell){this.previous={...start}}
  sample(position:Cell,facing:Direction,moving:boolean,playing:boolean,reducedMotion:boolean){
    const travelled=Math.hypot(position.x-this.previous.x,position.y-this.previous.y);
    this.previous={...position};
    if(!playing)return this.frame;
    if(facing!==this.direction){this.direction=facing;this.distance=0}
    if(!moving||travelled<.001||reducedMotion){this.distance=0;return this.frame=`${facing}-0`}
    this.distance=(this.distance+travelled)%144;
    this.frame=facing==='left'||facing==='right'
      ?`${facing}-walk-${Math.floor(this.distance/24)}`
      :`${facing}-${[1,0,2,0][Math.floor(this.distance/36)]}`;
    return this.frame;
  }
}
