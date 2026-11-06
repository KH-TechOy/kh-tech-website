import Phaser from 'phaser';
import { LEVELS, TILE, center, type Cell, type Direction } from './levels';
import { RescueModel, normalizeMovement, type GameEvent, type Phase } from './model';
import { solveLevel } from './solver';
import type { PipePuzzle } from './puzzle';

const ART = `${import.meta.env.BASE_URL}game2/`;
const assets=['plumber-sheet','floor','floor-kitchen','floor-office','floor-basement','wall','pipe','leak','leak-off','puddle','crate','valve','valve-closed','toolbox','gasket','plant','boiler','counter','shelf','plate','plate-active','gate','wall-light','glow','marker','droplet','spark'];
export type Snapshot={
  ready:boolean;phase:Phase;level:number;title:string;location:string;tip:string;remaining:number;elapsed:number;
  valveClosed:boolean;gateOpen:boolean;collected:boolean[];hint:string;message:string;puzzle:PipePuzzle;
  muted:boolean;quality:'full'|'light';
};
export type PerformanceStats={samples:number;meanFps:number;p95FrameMs:number;renderer:string;quality:string;implementation:string};
export type GameCommand='play'|'begin'|'interact'|'push'|'pause'|'restart'|'next'|'undo'|'mute'|'title';
class SoundKit {
  private context:AudioContext|null=null;
  muted=true;
  toggle(){this.muted=!this.muted;if(!this.muted){try{this.context??=new AudioContext();void this.context.resume();this.play('turn')}catch{this.muted=true}}}
  play(kind:string){if(this.muted||!this.context)return;const context=this.context,start=context.currentTime;const notes=kind==='win'?[523,659,784,1046]:kind==='pickup'?[660,880]:kind==='lost'?[220,165,110]:kind==='valve'?[330,260]:[kind==='push'?140:440];notes.forEach((frequency,index)=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=kind==='push'?'triangle':'sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start+index*.09);gain.gain.linearRampToValueAtTime(.045,start+index*.09+.01);gain.gain.exponentialRampToValueAtTime(.001,start+index*.09+.16);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start+index*.09);oscillator.stop(start+index*.09+.18)})}
  destroy(){void this.context?.close();this.context=null}
}

export class RescueScene extends Phaser.Scene {
  model=new RescueModel(LEVELS[0]);
  levelIndex=0;
  ready=false;
  analog:Cell={x:0,y:0};
  readonly keys=new Set<string>();
  private avatar!:Phaser.GameObjects.Sprite;
  private avatarShadow!:Phaser.GameObjects.Ellipse;
  private ring!:Phaser.GameObjects.Ellipse;
  private crateImage!:Phaser.GameObjects.Image;
  private crateShadow!:Phaser.GameObjects.Ellipse;
  private gateImage!:Phaser.GameObjects.Image;
  private plateImage!:Phaser.GameObjects.Image;
  private valveImage!:Phaser.GameObjects.Image;
  private leakImage!:Phaser.GameObjects.Image;
  private toolImages:Phaser.GameObjects.Image[]=[];
  private toolGlows:Phaser.GameObjects.Image[]=[];
  private puddle!:Phaser.GameObjects.Image;
  private water!:Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!:Phaser.GameObjects.Particles.ParticleEmitter;
  private marker!:Phaser.GameObjects.Image;
  private sfx=new SoundKit();
  private hudSignature='';
  private message='';
  private messageUntil=0;
  private samples:number[]=[];
  private quality:'full'|'light'='full';
  private lastPhase:Phase='title';
  private previousWallTime=0;
  private crateVisualKey='';
  private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private publish:(snapshot:Snapshot)=>void){super('pipe-rescue')}
  preload(){assets.forEach(name=>this.load.svg(name,`${ART}${name}.svg`));this.load.on('loaderror',(file:Phaser.Loader.File)=>{this.message=`Grafiikan lataus epäonnistui: ${file.key}. Päivitä sivu.`})}
  create(){
    const sheet=this.textures.get('plumber-sheet');
    for(const [row,direction] of ['down','left','right','up'].entries())for(let frame=0;frame<3;frame++)sheet.add(`${direction}-${frame}`,0,frame*256,row*256,256,256);
    this.buildWorld();this.ready=true;this.emitSnapshot();
    this.scale.on('resize',this.fitCamera,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.scale.off('resize',this.fitCamera,this);this.sfx.destroy();this.keys.clear();this.analog={x:0,y:0};this.tweens.killAll()});
  }
  private prop(key:string,cell:Cell,width=90,height=100){const p=center(cell);this.add.ellipse(p.x+3,p.y+12,width*.76,24,0x112440,.21).setDepth(p.y-2);return this.add.image(p.x,p.y+18,key).setDisplaySize(width,height).setOrigin(.5,.8).setDepth(p.y+10)}
  private buildWorld(){
    this.cameras.main.stopFollow();this.tweens.killAll();this.children.removeAll(true);this.toolImages=[];this.toolGlows=[];
    const level=this.model.level,worldW=level.width*TILE,worldH=level.height*TILE;
    this.cameras.main.setBackgroundColor('#142b4a');
    this.add.tileSprite(-1000,-800,worldW+2000,worldH+1600,'floor').setOrigin(0).setTileScale(TILE/128).setTint(0x344865).setDepth(-200);
    const tint=level.theme==='kitchen'?0xffe8e2:level.theme==='basement'?0xa9cfeb:0xd8e5f4;
    this.add.tileSprite(0,0,worldW,worldH,`floor-${level.theme}`).setOrigin(0).setTileScale(TILE/128).setTint(tint).setDepth(-100);
    // Separate illustrated fixtures share the same logical wall cells as their collisions.
    level.walls.forEach((cell,index)=>{
      const decoration=level.decor.find(d=>d.cell.x===cell.x&&d.cell.y===cell.y);
      if(decoration){this.prop(decoration.asset,cell,decoration.asset==='counter'?100:85,decoration.asset==='plant'?112:105);return}
      if(cell.y===0&&cell.x>=2&&cell.x<=4){if(cell.x===3)this.prop('counter',cell,220,145);return}
      if(cell.x===0&&[2,8].includes(cell.y)){this.prop(cell.y===2?'plant':'shelf',cell,88,125);return}
      if(cell.x===14&&[2,8].includes(cell.y)){this.prop(level.theme==='basement'?'boiler':'plant',cell,88,125);return}
      const p=center(cell);this.add.image(p.x+1,p.y+17,'wall').setOrigin(.5,.75).setDisplaySize(85,99).setTint(index%4===0?0xece2f6:0xffffff).setDepth(p.y+22);
    });
    for(let x=2;x<13;x+=3){this.add.image(x*TILE,165,'glow').setDisplaySize(310,210).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.2).setDepth(1);this.add.image(x*TILE,74,'wall-light').setDisplaySize(210,155).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.70).setDepth(85)}
    const v=center(level.valve),leak=center(level.leak);
    // Art pipes run across the back wall and into the actual valve / damaged joint.
    for(let x=2;x<13;x+=2)this.add.image(x*TILE,120,'pipe').setDisplaySize(175,133).setAlpha(.94).setDepth(114);
    this.add.image(v.x,v.y-8,'pipe').setDisplaySize(205,124).setDepth(v.y-16);
    this.valveImage=this.add.image(v.x,v.y-5,'valve').setDisplaySize(123,123).setDepth(v.y+12);
    const plate=center(level.plate);
    this.add.ellipse(plate.x,plate.y+2,101,58,0xffd966,.15).setDepth(0);
    this.plateImage=this.add.image(plate.x,plate.y+5,'plate').setDisplaySize(100,100).setDepth(2);
    const crate=center(this.model.crate);this.crateShadow=this.add.ellipse(crate.x+3,crate.y+12,69,24,0x112440,.21).setDepth(crate.y-2);
    this.crateImage=this.add.image(crate.x,crate.y+18,'crate').setDisplaySize(91,102).setOrigin(.5,.8).setDepth(crate.y+10);this.crateVisualKey='';
    this.gateImage=this.prop('gate',level.gate,102,112);
    this.puddle=this.add.image(leak.x-17,leak.y+35,'puddle').setDisplaySize(208,158).setDepth(leak.y-18).setAlpha(.93);
    this.leakImage=this.add.image(leak.x,leak.y-3,'leak').setDisplaySize(178,140).setDepth(leak.y+5);
    level.tools.forEach((cell,index)=>{const p=center(cell);const glow=this.add.image(p.x,p.y,'glow').setDisplaySize(140,140).setAlpha(.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(p.y-2);const image=this.prop(index===0?'toolbox':'gasket',cell,index===0?85:68,index===0?87:68);this.toolImages.push(image);this.toolGlows.push(glow);if(!this.reducedMotion){this.tweens.add({targets:image,y:image.y-6,duration:1100+index*170,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});this.tweens.add({targets:glow,alpha:.3,duration:800,yoyo:true,repeat:-1})}});
    this.water=this.add.particles(leak.x+2,leak.y+7,'droplet',{speedX:{min:-40,max:40},speedY:{min:35,max:105},gravityY:160,lifespan:560,frequency:this.reducedMotion?130:42,scale:{start:.32,end:.05},alpha:{start:.95,end:0},maxParticles:45}).setDepth(leak.y+44);
    this.sparks=this.add.particles(0,0,'spark',{speed:{min:50,max:165},angle:{min:0,max:360},lifespan:650,scale:{start:.22,end:0},quantity:12,emitting:false,maxParticles:100}).setDepth(2500);
    this.ring=this.add.ellipse(this.model.player.x,this.model.player.y+6,58,27,0x55dbef,.2).setStrokeStyle(3,0x8bf4ff,.65).setDepth(5);
    this.avatarShadow=this.add.ellipse(this.model.player.x+3,this.model.player.y+6,43,18,0x102b45,.30).setDepth(6);
    this.avatar=this.add.sprite(this.model.player.x,this.model.player.y+9,'plumber-sheet','down-0').setDisplaySize(108,108).setOrigin(.5,.88).setDepth(this.model.player.y+26);
    this.marker=this.add.image(0,0,'marker').setDisplaySize(43,48).setDepth(2300);
    this.cameras.main.startFollow(this.avatar,false,.10,.10,0,-22);this.fitCamera();
  }
  private fitCamera(){
    if(!this.avatar)return;
    const {width,height}=this.scale,worldW=this.model.level.width*TILE,worldH=this.model.level.height*TILE;
    const zoom=width<600?.83:height<500?.73:Math.min(.98,(width-38)/worldW,(height-20)/worldH);
    this.cameras.main.setZoom(zoom);
    if(width>=600&&height>=500){this.cameras.main.stopFollow().removeBounds().centerOn(worldW/2,worldH/2)}
    else{this.cameras.main.setBounds(-36,-58,worldW+72,worldH+116).startFollow(this.avatar,false,.10,.10,0,-22)}
  }
  private floatText(text:string,x:number,y:number,color='#fff5c0'){
    const label=this.add.text(x,y-42,text,{fontFamily:'Trebuchet MS, Arial',fontSize:'18px',fontStyle:'bold',color,stroke:'#17304c',strokeThickness:5,align:'center'}).setOrigin(.5).setDepth(3000);
    this.tweens.add({targets:label,y:y-88,alpha:0,delay:400,duration:this.reducedMotion?250:1100,onComplete:()=>label.destroy()});
  }
  private handleEvent(event:GameEvent){
    if(event.text){this.message=event.text;this.messageUntil=this.time.now+3300}
    this.sfx.play(event.type);
    const x=event.x??this.model.player.x,y=event.y??this.model.player.y;
    if(event.type==='pickup'){this.floatText(event.text||'+1',x,y);this.sparks.emitParticleAt(x,y,12)}
    if(event.type==='valve'){this.water.stop();this.valveImage.setTexture('valve-closed');this.leakImage.setTexture('leak-off');this.floatText('Pääsulku kiinni',x,y);this.sparks.emitParticleAt(x,y,8)}
    if(event.type==='gate'){this.plateImage.setTexture('plate-active');this.tweens.add({targets:this.gateImage,y:this.gateImage.y-55,alpha:0,duration:this.reducedMotion?0:400});this.floatText('Ovi avattu',x,y,'#a9ffe3')}
    if(event.type==='push'){this.sparks.emitParticleAt(x,y+20,4)}
    if(event.type==='repair'){this.analog={x:0,y:0};this.keys.clear()}
    if(event.type==='win'){
      this.water.stop();this.marker.setVisible(false);this.tweens.add({targets:this.puddle,alpha:.3,scaleX:this.puddle.scaleX*.75,scaleY:this.puddle.scaleY*.75,duration:600});
      this.sparks.emitParticleAt(this.model.player.x,this.model.player.y-35,this.reducedMotion?12:65);
      if(!this.reducedMotion)this.cameras.main.flash(240,160,245,220,false);
      try{const highest=Number(localStorage.getItem('kht-game2-progress')||0);localStorage.setItem('kht-game2-progress',String(Math.max(highest,this.levelIndex+1)))}catch{/* Progress is optional. */}
    }
    if(event.type==='lost'){this.water.start();this.tweens.add({targets:this.puddle,scaleX:this.puddle.scaleX*1.8,scaleY:this.puddle.scaleY*1.8,alpha:1,duration:700});if(!this.reducedMotion)this.cameras.main.shake(260,.004)}
  }
  update(time:number,frameDelta:number){
    if(!this.ready)return;
    const wallTime=performance.now(),delta=this.previousWallTime?wallTime-this.previousWallTime:frameDelta;this.previousWallTime=wallTime;
    const before=this.model.phase;
    const keyboard={x:(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0),y:(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0)};
    const input=Math.hypot(this.analog.x,this.analog.y)>.01?this.analog:normalizeMovement(keyboard.x,keyboard.y);
    this.model.update(delta/1000,input);
    for(const event of this.model.drainEvents())this.handleEvent(event);
    const player=this.model.player;this.avatar.x=player.x;this.avatar.y=player.y+9;
    this.avatar.setDepth(player.y+26).setFrame(`${this.model.facing}-${this.model.moving&&!this.reducedMotion?1+Math.floor(time/115)%2:0}`);
    if(!this.model.moving&&!this.reducedMotion&&this.model.phase==='playing')this.avatar.y+=Math.sin(time/650)*1.4;
    this.avatarShadow.setPosition(player.x+3,player.y+7).setDepth(player.y-3);this.ring.setPosition(player.x,player.y+7).setDepth(player.y-4);
    this.toolImages.forEach((image,index)=>{if(this.model.collected[index]){image.setVisible(false);this.toolGlows[index].setVisible(false)}});
    const crateKey=`${this.model.crate.x},${this.model.crate.y}`;
    if(crateKey!==this.crateVisualKey){this.crateVisualKey=crateKey;const p=center(this.model.crate);this.tweens.killTweensOf(this.crateImage);this.tweens.add({targets:this.crateImage,x:p.x,y:p.y+18,duration:this.reducedMotion?0:150,ease:'Sine.easeOut'});this.tweens.add({targets:this.crateShadow,x:p.x+3,y:p.y+12,duration:this.reducedMotion?0:150});this.crateShadow.setDepth(p.y-2);this.crateImage.setDepth(p.y+10)}
    let target=this.model.level.valve;
    if(this.model.valveClosed){target=!this.model.gateOpen?this.model.level.plate:!this.model.collected[0]?this.model.level.tools[0]:!this.model.collected[1]?this.model.level.tools[1]:this.model.level.leak}
    const point=center(target);this.marker.setPosition(point.x,point.y-75+(this.reducedMotion?0:Math.sin(time/280)*4)).setVisible(this.model.phase==='playing');
    if((before==='playing'||before==='repair')&&delta>0){this.samples.push(delta);if(this.samples.length>600)this.samples.shift();if(this.samples.length>90&&this.quality==='full'&&1000/(this.samples.reduce((a,b)=>a+b,0)/this.samples.length)<40){this.quality='light';this.water.setFrequency(110)}}
    const signature=`${this.model.phase}|${Math.ceil(this.model.remaining)}|${this.model.valveClosed}|${this.model.gateOpen}|${this.model.collected.join()}|${this.model.contextHint()}|${this.time.now<this.messageUntil?this.message:''}`;
    if(signature!==this.hudSignature||this.lastPhase!==this.model.phase){this.hudSignature=signature;this.lastPhase=this.model.phase;this.emitSnapshot()}
  }
  emitSnapshot(){const model=this.model;this.publish({ready:this.ready,phase:model.phase,level:this.levelIndex,title:model.level.title,location:model.level.location,tip:model.level.tip,remaining:model.remaining,elapsed:model.elapsed,valveClosed:model.valveClosed,gateOpen:model.gateOpen,collected:[...model.collected],hint:model.contextHint(),message:this.time.now<this.messageUntil?this.message:'',puzzle:{...model.puzzle,masks:[...model.puzzle.masks]},muted:this.sfx.muted,quality:this.quality})}
  command(command:GameCommand){
    if(!this.ready)return;
    switch(command){
      case 'play':this.model.phase='intro';break;
      case 'begin':this.model.start();break;
      case 'interact':this.model.interact();break;
      case 'push':this.model.push();break;
      case 'pause':this.model.togglePause();this.resetInput();break;
      case 'restart':this.startLevel(this.levelIndex,true);break;
      case 'next':this.startLevel((this.levelIndex+1)%LEVELS.length,false);break;
      case 'undo':this.model.undoPush();break;
      case 'mute':this.sfx.toggle();break;
      case 'title':this.startLevel(0,false);this.model.phase='title';break;
    }
    this.emitSnapshot();
  }
  startLevel(index:number,startImmediately=false){
    this.levelIndex=index;const candidate=LEVELS[index]||LEVELS[0];const level=solveLevel(candidate).solvable?candidate:LEVELS[0];
    this.model=new RescueModel(level);this.model.phase=startImmediately?'playing':'intro';this.message='';this.messageUntil=0;this.resetInput();this.buildWorld();this.emitSnapshot();
  }
  rotate(index:number){this.model.rotatePiece(index);for(const event of this.model.drainEvents())this.handleEvent(event);this.emitSnapshot()}
  resetInput(){this.keys.clear();this.analog={x:0,y:0}}
  setFacing(direction:Direction){this.model.facing=direction}
  getMetrics():PerformanceStats{const data=[...this.samples].sort((a,b)=>a-b),mean=data.reduce((a,b)=>a+b,0)/Math.max(1,data.length);let implementation='Canvas 2D';if(this.game.renderer.type===Phaser.WEBGL){const gl=(this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl,ext=gl.getExtension('WEBGL_debug_renderer_info');implementation=ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'WebGL (renderer details unavailable)'}return{samples:data.length,meanFps:mean?Number((1000/mean).toFixed(1)):0,p95FrameMs:data.length?Number(data[Math.floor((data.length-1)*.95)].toFixed(2)):0,renderer:this.game.renderer.type===Phaser.WEBGL?'WebGL':'Canvas',quality:this.quality,implementation}}
  debugSnapshot(){return{phase:this.model.phase,player:{...this.model.player},crate:{...this.model.crate},level:this.model.level,valveClosed:this.model.valveClosed,gateOpen:this.model.gateOpen,collected:[...this.model.collected],remaining:this.model.remaining,puzzle:this.model.puzzle,metrics:this.getMetrics(),input:{analog:{...this.analog},keys:[...this.keys]}}}
}

export function mountGame(parent:HTMLElement,publish:(snapshot:Snapshot)=>void){
  const scene=new RescueScene(publish),rect=parent.getBoundingClientRect();
  const canvasBenchmark=import.meta.env.DEV&&new URLSearchParams(location.search).get('renderer')==='canvas';
  const game=new Phaser.Game({type:canvasBenchmark?Phaser.CANVAS:Phaser.AUTO,parent,width:Math.max(320,rect.width),height:Math.max(260,rect.height),backgroundColor:'#142b4a',scene:[scene],autoFocus:false,antialias:true,render:{antialias:true,roundPixels:false},scale:{mode:Phaser.Scale.NONE},input:{keyboard:false,mouse:false,touch:false},fps:{target:60,min:30,smoothStep:true},audio:{noAudio:true}});
  const resize=new ResizeObserver(entries=>{const r=entries[0].contentRect;if(r.width&&r.height)game.scale.resize(Math.round(r.width),Math.round(r.height))});resize.observe(parent);
  return{scene,destroy:()=>{resize.disconnect();game.destroy(true)}};
}
