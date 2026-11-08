import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  for(const label of ['before','after']){
    const run=JSON.parse(readFileSync(`docs/walk-review/${label}.json`,'utf8')).find(run=>run.name==='desktop');
    const times=Array.from({length:8},(_,i)=>run.samples[0].time+250+i*85);
    const poses=times.map(time=>run.samples.reduce((best,s)=>Math.abs(s.time-time)<Math.abs(best.time-time)?s:best));
    const src='data:video/webm;base64,'+readFileSync(`docs/walk-review/desktop-${label}.webm`).toString('base64');
    const png=await page.evaluate(async({src,times,poses,label})=>{
      const video=document.createElement('video');video.muted=true;video.src=src;
      await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=reject});
      const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=440;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#12263c';ctx.fillRect(0,0,canvas.width,canvas.height);
      const zoom=Math.min(1.1,(1408-78)/1200,(804-100)/(633.6+80));
      for(let i=0;i<times.length;i++){
        const target=times[i]/1000;
        await new Promise(resolve=>{video.onseeked=resolve;video.currentTime=target});
        const pose=poses[i],x=16+1408/2+(pose.visual.avatar.x-600)*zoom,y=78+804/2+(pose.visual.avatar.y-(633.6/2-25/zoom))*zoom;
        const tileX=i%4*360,tileY=Math.floor(i/4)*220;
        ctx.drawImage(video,x-180,y-166,360,192,tileX,tileY,360,192);
        ctx.fillStyle='white';ctx.font='12px Arial';ctx.fillText(`${label}: video ${(target).toFixed(2)} s`,tileX+4,tileY+210);
      }
      return canvas.toDataURL('image/png').split(',')[1];
    },{src,times,poses,label});
    writeFileSync(`docs/walk-review/${label}-filmstrip.png`,Buffer.from(png,'base64'));
  }
}finally{await browser.close()}
