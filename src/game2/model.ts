import { TILE, type Cell, type Direction, type Level, DIRECTIONS, center, cellKey, sameCell } from './levels';
import { canPush } from './solver';
import { createPuzzle, isPuzzleComplete, rotateMask, type PipePuzzle } from './puzzle';

export type Phase = 'title' | 'intro' | 'playing' | 'paused' | 'repair' | 'won' | 'lost';
export type GameEvent = { type: 'pickup'|'valve'|'push'|'gate'|'repair'|'win'|'lost'|'note'|'turn'; text?:string; x?:number; y?:number };
export const PLAYER_RADIUS = 18, PLAYER_SPEED = 226;
export function normalizeMovement(x:number,y:number,deadZone=0){const length=Math.hypot(x,y);if(length<=deadZone)return{x:0,y:0};const magnitude=Math.min(1,(length-deadZone)/(1-deadZone));return{x:x/length*magnitude,y:y/length*magnitude}}
export function circleIntersectsRect(x:number,y:number,radius:number,rx:number,ry:number,width:number,height:number){const nearestX=Math.max(rx,Math.min(x,rx+width)),nearestY=Math.max(ry,Math.min(y,ry+height));return (x-nearestX)**2+(y-nearestY)**2<radius**2-.001}

export class RescueModel {
  phase:Phase='title';
  resumePhase:'playing'|'repair'='playing';
  player:Cell;
  facing:Direction='down';
  crate:Cell;
  valveClosed=false;
  gateOpen=false;
  collected=[false,false];
  remaining:number;
  elapsed=0;
  puzzle:PipePuzzle;
  events:GameEvent[]=[];
  moving=false;
  pushCooldown=0;
  private walls:Set<string>;
  private pushHistory:Array<{crate:Cell;player:Cell}>=[];
  constructor(public level:Level){this.player=center(level.start);this.crate={...level.crate};this.remaining=level.time;this.puzzle=createPuzzle(level.puzzleRows,level.id*701+29);this.walls=new Set(level.walls.map(cellKey))}
  start(){this.phase='playing';this.events=[]}
  restart(){Object.assign(this,new RescueModel(this.level));this.start()}
  togglePause(){if(this.phase==='paused'){this.phase=this.resumePhase}else if(this.phase==='playing'||this.phase==='repair'){this.resumePhase=this.phase;this.phase='paused'}this.moving=false}
  blocks(x:number,y:number){
    const left=Math.floor((x-PLAYER_RADIUS)/TILE),right=Math.floor((x+PLAYER_RADIUS)/TILE),top=Math.floor((y-PLAYER_RADIUS)/TILE),bottom=Math.floor((y+PLAYER_RADIUS)/TILE);
    for(let ty=top;ty<=bottom;ty++)for(let tx=left;tx<=right;tx++){
      const cell={x:tx,y:ty};
      const solid=tx<0||ty<0||tx>=this.level.width||ty>=this.level.height||this.walls.has(cellKey(cell))||(!this.gateOpen&&sameCell(cell,this.level.gate))||sameCell(cell,this.crate);
      if(solid&&circleIntersectsRect(x,y,PLAYER_RADIUS,tx*TILE+2,ty*TILE+2,TILE-4,TILE-4))return true;
    }
    return false;
  }
  update(seconds:number,input:Cell){
    this.moving=false;
    if(this.phase!=='playing'&&this.phase!=='repair')return;
    const dt=Math.max(0,seconds);this.remaining=Math.max(0,this.remaining-dt);this.elapsed+=dt;this.pushCooldown=Math.max(0,this.pushCooldown-dt);
    if(this.remaining<=0){this.phase='lost';this.events.push({type:'lost'});return}
    if(this.phase==='repair')return;
    const v=normalizeMovement(input.x,input.y);
    if(Math.hypot(v.x,v.y)>.01){
      this.facing=Math.abs(v.x)>Math.abs(v.y)?(v.x>0?'right':'left'):(v.y>0?'down':'up');
      // Substeps avoid tunnelling, including after a temporarily slow frame.
      const steps=Math.max(1,Math.ceil(dt/.02)),step=dt/steps;
      for(let i=0;i<steps;i++){
        const nx=this.player.x+v.x*PLAYER_SPEED*step,ny=this.player.y+v.y*PLAYER_SPEED*step;
        if(!this.blocks(nx,this.player.y)){this.player.x=nx;this.moving=true}
        if(!this.blocks(this.player.x,ny)){this.player.y=ny;this.moving=true}
      }
    }
    this.level.tools.forEach((tool,index)=>{const p=center(tool);if(!this.collected[index]&&Math.hypot(this.player.x-p.x,this.player.y-p.y)<36){this.collected[index]=true;this.events.push({type:'pickup',text:index===0?'Työkalupakki löytyi!':'Tiiviste löytyi!',...p})}});
  }
  near(cell:Cell,distance=88){const p=center(cell);return Math.hypot(this.player.x-p.x,this.player.y-p.y)<=distance}
  interact(){
    if(this.phase!=='playing')return;
    if(this.near(this.level.valve)&&!this.valveClosed){this.valveClosed=true;this.events.push({type:'valve',text:'Pääsulku kiinni. Hyvä!',...center(this.level.valve)});return}
    if(this.near(this.level.leak,105)){
      if(!this.valveClosed){this.note('Sulje ensin punainen pääsulku.');return}
      if(!this.collected.every(Boolean)){this.note('Tarvitset työkalupakin ja tiivisteen.');return}
      this.phase='repair';this.moving=false;this.events.push({type:'repair',text:'Yhdistä putket kiertämällä osia.'});return;
    }
    this.note(this.contextHint());
  }
  push(){
    if(this.phase!=='playing'||this.pushCooldown>0)return false;
    const p=center(this.crate),dx=p.x-this.player.x,dy=p.y-this.player.y;
    // A contextual push faces the adjacent box immediately, even between render frames.
    this.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
    const d=DIRECTIONS[this.facing],behind={x:p.x-d.x*TILE,y:p.y-d.y*TILE};
    if(Math.hypot(this.player.x-behind.x,this.player.y-behind.y)>55){this.note('Mene laatikon taakse ja työnnä sitä kohti.');return false}
    if(!canPush(this.level,this.crate,this.facing,this.gateOpen)){this.note('Ei tilaa tähän suuntaan. Laatikkoa ei voi työntää jumiin.');return false}
    this.pushHistory.push({crate:{...this.crate},player:{...this.player}});this.crate={x:this.crate.x+d.x,y:this.crate.y+d.y};this.pushCooldown=.22;
    this.events.push({type:'push',...center(this.crate)});
    if(sameCell(this.crate,this.level.plate)&&!this.gateOpen){this.gateOpen=true;this.events.push({type:'gate',text:'Huolto-ovi avattu!',...center(this.level.gate)})}
    return true;
  }
  undoPush(){if(this.phase!=='playing'&&this.phase!=='paused')return;const previous=this.pushHistory.pop();if(previous){this.crate=previous.crate;this.player=previous.player;this.events.push({type:'note',text:'Laatikon siirto peruttu. Avattu ovi pysyy auki.'})}else this.note('Ei peruttavia siirtoja.');}
  rotatePiece(index:number){if(this.phase!=='repair'||index<0||index>=this.puzzle.masks.length)return;this.puzzle.masks[index]=rotateMask(this.puzzle.masks[index]);this.events.push({type:'turn'});if(isPuzzleComplete(this.puzzle)){this.phase='won';this.events.push({type:'win',text:'Vuoto pysäytetty!'})}}
  note(text:string){this.events.push({type:'note',text})}
  drainEvents(){const events=this.events;this.events=[];return events}
  contextHint(){
    if(this.phase==='repair')return 'Kierrä putkia. Yhdistä tulo ja lähtö ilman katkoksia.';
    if(!this.valveClosed&&this.near(this.level.valve))return 'E / käsi · sulje pääsulku';
    if(this.near(this.level.leak,110))return this.valveClosed&&this.collected.every(Boolean)?'E / käsi · korjaa vuoto':'Hae työkalupakki ja tiiviste. Pääsulun pitää olla kiinni.';
    if(this.near(this.crate,135))return 'Välilyönti / työnnä · laatikko kytkimelle';
    if(!this.valveClosed)return 'Etsi punainen pääsulku ja sulje se.';
    if(!this.gateOpen)return 'Työnnä puulaatikko hehkuvalle painokytkimelle.';
    if(!this.collected.every(Boolean))return 'Ovi on auki! Hae työkalupakki ja tiiviste.';
    return 'Mene vuotavan putken luo ja korjaa liitos.';
  }
}
