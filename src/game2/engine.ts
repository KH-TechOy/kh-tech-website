import Phaser from 'phaser';
import { TUTORIAL_LEVEL, type Cell, type Direction, type Level, type GenerationInfo } from './levels';
import { RescueModel, normalizeMovement, type GameEvent, type Phase } from './model';
import { WorkshopView } from './presentation';
import { LevelFactory } from './levelFactory';
import { mixSeed, replayCode } from './generator';
import type { PipePuzzle } from './puzzle';

const ART = `${import.meta.env.BASE_URL}game2/`;
const effectAssets=['spark','brand-sign','inspection'];
export type Snapshot={
  ready:boolean;phase:Phase;level:number;title:string;location:string;tip:string;remaining:number;elapsed:number;
  valveClosed:boolean;gateOpen:boolean;collected:boolean[];hint:string;message:string;puzzle:PipePuzzle;
  muted:boolean;quality:'full'|'light';
  totalTime:number;guided:boolean;tutorialStep:number;tutorialTurns:number;interaction:string;pushNearby:boolean;
  valvesClosed:number;valvesTotal:number;seedCode:string;difficulty:number;bonus:boolean;bonusCollected:boolean;
  generation?:GenerationInfo;workerUsed:boolean;
};
export type PerformanceStats={samples:number;meanFps:number;p95FrameMs:number;renderer:string;quality:string;implementation:string};
export type GameCommand='play'|'begin'|'interact'|'push'|'pause'|'restart'|'next'|'undo'|'mute'|'title'|'skip'|'fresh'|'hint';
class SoundKit {
  private context:AudioContext|null=null;
  muted=true;
  toggle(){this.muted=!this.muted;if(!this.muted){try{this.context??=new AudioContext();void this.context.resume();this.play('turn')}catch{this.muted=true}}}
  play(kind:string){if(this.muted||!this.context)return;const context=this.context,start=context.currentTime;const notes=kind==='win'?[523,659,784,1046]:kind==='pickup'?[660,880]:kind==='lost'?[220,165,110]:kind==='valve'?[330,260]:[kind==='push'?140:440];notes.forEach((frequency,index)=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=kind==='push'?'triangle':'sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start+index*.09);gain.gain.linearRampToValueAtTime(.045,start+index*.09+.01);gain.gain.exponentialRampToValueAtTime(.001,start+index*.09+.16);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start+index*.09);oscillator.stop(start+index*.09+.18)})}
  destroy(){void this.context?.close();this.context=null}
}

export class RescueScene extends Phaser.Scene {
  model=new RescueModel(TUTORIAL_LEVEL);
  levelIndex=0;
  ready=false;
  analog:Cell={x:0,y:0};
  readonly keys=new Set<string>();
  private view!:WorkshopView;
  private factory=new LevelFactory();
  private sessionSeed=crypto.getRandomValues(new Uint32Array(1))[0];
  private generationEpoch=0;
  private sfx=new SoundKit();
  private hudSignature='';
  private message='';
  private messageUntil=0;
  private samples:number[]=[];
  private quality:'full'|'light'='full';
  private lastPhase:Phase='title';
  private previousWallTime=0;
  private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private publish:(snapshot:Snapshot)=>void){super('pipe-rescue')}
  preload(){
    effectAssets.forEach(name=>this.load.svg(name,`${ART}${name}.svg`));
    this.load.atlas('workshop',`${ART}v3/workshop-atlas.webp`,`${ART}v3/workshop-atlas.json`);
    this.load.image('plumber3',`${ART}v3/plumber-sheet.webp`);
    this.load.image('floor3',`${ART}v3/floor.webp`);this.load.image('wall3',`${ART}v3/wall.webp`);
    this.load.on('loaderror',(file:Phaser.Loader.File)=>{this.message=`Grafiikan lataus epäonnistui: ${file.key}. Päivitä sivu.`});
  }
  create(){
    const sheet=this.textures.get('plumber3');
    for(const [row,direction] of ['down','left','right','up'].entries())for(let frame=0;frame<3;frame++)sheet.add(`${direction}-${frame}`,0,frame*256,row*256,256,256);
    this.buildWorld();this.ready=true;this.emitSnapshot();
    this.scale.on('resize',this.fitCamera,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.ready=false;this.generationEpoch++;this.factory.dispose();this.scale.off('resize',this.fitCamera,this);this.sfx.destroy();this.keys.clear();this.analog={x:0,y:0};this.tweens.killAll()});
  }
  private buildWorld(){
    this.cameras.main.stopFollow();this.tweens.killAll();this.children.removeAll(true);
    this.view=new WorkshopView(this,this.model,this.reducedMotion);
    this.view.setQuality(this.quality==='light');
  }
  private fitCamera(){this.view?.fitCamera()}
  private handleEvent(event:GameEvent){
    if(event.text){this.message=event.text;this.messageUntil=this.time.now+3300}
    this.sfx.play(event.type);this.view.event(event);
    if(event.type==='repair')this.resetInput();
    if(event.type==='win')try{const highest=Number(localStorage.getItem('kht-game2-progress')||0);localStorage.setItem('kht-game2-progress',String(Math.max(highest,this.levelIndex+1)))}catch{/* Optional progress. */}
  }
  update(time:number,frameDelta:number){
    if(!this.ready)return;
    const wallTime=performance.now(),delta=this.previousWallTime?wallTime-this.previousWallTime:frameDelta;this.previousWallTime=wallTime;
    const before=this.model.phase;
    const keyboard={x:(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0),y:(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0)};
    const input=Math.hypot(this.analog.x,this.analog.y)>.01?this.analog:normalizeMovement(keyboard.x,keyboard.y);
    this.model.update(delta/1000,input);
    for(const event of this.model.drainEvents())this.handleEvent(event);
    this.view.update(time,delta/1000);
    if((before==='playing'||before==='repair')&&delta>0){this.samples.push(delta);if(this.samples.length>600)this.samples.shift();if(this.samples.length>90&&this.quality==='full'&&1000/(this.samples.reduce((a,b)=>a+b,0)/this.samples.length)<40){this.quality='light';this.view.setQuality(true)}}
    const signature=`${this.model.phase}|${Math.ceil(this.model.remaining)}|${this.model.closedValves.join()}|${this.model.gateOpen}|${this.model.collected.join()}|${this.model.contextHint()}|${this.model.tutorialStep}|${this.model.guided}|${this.model.bonusCollected}|${this.model.usableAction()}|${this.model.near(this.model.crate,135)}|${this.time.now<this.messageUntil?this.message:''}`;
    if(signature!==this.hudSignature||this.lastPhase!==this.model.phase){this.hudSignature=signature;this.lastPhase=this.model.phase;this.emitSnapshot()}
  }
  emitSnapshot(){const model=this.model;this.publish({ready:this.ready,phase:model.phase,level:this.levelIndex,title:model.level.title,location:model.level.location,tip:model.level.tip,remaining:model.remaining,totalTime:model.level.time,elapsed:model.elapsed,valveClosed:model.valveClosed,gateOpen:model.gateOpen,collected:[...model.collected],hint:model.contextHint(),message:this.time.now<this.messageUntil?this.message:'',puzzle:{...model.puzzle,masks:[...model.puzzle.masks]},muted:this.sfx.muted,quality:this.quality,guided:model.guided,tutorialStep:model.tutorialStep,tutorialTurns:model.tutorialTurns,interaction:model.usableAction(),pushNearby:model.near(model.crate,135),valvesClosed:model.closedValves.filter(Boolean).length,valvesTotal:model.closedValves.length,seedCode:model.level.tutorial?'OPASTUS':replayCode(model.level.seed||0,model.level.difficulty||1),difficulty:model.level.difficulty||0,bonus:!!model.level.bonus,bonusCollected:model.bonusCollected,generation:model.level.generation,workerUsed:this.factory.usedWorker})}
  command(command:GameCommand){
    if(!this.ready||(this.model.phase==='generating'&&command!=='title'))return;
    switch(command){
      case 'play':{const params=new URLSearchParams(location.search),seed=params.get('seed');if(seed&&/^[0-9a-f]{1,8}$/i.test(seed)){void this.replay(parseInt(seed,16),Math.max(1,Math.min(12,Number(params.get('difficulty'))||1)))}else this.model.phase='intro';break}
      case 'begin':this.model.start();break;
      case 'interact':this.model.interact();break;
      case 'push':this.model.push();break;
      case 'pause':this.model.togglePause();this.resetInput();break;
      case 'restart':this.applyLevel(this.model.level,this.levelIndex,true,this.model.guided);break;
      case 'next':void this.startGenerated(this.levelIndex+1);break;
      case 'undo':this.model.undoPush();break;
      case 'mute':this.sfx.toggle();break;
      case 'title':this.generationEpoch++;this.applyLevel(TUTORIAL_LEVEL,0,false,true);this.model.phase='title';break;
      case 'skip':this.model.skipTutorial();break;
      case 'fresh':this.sessionSeed=crypto.getRandomValues(new Uint32Array(1))[0];void this.startGenerated(1);break;
      case 'hint':this.model.note(this.model.contextHint());break;
    }
    this.emitSnapshot();
  }
  private applyLevel(level:Level,index:number,startImmediately=false,guided=false){this.levelIndex=index;this.model=new RescueModel(level,guided);this.model.phase=startImmediately?'playing':'intro';this.message='';this.messageUntil=0;this.resetInput();this.buildWorld();this.emitSnapshot()}
  private async startGenerated(index:number,replay?:{seed:number;difficulty:number}){
    const epoch=++this.generationEpoch;this.model.phase='generating';this.resetInput();this.emitSnapshot();
    const difficulty=replay?.difficulty||Math.min(12,1+Math.floor((index-1)/2)),seed=replay?.seed??mixSeed(this.sessionSeed,index);
    try{const level=await this.factory.create(seed,difficulty);if(epoch!==this.generationEpoch||!this.ready)return;this.applyLevel({...level,id:index+1},index)}catch{if(epoch===this.generationEpoch&&this.ready)this.applyLevel(TUTORIAL_LEVEL,0,false,true)}
  }
  async replay(seed:number,difficulty:number){await this.startGenerated(Math.max(1,2*difficulty-1),{seed:seed>>>0,difficulty})}
  rotate(index:number){this.model.rotatePiece(index);for(const event of this.model.drainEvents())this.handleEvent(event);this.emitSnapshot()}
  resetInput(){this.keys.clear();this.analog={x:0,y:0}}
  setFacing(direction:Direction){this.model.facing=direction}
  getMetrics():PerformanceStats{const data=[...this.samples].sort((a,b)=>a-b),mean=data.reduce((a,b)=>a+b,0)/Math.max(1,data.length);let implementation='Canvas 2D';if(this.game.renderer.type===Phaser.WEBGL){const gl=(this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl,ext=gl.getExtension('WEBGL_debug_renderer_info');implementation=ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'WebGL (renderer details unavailable)'}return{samples:data.length,meanFps:mean?Number((1000/mean).toFixed(1)):0,p95FrameMs:data.length?Number(data[Math.floor((data.length-1)*.95)].toFixed(2)):0,renderer:this.game.renderer.type===Phaser.WEBGL?'WebGL':'Canvas',quality:this.quality,implementation}}
  debugSnapshot(){return{phase:this.model.phase,player:{...this.model.player},crate:{...this.model.crate},level:this.model.level,valveClosed:this.model.valveClosed,closedValves:[...this.model.closedValves],gateOpen:this.model.gateOpen,collected:[...this.model.collected],remaining:this.model.remaining,guided:this.model.guided,tutorialStep:this.model.tutorialStep,workerUsed:this.factory.usedWorker,puzzle:this.model.puzzle,metrics:this.getMetrics(),presentation:this.ready?this.view.debugState():undefined,input:{analog:{...this.analog},keys:[...this.keys]}}}
}

export function mountGame(parent:HTMLElement,publish:(snapshot:Snapshot)=>void){
  const scene=new RescueScene(publish),rect=parent.getBoundingClientRect();
  const canvasBenchmark=import.meta.env.DEV&&new URLSearchParams(location.search).get('renderer')==='canvas';
  const game=new Phaser.Game({type:canvasBenchmark?Phaser.CANVAS:Phaser.AUTO,parent,width:Math.max(320,rect.width),height:Math.max(260,rect.height),backgroundColor:'#142b4a',scene:[scene],autoFocus:false,antialias:true,render:{antialias:true,roundPixels:false},scale:{mode:Phaser.Scale.NONE},input:{keyboard:false,mouse:false,touch:false},fps:{target:60,min:30,smoothStep:true},audio:{noAudio:true}});
  const resize=new ResizeObserver(entries=>{const r=entries[0].contentRect;if(r.width&&r.height)game.scale.resize(Math.round(r.width),Math.round(r.height))});resize.observe(parent);
  return{scene,destroy:()=>{resize.disconnect();game.destroy(true)}};
}
