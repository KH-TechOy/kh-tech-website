import {TILE,type Cell,type Direction,type Level,DIRECTIONS,center,cellKey,sameCell} from './levels';
import {canPush,solveLevel} from './solver';
import {createPuzzle,createTutorialPuzzle,isPuzzleComplete,rotateMask,type PipePuzzle} from './puzzle';
import {mixSeed} from './generator';

export type Phase='title'|'intro'|'generating'|'playing'|'paused'|'repair'|'won'|'lost';
export type GameEvent={type:'pickup'|'valve'|'push'|'gate'|'repair'|'win'|'lost'|'note'|'turn'|'bonus';text?:string;x?:number;y?:number;index?:number};
export const PLAYER_RADIUS=18,PLAYER_SPEED=226;
export const TUTORIAL_STEPS=[
  {title:'Liiku putkimiehellä!',detail:'Kokeile sinistä ohjainta tai nuolinäppäimiä.',art:'joystick'},
  {title:'Sulje vesihana!',detail:'Mene punaisen hanan luo. Paina kättä tai E.',art:'valve'},
  {title:'Kerää työkalut!',detail:'Kävele hohtavan työkalupakin ja tiivisteen luo.',art:'toolbox'},
  {title:'Siirrä laatikko!',detail:'Mene laatikon taakse. Paina laatikkopainiketta.',art:'crate'},
  {title:'Korjaa vuoto!',detail:'Mene vuodon luo. Paina kättä tai E.',art:'leak'},
  {title:'Hyvä! Homma hoidettu!',detail:'Olet valmis seuraavaan työhön!',art:'spark'},
];
export function normalizeMovement(x:number,y:number,deadZone=0){const length=Math.hypot(x,y);if(length<=deadZone)return{x:0,y:0};const magnitude=Math.min(1,(length-deadZone)/(1-deadZone));return{x:x/length*magnitude,y:y/length*magnitude}}
export function circleIntersectsRect(x:number,y:number,radius:number,rx:number,ry:number,width:number,height:number){const nearestX=Math.max(rx,Math.min(x,rx+width)),nearestY=Math.max(ry,Math.min(y,ry+height));return(x-nearestX)**2+(y-nearestY)**2<radius**2-.001}

export class RescueModel {
  phase:Phase='title';resumePhase:'playing'|'repair'='playing';player:Cell;facing:Direction='down';crate:Cell;gateOpen=false;
  collected:boolean[];closedValves:boolean[];bonusCollected=false;remaining:number;elapsed=0;puzzle:PipePuzzle;events:GameEvent[]=[];moving=false;pushCooldown=0;
  guided:boolean;tutorialMoved=false;tutorialTurns=0;lastProgress=0;private lastReminder=0;
  private walls:Set<string>;private pushHistory:Array<{crate:Cell;player:Cell}>=[];private pushSafety=new Map<string,boolean>();
  constructor(public level:Level,guided=!!level.tutorial){this.guided=guided;this.player=center(level.start);this.crate={...level.crate};this.remaining=level.time;this.collected=level.tools.map(()=>false);this.closedValves=(level.valves||[level.valve]).map(()=>false);this.puzzle=level.tutorial?createTutorialPuzzle():createPuzzle(level.puzzleRows,level.seed===undefined?level.id*701+29:mixSeed(level.seed,23),level.puzzleColumns);this.walls=new Set(level.walls.map(cellKey))}
  get valveClosed(){return this.closedValves.every(Boolean)}
  set valveClosed(value:boolean){this.closedValves.fill(value)}
  get tutorialStep(){return this.phase==='won'?5:!this.tutorialMoved?0:!this.valveClosed?1:!this.collected.every(Boolean)?2:!this.gateOpen?3:4}
  get stuck(){return this.elapsed-this.lastProgress>11}
  start(){this.phase='playing';this.events=[]}
  skipTutorial(){this.guided=false;this.note('Selvä! Sulje hanat ja korjaa vuoto.');this.lastProgress=this.elapsed}
  restart(){const guided=this.guided;Object.assign(this,new RescueModel(this.level,guided));this.start()}
  togglePause(){if(this.phase==='paused')this.phase=this.resumePhase;else if(this.phase==='playing'||this.phase==='repair'){this.resumePhase=this.phase;this.phase='paused'}this.moving=false}
  blocks(x:number,y:number){
    const left=Math.floor((x-PLAYER_RADIUS)/TILE),right=Math.floor((x+PLAYER_RADIUS)/TILE),top=Math.floor((y-PLAYER_RADIUS)/TILE),bottom=Math.floor((y+PLAYER_RADIUS)/TILE);
    for(let ty=top;ty<=bottom;ty++)for(let tx=left;tx<=right;tx++){const cell={x:tx,y:ty},solid=tx<0||ty<0||tx>=this.level.width||ty>=this.level.height||this.walls.has(cellKey(cell))||(!this.gateOpen&&sameCell(cell,this.level.gate))||sameCell(cell,this.crate);if(solid&&circleIntersectsRect(x,y,PLAYER_RADIUS,tx*TILE+2,ty*TILE+2,TILE-4,TILE-4))return true}return false;
  }
  update(seconds:number,input:Cell){
    this.moving=false;if(this.phase!=='playing'&&this.phase!=='repair')return;
    const dt=Math.max(0,seconds);if(!this.guided)this.remaining=Math.max(0,this.remaining-dt);this.elapsed+=dt;this.pushCooldown=Math.max(0,this.pushCooldown-dt);
    if(this.remaining<=0){this.phase='lost';this.events.push({type:'lost'});return}if(this.phase==='repair')return;
    const v=normalizeMovement(input.x,input.y);
    if(Math.hypot(v.x,v.y)>.01){this.facing=Math.abs(v.x)>Math.abs(v.y)?(v.x>0?'right':'left'):(v.y>0?'down':'up');const steps=Math.max(1,Math.ceil(dt/.02)),step=dt/steps;for(let i=0;i<steps;i++){const nx=this.player.x+v.x*PLAYER_SPEED*step,ny=this.player.y+v.y*PLAYER_SPEED*step;if(!this.blocks(nx,this.player.y)){this.player.x=nx;this.moving=true}if(!this.blocks(this.player.x,ny)){this.player.y=ny;this.moving=true}}}
    if(this.stuck&&this.elapsed-this.lastReminder>12){this.lastReminder=this.elapsed;this.note(this.guided?TUTORIAL_STEPS[this.tutorialStep].detail:this.contextHint())}
    const origin=center(this.level.start);if(!this.tutorialMoved&&Math.hypot(this.player.x-origin.x,this.player.y-origin.y)>=40){this.tutorialMoved=true;this.lastProgress=this.elapsed}
    if(!this.guided||this.valveClosed)this.level.tools.forEach((tool,index)=>{const p=center(tool);if(!this.collected[index]&&Math.hypot(this.player.x-p.x,this.player.y-p.y)<36){this.collected[index]=true;this.lastProgress=this.elapsed;this.events.push({type:'pickup',text:['Työkalupakki löytyi!','Tiiviste löytyi!','Korjausosa löytyi!'][index]||'Väline löytyi!',...p,index})}});
    if(this.level.bonus&&!this.bonusCollected&&this.near(this.level.bonus,36)){this.bonusCollected=true;this.remaining+=5;this.lastProgress=this.elapsed;this.events.push({type:'bonus',text:'Lisätarkastus tehty! +5 s',...center(this.level.bonus)})}
  }
  near(cell:Cell,distance=88){const p=center(cell);return Math.hypot(this.player.x-p.x,this.player.y-p.y)<=distance}
  usableAction(){return(this.level.valves||[this.level.valve]).some((cell,i)=>!this.closedValves[i]&&this.near(cell))?'valve':this.near(this.level.leak,105)&&this.valveClosed&&this.collected.every(Boolean)&&this.gateOpen?'repair':'none'}
  target(){if(!this.valveClosed)return(this.level.valves||[this.level.valve]).find((_,i)=>!this.closedValves[i])!;const tool=this.level.tools.find((_,i)=>!this.collected[i]);if(tool)return tool;if(!this.gateOpen)return this.crate;return this.level.leak}
  interact(){
    if(this.phase!=='playing')return;if(this.guided&&this.tutorialStep===0){this.note(TUTORIAL_STEPS[0].title);return}
    const valves=this.level.valves||[this.level.valve],index=valves.findIndex((cell,i)=>!this.closedValves[i]&&this.near(cell));
    if(index>=0){this.closedValves[index]=true;this.lastProgress=this.elapsed;this.events.push({type:'valve',text:this.valveClosed?'Hyvä! Hana on kiinni.':'Yksi hana kiinni!',...center(valves[index]),index});return}
    if(this.near(this.level.leak,105)){if(!this.valveClosed){this.note('Sulje ensin punaiset hanat.');return}if(!this.collected.every(Boolean)){this.note('Kerää ensin hohtavat välineet.');return}if(!this.gateOpen){this.note('Työnnä laatikko painokytkimelle.');return}this.phase='repair';this.moving=false;this.lastProgress=this.elapsed;this.events.push({type:'repair',text:'Napauta putkia. Yhdistä sininen ja keltainen.'});return}
    this.note(this.contextHint());
  }
  push(){
    if(this.phase!=='playing'||this.pushCooldown>0)return false;if(this.guided&&this.tutorialStep<3){this.note(TUTORIAL_STEPS[this.tutorialStep].title);return false}
    const p=center(this.crate),dx=p.x-this.player.x,dy=p.y-this.player.y;this.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');const d=DIRECTIONS[this.facing],behind={x:p.x-d.x*TILE,y:p.y-d.y*TILE};
    if(Math.hypot(this.player.x-behind.x,this.player.y-behind.y)>55){this.note('Mene aivan laatikon taakse.');return false}
    if(!canPush(this.level,this.crate,this.facing,this.gateOpen)){this.note('Ei tilaa. Kokeile toista puolta!');return false}
    const to={x:this.crate.x+d.x,y:this.crate.y+d.y},willOpen=this.gateOpen||sameCell(to,this.level.plate),key=`${to.x},${to.y}|${this.crate.x},${this.crate.y}|${willOpen}|${this.collected.join()}|${this.closedValves.join()}`;
    if(!this.pushSafety.has(key)){const remainingTools=this.level.tools.filter((_,i)=>!this.collected[i]),remainingValves=(this.level.valves||[this.level.valve]).filter((_,i)=>!this.closedValves[i]);this.pushSafety.set(key,solveLevel({...this.level,start:this.crate,crate:to,tools:remainingTools,valves:remainingValves},1800,willOpen).solvable)}
    if(!this.pushSafety.get(key)){this.note('Tämä suunta tukkisi reitin. Kokeile toista puolta!');return false}
    this.pushHistory.push({crate:{...this.crate},player:{...this.player}});this.crate=to;this.pushCooldown=.22;this.lastProgress=this.elapsed;this.events.push({type:'push',...center(this.crate)});
    if(willOpen&&!this.gateOpen){this.gateOpen=true;this.events.push({type:'gate',text:'Hienoa! Reitti aukesi!',...center(this.level.gate)})}return true;
  }
  undoPush(){if(this.phase!=='playing'&&this.phase!=='paused')return;const previous=this.pushHistory.pop();if(previous){this.crate=previous.crate;this.player=previous.player;this.events.push({type:'note',text:'Laatikon siirto peruttu.'})}else this.note('Laatikkoa ei ole vielä siirretty.')}
  rotatePiece(index:number){if(this.phase!=='repair'||index<0||index>=this.puzzle.masks.length)return;this.puzzle.masks[index]=rotateMask(this.puzzle.masks[index]);this.tutorialTurns++;this.lastProgress=this.elapsed;this.events.push({type:'turn'});if(isPuzzleComplete(this.puzzle)){this.phase='won';this.events.push({type:'win',text:'Hyvä! Homma hoidettu!'})}}
  note(text:string){this.events.push({type:'note',text})}
  drainEvents(){const events=this.events;this.events=[];return events}
  contextHint(){if(this.guided){if(this.phase==='repair')return this.tutorialTurns?'Hyvä! Yhdistä sininen tulo keltaiseen lähtöön.':'Napauta hohtavaa putkea!';return TUTORIAL_STEPS[this.tutorialStep].title}if(this.phase==='repair')return 'Yhdistä sininen tulo keltaiseen lähtöön.';const action=this.usableAction();if(action==='valve')return 'Paina kättä tai E: Sulje hana';if(action==='repair')return 'Paina kättä tai E: Korjaa vuoto';if(this.near(this.crate,135)&&!this.gateOpen)return 'Paina laatikkoa tai välilyöntiä: Työnnä';if(!this.valveClosed)return this.closedValves.length>1?'Etsi punaiset hanat ja sulje ne.':'Etsi punainen hana ja sulje se.';if(!this.collected.every(Boolean))return 'Kerää hohtavat työkalut ja osat.';if(!this.gateOpen)return 'Työnnä laatikko painokytkimelle.';return 'Mene vuodon luo ja korjaa putki.'}
}
