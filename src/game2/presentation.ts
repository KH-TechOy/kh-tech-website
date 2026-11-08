import Phaser from 'phaser';
import { center, TILE, type Cell } from './levels';
import { RescueModel, type GameEvent } from './model';
import { FLOOR_DEPTH, project, wallRuns } from './projection';
import { WalkCycle } from './walkCycle';

const ATLAS='workshop';
const floorTints={kitchen:0xd9dce8,bathroom:0xb8e0ec,basement:0xa7aac3,utility:0xc1cdd6,office:0xd9c6c9,technical:0xadc3d9};
export class WorkshopView {
  readonly avatar:Phaser.GameObjects.Sprite;
  private avatarShadow:Phaser.GameObjects.Image;
  private crate:Phaser.GameObjects.Image;
  private crateShadow:Phaser.GameObjects.Image;
  private gate:Phaser.GameObjects.Image;
  private plate:Phaser.GameObjects.Image;
  private valves:Phaser.GameObjects.Image[]=[];
  private tools:Phaser.GameObjects.Image[]=[];
  private bonus:Phaser.GameObjects.Image|null=null;
  private puddle:Phaser.GameObjects.Image;
  private splash:Phaser.GameObjects.Image;
  private waterJet:Phaser.GameObjects.Image;
  private jet:Phaser.GameObjects.Graphics;
  private water:Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks:Phaser.GameObjects.Particles.ParticleEmitter;
  private leak:Phaser.GameObjects.Image;
  private waterLight:Phaser.GameObjects.Image;
  private prompt:Phaser.GameObjects.Text;
  private waterAge=0;
  private settle=1;
  private crateKey='';
  private lightQuality=false;
  private walk:WalkCycle;
  constructor(private scene:Phaser.Scene,private model:RescueModel,private reducedMotion:boolean){
    const s=scene,level=model.level,w=level.width*TILE,h=level.height*TILE*FLOOR_DEPTH;
    this.walk=new WalkCycle(model.player);
    this.effects();
    s.cameras.main.setBackgroundColor('#0e1b31');
    s.add.tileSprite(-1800,-1300,w+3600,h+2600,'floor3').setOrigin(0).setTileScale(.625,.625*FLOOR_DEPTH).setTint(0x394a66).setDepth(-500);
    s.add.tileSprite(0,0,w,h,'floor3').setOrigin(0).setTileScale(.625,.625*FLOOR_DEPTH).setTint(floorTints[level.theme]).setDepth(-200);
    this.walls();
    level.decor.forEach(d=>this.prop(d.asset,d.cell,d.asset==='counter'?103:82,d.asset==='plant'?116:104));
    // Decoration stays on blocked boundary cells; no furniture hides walkable tiles.
    if(!level.decor.some(d=>d.cell.x===0&&d.cell.y===2))this.prop('plant',{x:0,y:2},82,121);
    if(!level.decor.some(d=>d.cell.x===level.width-1&&d.cell.y===level.height-3))this.prop('boiler',{x:level.width-1,y:level.height-3},98,142);
    this.backWallPipes();
    for(let x=2;x<level.width-1;x+=4){
      const lx=x*TILE,ly=-49;
      s.add.image(lx,ly+30,'soft-light').setDisplaySize(285,200).setTint(0xffc879).setAlpha(.24).setBlendMode(Phaser.BlendModes.ADD).setDepth(61);
      s.add.image(lx,ly,ATLAS,'wall-light').setDisplaySize(62,76).setDepth(58);
      s.add.image(lx,82,'soft-light').setDisplaySize(290,190).setTint(0xffca86).setAlpha(.17).setBlendMode(Phaser.BlendModes.ADD).setDepth(-150);
    }
    s.add.image((level.width-3.2)*TILE,-53,'brand-sign').setDisplaySize(142,85).setDepth(70);
    for(const cell of level.valves||[level.valve]){
      const p=project(center(cell));this.shadow(p.x,p.y+8,123,32,.32);
      // Uniform diameter; the valve assembly contains its own pipe connections.
      this.valves.push(s.add.image(p.x,p.y-16,ATLAS,'valve').setDisplaySize(158,130).setDepth(p.y+14));
    }
    const c=project(center(model.crate));
    this.crateShadow=this.shadow(c.x+6,c.y+8,83,33,.4);
    this.crate=s.add.image(c.x,c.y+9,ATLAS,'crate').setDisplaySize(91,98).setOrigin(.5,.94).setDepth(c.y+9);this.crateKey=`${model.crate.x},${model.crate.y}`;
    const p=project(center(level.plate));
    this.plate=s.add.image(p.x,p.y+1,ATLAS,'plate').setDisplaySize(89,69).setDepth(-48);
    this.gate=this.prop('gate',level.gate,86,117);
    // Door jambs remain visible after the sliding panel opens.
    const door=project(center(level.gate));
    s.add.rectangle(door.x-39,door.y-29,7,92,0x364d6d).setStrokeStyle(1,0x94a5bd).setDepth(door.y-7);
    s.add.rectangle(door.x+39,door.y-29,7,92,0x364d6d).setStrokeStyle(1,0x94a5bd).setDepth(door.y-7);
    level.tools.forEach((cell,i)=>this.tools.push(this.prop(['toolbox','gasket','spare'][i]||'spare',cell,i===0?83:58,i===0?79:58)));
    if(level.bonus){const b=project(center(level.bonus));this.bonus=s.add.image(b.x,b.y-12,'inspection').setDisplaySize(62,74).setDepth(b.y+10)}
    const leak=project(center(level.leak));
    this.waterLight=s.add.image(leak.x,leak.y+16,'soft-light').setDisplaySize(270,170).setTint(0x1fcfff).setAlpha(.24).setBlendMode(Phaser.BlendModes.ADD).setDepth(-105);
    this.puddle=s.add.image(leak.x,leak.y+17,ATLAS,'water-puddle').setDisplaySize(185,133).setAlpha(.85).setDepth(-100);
    this.splash=s.add.image(leak.x+2,leak.y+4,ATLAS,'water-splash').setDisplaySize(72,66).setDepth(leak.y+17);
    this.waterJet=s.add.image(leak.x,leak.y-3,ATLAS,'water-jet').setDisplaySize(39,49).setDepth(leak.y+16);
    this.shadow(leak.x,leak.y+5,158,31,.35);
    this.leak=s.add.image(leak.x,leak.y-26,ATLAS,'leak').setDisplaySize(181,122).setDepth(leak.y+7);
    this.jet=s.add.graphics().setDepth(leak.y+15);
    this.water=s.add.particles(leak.x,leak.y-11,'water-drop',{speedX:{min:-66,max:66},speedY:{min:-95,max:-12},gravityY:335,lifespan:{min:360,max:670},frequency:reducedMotion?150:40,scale:{start:.6,end:.1},alpha:{start:.85,end:0},maxParticles:38}).setDepth(leak.y+20);
    this.sparks=s.add.particles(0,0,'spark',{speed:{min:45,max:140},angle:{min:0,max:360},lifespan:650,scale:{start:.18,end:0},quantity:12,emitting:false,maxParticles:80}).setDepth(3000);
    const player=project(model.player);
    this.avatarShadow=this.shadow(player.x+3,player.y+3,49,22,.56);
    this.avatar=s.add.sprite(player.x,player.y+7,'plumber3','down-0').setDisplaySize(146,146).setOrigin(.5,.945).setDepth(player.y+12);
    this.prompt=s.add.text(0,0,'',{fontFamily:'Trebuchet MS,Arial',fontSize:'13px',fontStyle:'bold',color:'#f4f9ff',backgroundColor:'#142c45',padding:{x:11,y:7},stroke:'#102035',strokeThickness:1}).setOrigin(.5).setDepth(2500).setVisible(false);
    this.fitCamera();
  }
  private effects(){
    const textures=this.scene.textures;
    if(!textures.exists('soft-light')){const c=textures.createCanvas('soft-light',128,128)!,ctx=c.context,g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.28,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);c.refresh()}
    if(!textures.exists('water-drop')){const g=this.scene.make.graphics({x:0,y:0});g.fillStyle(0xa4f6ff);g.fillEllipse(8,8,9,14);g.fillStyle(0xffffff,.8);g.fillEllipse(6,5,3,5);g.generateTexture('water-drop',16,16);g.destroy()}
  }
  private shadow(x:number,y:number,w:number,h:number,alpha:number){return this.scene.add.image(x,y,'soft-light').setDisplaySize(w,h).setTint(0x06142d).setAlpha(alpha).setDepth(-40)}
  private prop(key:string,cell:Cell,w=88,h=104){
    const p=project(center(cell));this.shadow(p.x+5,p.y+6,w*.95,31,.44);
    return this.scene.add.image(p.x,p.y+9,ATLAS,key).setDisplaySize(w,h).setOrigin(.5,.94).setDepth(p.y+9);
  }
  private walls(){
    const s=this.scene,level=this.model.level;
    for(const run of wallRuns(level)){
      const y=run.y*FLOOR_DEPTH,depth=TILE*FLOOR_DEPTH,height=run.y===0?102:run.y/TILE===level.height-1?28:53;
      // Continuous textured cap and face. Adjacent solid cells have no vertical end seam.
      s.add.tileSprite(run.x,y-height,run.length,depth,'wall3').setOrigin(0).setTileScale(.9,.38).setTint(0xc8bfd8).setDepth(y+depth-.4);
      s.add.rectangle(run.x+run.length/2,y-height+2,run.length,3,0xd0c4de,.68).setDepth(y+depth-.2);
      if(run.front){
        s.add.tileSprite(run.x,y+depth-height,run.length,height,'wall3').setOrigin(0).setTileScale(.72,.25).setTint(0xb0a5d1).setDepth(y+depth);
        s.add.rectangle(run.x+run.length/2,y+depth-height+3,run.length,5,0xaba0c6).setDepth(y+depth+.2);
        s.add.rectangle(run.x+run.length/2,y+depth-4,run.length,8,0x25314c,.8).setDepth(y+depth+.3);
        s.add.image(run.x+run.length/2+9,y+depth+12,'soft-light').setDisplaySize(run.length+24,35).setTint(0x09132c).setAlpha(.36).setDepth(-60);
        s.add.rectangle(run.x+run.length-4,y+depth-height/2,8,height,0x252b47,.4).setDepth(y+depth+.4);
      }
    }
  }
  private backWallPipes(){
    const s=this.scene,w=this.model.level.width*TILE,start=90,end=w-159,y=18,diameter=26;
    // Calibrated ports in the packed atlas, not bounding-box centres. Every pipe has
    // the same 26px bore; actual end positions are shared by joints and segments.
    const straight=(x1:number,y1:number,x2:number,y2:number)=>{
      const length=Math.hypot(x2-x1,y2-y1);
      return s.add.image((x1+x2)/2,(y1+y2)/2,ATLAS,'pipe').setDisplaySize((length+2)/.945,diameter/.305).setRotation(Math.atan2(y2-y1,x2-x1)).setDepth(62);
    };
    for(let x=start;x<end;x+=160){
      const right=Math.min(end,x+160);straight(x,y,right,y);
      if(x>start)s.add.image(x,y,ATLAS,'coupling').setDisplaySize(26,37).setDepth(65);
      if((x-start)%320===0)s.add.image(x+65,y+2,ATLAS,'support').setDisplaySize(36,51).setDepth(61);
    }
    const teeX=start+226,teeSize=diameter/.297;
    s.add.image(teeX,y,ATLAS,'pipe-tee').setOrigin(.488,.707).setDisplaySize(teeSize,teeSize).setDepth(64);
    const teeTop=y+(.17-.707)*teeSize;straight(teeX,-91,teeX,teeTop);
    s.add.image(teeX,teeTop,ATLAS,'coupling').setDisplaySize(24,34).setRotation(Math.PI/2).setDepth(65);
    const elbowSize=diameter/.328;
    s.add.image(end,y,ATLAS,'pipe-elbow').setOrigin(.026,.766).setDisplaySize(elbowSize,elbowSize).setDepth(64);
    const elbowTop={x:end+(.828-.026)*elbowSize,y:y+(.098-.766)*elbowSize};
    straight(elbowTop.x,-91,elbowTop.x,elbowTop.y);
    s.add.image(elbowTop.x,elbowTop.y,ATLAS,'coupling').setDisplaySize(24,34).setRotation(Math.PI/2).setDepth(65);
  }
  fitCamera(){
    const {width,height}=this.scene.scale,w=this.model.level.width*TILE,h=this.model.level.height*TILE*FLOOR_DEPTH,camera=this.scene.cameras.main;
    const zoom=width<600?.98:height<500?.77:Math.min(1.1,(width-78)/w,(height-100)/(h+80));camera.setZoom(zoom);
    if(width>=600&&height>=500)camera.stopFollow().removeBounds().centerOn(w/2,h/2-25/zoom);
    else{const px=width/zoom*.5,py=height/zoom*.5;camera.setBounds(-px,-py,w+px*2,h+py*2).startFollow(this.avatar,false,.12,.12,0,-25)}
  }
  setQuality(light:boolean){this.lightQuality=light;this.water.setFrequency(light?110:this.reducedMotion?150:40)}
  event(event:GameEvent){
    const s=this.scene,point=project({x:event.x??this.model.player.x,y:event.y??this.model.player.y});
    if(['pickup','bonus','valve','gate'].includes(event.type)){
      const label=s.add.text(point.x,point.y-58,event.type==='valve'?'Vesi suljettu!':event.type==='gate'?'Ovi avattu':event.text||'+1',{fontFamily:'Trebuchet MS,Arial',fontSize:'17px',fontStyle:'bold',color:'#fff0b7',stroke:'#14263e',strokeThickness:4}).setOrigin(.5).setDepth(3000);
      s.tweens.add({targets:label,y:point.y-96,alpha:0,delay:400,duration:this.reducedMotion?150:1000,onComplete:()=>label.destroy()});this.sparks.emitParticleAt(point.x,point.y-35,10);
    }
    if(event.type==='valve'){this.valves[event.index||0]?.setFrame('valve-closed');if(this.model.valveClosed)this.water.stop()}
    if(event.type==='gate'){this.plate.setTint(0xa7ffcb);s.tweens.add({targets:this.gate,y:this.gate.y-60,alpha:0,duration:this.reducedMotion?0:450})}
    if(event.type==='win'){this.water.stop();this.leak.setFrame('leak-off');this.sparks.emitParticleAt(point.x,point.y-55,this.reducedMotion?12:60);if(!this.reducedMotion)s.cameras.main.flash(200,160,235,225,false)}
    if(event.type==='lost'&&!this.reducedMotion)s.cameras.main.shake(220,.003);
  }
  update(time:number,seconds:number){
    const m=this.model,p=project(m.player),active=m.phase==='playing'||m.phase==='repair';
    const frame=this.walk.sample(m.player,m.facing,m.moving,m.phase==='playing',this.reducedMotion);
    this.avatar.setTexture(frame.includes('-walk-')?'plumber-walk':'plumber3',frame).setPosition(p.x,p.y+7).setDepth(p.y+12);
    if(!m.moving&&!this.reducedMotion&&m.phase==='playing')this.avatar.y+=Math.sin(time/800)*.7;
    this.avatarShadow.setPosition(p.x+3,p.y+4);
    this.tools.forEach((image,i)=>image.setVisible(!m.collected[i]));this.bonus?.setVisible(!m.bonusCollected);
    const key=`${m.crate.x},${m.crate.y}`;
    if(key!==this.crateKey){this.crateKey=key;const c=project(center(m.crate));this.scene.tweens.killTweensOf(this.crate);this.scene.tweens.add({targets:this.crate,x:c.x,y:c.y+9,duration:this.reducedMotion?0:150,ease:'Sine.easeOut'});this.crate.setDepth(c.y+9);this.crateShadow.setPosition(c.x+6,c.y+8)}
    // Context only: no target(), solver route, floating arrow or next-object marker.
    const target=m.actionTarget(),action=target?.kind,near=target?.cell;
    this.prompt.setVisible(m.phase==='playing'&&!!near);
    if(near){const n=project(center(near));this.prompt.setText(action==='valve'?'E · SULJE':action==='repair'?'E · KORJAA':'E · TYÖNNÄ').setPosition(n.x,n.y-97)}
    if(active&&!m.valveClosed)this.waterAge=Math.min(1,this.waterAge+seconds/80);
    if(active&&m.valveClosed)this.settle=Math.max(0,this.settle-seconds*.3);
    this.water.emitting=active&&!m.valveClosed;
    this.drawWater(time,active);
  }
  private drawWater(time:number,active:boolean){
    const m=this.model,p=project(center(m.level.leak)),g=this.jet,phase=this.reducedMotion?0:time/1000;
    g.clear();
    this.puddle.setDisplaySize(185+this.waterAge*130,133+this.waterAge*80);
    this.splash.setVisible(active&&!m.valveClosed).setDisplaySize(65+(this.reducedMotion?0:Math.sin(phase*13)*7),64+(this.reducedMotion?0:Math.cos(phase*15)*6));
    this.waterJet.setVisible(active&&!m.valveClosed).setDisplaySize(39+(this.reducedMotion?0:Math.sin(phase*16)*3),49);
    if(!this.lightQuality)for(let i=0;i<3;i++){const t=(phase*.65+i/3)%1,size=(13+t*37)*(m.valveClosed?this.settle:1);g.lineStyle(1.5,0xc0faff,(1-t)*.65*(m.valveClosed?this.settle:1));g.strokeEllipse(p.x+4,p.y+15,size*2,size*.60)}
    this.waterLight.setAlpha(m.valveClosed?.09:.21+Math.sin(phase*3)*.025);

  }
  debugState(){
    const p=project(this.model.player);
    return{projection:'three-quarter',floorDepth:FLOOR_DEPTH,playerFoot:{x:p.x,y:p.y},avatar:{x:this.avatar.x,y:this.avatar.y,frame:this.avatar.frame.name},contextVisible:this.prompt.visible,water:{coverage:this.waterAge,emitting:this.water.emitting,jetVisible:this.waterJet.visible,settle:this.settle},loadedGuidanceTextures:['guide-arrow','marker'].filter(key=>this.scene.textures.exists(key))};
  }
}
