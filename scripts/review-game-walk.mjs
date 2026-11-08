// Drives the real keyboard/touch controls; never teleports the game model.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
const label=process.argv[2]||'after',output='docs/walk-review';mkdirSync(output,{recursive:true});
let server,browser;
try{
  try{await fetch('http://127.0.0.1:5173/peli/')}catch{
    server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{windowsHide:true,stdio:'ignore'});
    for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5173/peli/')).ok)break}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
  }
  browser=await chromium.launch({headless:true,...(process.env.GAME_BROWSER_EXECUTABLE?{executablePath:process.env.GAME_BROWSER_EXECUTABLE}:{})});
  const reports=[];
  for(const [name,viewport] of [['desktop',{width:1440,height:900}],['portrait',{width:390,height:844}]]){
    const context=await browser.newContext({viewport,...(name==='portrait'?{isMobile:true,hasTouch:true}:{}),recordVideo:{dir:output,size:viewport}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:5173/peli/');await page.getByRole('button',{name:'Pelaa',exact:true}).click();await page.getByRole('button',{name:'Työhön!',exact:true}).click();
    await page.waitForTimeout(1200);
    await page.evaluate(()=>{window.__walkSamples=[];window.__walkStop=false;const frame=time=>{const s=window.__PIPE_RESCUE__.snapshot();window.__walkSamples.push({time,player:s.player,phase:s.phase,visual:{avatar:s.presentation.avatar}});if(!window.__walkStop)requestAnimationFrame(frame)};requestAnimationFrame(frame)});
    await page.keyboard.down('d');await page.waitForTimeout(1550);await page.keyboard.up('d');
    await page.keyboard.down('a');await page.waitForTimeout(1400);await page.keyboard.up('a');
    await page.waitForTimeout(300);
    await page.keyboard.down('w');await page.waitForTimeout(1300);await page.keyboard.up('w');
    await page.keyboard.down('s');await page.waitForTimeout(500);await page.keyboard.up('s');
    const samples=await page.evaluate(()=>{window.__walkStop=true;return window.__walkSamples});
    await page.screenshot({path:`${output}/${name}-${label}-gameplay.png`});
    await page.goto('http://127.0.0.1:5173/');await page.locator('.game-teaser').scrollIntoViewIfNeeded();
    await page.locator('.game-promo-art img').evaluate(image=>image.decode());
    await page.screenshot({path:`${output}/${name}-${label}-website.png`});
    const teaser=await page.locator('.game-promo-art').boundingBox(),overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    const video=page.video();await context.close();renameSync(await video.path(),`${output}/${name}-${label}.webm`);
    reports.push({name,viewport,teaser,overflow,errors,samples});
  }
  const json='[\n'+reports.map(({samples,...info})=>JSON.stringify(info).slice(0,-1)+',"samples":[\n'+samples.map(sample=>JSON.stringify(sample)).join(',\n')+'\n]}').join(',\n')+'\n]\n';
  writeFileSync(`${output}/${label}.json`,json);
  console.log(`Real gameplay videos, screenshots and motion samples saved: ${output} (${label}).`);
}finally{await browser?.close();server?.kill()}
