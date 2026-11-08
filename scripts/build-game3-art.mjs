// Offline sprite packaging, original PNG branding layers and atlas layout.
// The artwork is generated with the built-in imagegen tool; this script does not call an API.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve('art/game3/source'), output=resolve('public/game2/v3');
mkdirSync(output,{recursive:true});
const data=path=>'data:image/png;base64,'+readFileSync(path).toString('base64');
const sources=Object.fromEntries(['character','props','pipes','floor','wall','mascot','water','side-walk'].map(key=>[key,data(resolve(root,key+'.png'))]));
sources.logo=data(resolve('docs/kh-tech-logo-musta.png'));sources.icon=data(resolve('docs/favicon-kh-tech.png'));
const browser=await chromium.launch({headless:true,...(process.env.GAME_BROWSER_EXECUTABLE?{executablePath:process.env.GAME_BROWSER_EXECUTABLE}:{})});
try{
const page=await browser.newPage();
const result=await page.evaluate(async sources=>{
  const load=async src=>{const image=new Image();image.src=src;await image.decode();return image};
  const images=Object.fromEntries(await Promise.all(Object.entries(sources).map(async([key,src])=>[key,await load(src)])));
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  const files={}, frames={}, bounds=[];
  const save=(name,c)=>files[name]=c.toDataURL('image/webp',.94).split(',')[1];
  const crop=(img,col,row,cols,rows)=>{
    const cw=img.width/cols,ch=img.height/rows,c=canvas(Math.ceil(cw),Math.ceil(ch)),ctx=c.getContext('2d');
    ctx.drawImage(img,col*cw,row*ch,cw,ch,0,0,c.width,c.height);
    const pixels=ctx.getImageData(0,0,c.width,c.height).data;let minX=c.width,minY=c.height,maxX=0,maxY=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>96){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
    const b={x:Math.max(0,minX-2),y:Math.max(0,minY-2),w:maxX-minX+5,h:maxY-minY+5};
    const out=canvas(b.w,b.h);out.getContext('2d').drawImage(c,b.x,b.y,b.w,b.h,0,0,b.w,b.h);return out;
  };
  const contain=(ctx,img,x,y,w,h)=>{const scale=Math.min(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)};
  const label=(ctx,x,y,w)=>{ctx.fillStyle='#edf0ed';ctx.fillRect(x-1,y-1,w+2,w*424/1340+2);contain(ctx,images.logo,x,y,w,w*424/1340)};
  const sheet=canvas(768,1024),sheetContext=sheet.getContext('2d');
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){
    const pose=crop(images.character,col,row,3,4),c=canvas(256,256),ctx=c.getContext('2d');
    const scale=Math.min(220/pose.width,220/pose.height),w=pose.width*scale,h=pose.height*scale,x=(256-w)/2,y=242-h;
    ctx.drawImage(pose,x,y,w,h);
    if(row===0){contain(ctx,images.icon,123,y+h*.1,11,12.4);label(ctx,137,y+h*.50,19)}
    if(row===1){contain(ctx,images.icon,109,y+h*.07,9,10.2);label(ctx,110,y+h*.49,13)}
    if(row===2){contain(ctx,images.icon,139,y+h*.07,9,10.2);label(ctx,129,y+h*.49,13)}
    if(row===3)label(ctx,111,y+h*.475,34);
    sheetContext.drawImage(c,col*256,row*256);
    bounds.push({direction:['down','left','right','up'][row],frame:col,sourceWidth:pose.width,sourceHeight:pose.height});
    if(row===0&&col===0){const head=canvas(192,192);head.getContext('2d').drawImage(c,73,23,110,110,0,0,192,192);save('portrait.webp',head)}
  }
  save('plumber-sheet.webp',sheet);
  const walk=canvas(1536,512),walkContext=walk.getContext('2d'),source=images['side-walk'];
  // Fixed cell framing and one scale across all poses: never centre/resize each
  // silhouette independently, which makes the head jump when limbs swing.
  const cellW=source.width/6,cellH=source.height/2,walkScale=220/330;
  for(let row=0;row<2;row++)for(let col=0;col<6;col++){
    const c=canvas(256,256),ctx=c.getContext('2d'),baseline=row===0?326:333;
    const dx=128-cellW/2*walkScale+(row===0?-9:3),dy=242-baseline*walkScale;
    ctx.drawImage(source,col*cellW,row*cellH,cellW,cellH,dx,dy,cellW*walkScale,cellH*walkScale);
    contain(ctx,images.icon,row===0?153:110,row===0?55:51,10,11.3);
    label(ctx,row===0?153:115,row===0?139:136,17);
    walkContext.drawImage(c,col*256,row*256);
  }
  save('plumber-walk.webp',walk);
  const atlas=canvas(1536,1280),a=atlas.getContext('2d');
  const groups=[['props',['crate','toolbox','plant','boiler','counter','shelf','basin','washer','toilet','desk','spare','gasket']],['pipes',['pipe','pipe-elbow','pipe-tee','coupling','valve','valve-closed','leak','leak-off','support','wall-light','gate','plate']]];
  let n=0;
  for(const [source,names] of groups)for(let i=0;i<names.length;i++,n++){
    const key=names[i],sprite=crop(images[source],i%4,Math.floor(i/4),4,3),c=canvas(256,256),ctx=c.getContext('2d');
    contain(ctx,sprite,6,6,244,244);
    if(key==='toolbox')label(ctx,69,163,77);
    const x=n%6*256,y=Math.floor(n/6)*256;a.drawImage(c,x,y);
    frames[key]={frame:{x,y,w:256,h:256},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:256,h:256},sourceSize:{w:256,h:256}};
    if(['crate','valve','toolbox','leak','gasket','spare'].includes(key))save(key+'.webp',c);
  }
  for(let i=0;i<4;i++,n++){
    const key=['water-puddle','water-splash','water-ring','water-jet'][i],sprite=crop(images.water,i%2,Math.floor(i/2),2,2),c=canvas(256,256);
    contain(c.getContext('2d'),sprite,4,4,248,248);
    const x=n%6*256,y=Math.floor(n/6)*256;a.drawImage(c,x,y);
    frames[key]={frame:{x,y,w:256,h:256},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:256,h:256},sourceSize:{w:256,h:256}};
  }
  save('workshop-atlas.webp',atlas);
  for(const key of ['floor','wall']){const c=canvas(512,512);c.getContext('2d').drawImage(images[key],0,0,512,512);save(key+'.webp',c)}
  const mascot=canvas(640,800),m=mascot.getContext('2d');contain(m,images.mascot,0,0,640,800);
  contain(m,images.icon,236,50,32,36.1);label(m,384,380,43);save('mascot.webp',mascot);
  return{files,atlas:{frames,meta:{app:'KH-Tech GAME 3.0 offline atlas packer',image:'workshop-atlas.webp',format:'RGBA8888',size:{w:1536,h:1280},scale:'1'}},bounds};
},sources);
const walkOnly=process.argv.includes('--walk-only');
for(const [name,base64] of Object.entries(result.files))if(!walkOnly||name==='plumber-walk.webp')writeFileSync(resolve(output,name),Buffer.from(base64,'base64'));
if(!walkOnly){
  writeFileSync(resolve(output,'workshop-atlas.json'),JSON.stringify(result.atlas,null,2)+'\n');
  writeFileSync(resolve('art/game3/pack-layout.json'),JSON.stringify(result.bounds,null,2)+'\n');
}
console.log(walkOnly?'Packed side walking cycle only.':`Packed ${Object.keys(result.files).length} WebP files and 28 atlas frames into ${output}`);
}finally{await browser.close()}
