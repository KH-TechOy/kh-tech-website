import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const base=process.env.VITE_BASE_PATH||'/kh-tech-website/';
const origin='http://127.0.0.1:5182';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5182','--strictPort'],{windowsHide:true,env:{...process.env,VITE_BASE_PATH:base},stdio:'pipe'});
let log='';server.stdout.on('data',data=>{log+=data});server.stderr.on('data',data=>{log+=data});
let browser;
try{
  let online=false;for(let i=0;i<100;i++){try{if((await fetch(origin+base+'peli/')).ok){online=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
  assert(online,`Preview did not start: ${log}`);
  browser=await chromium.launch({headless:true,...(process.env.GAME_BROWSER_EXECUTABLE?{executablePath:process.env.GAME_BROWSER_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),failures=[];
  page.on('pageerror',error=>failures.push(error.message));page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`)});
  await page.goto(origin+base+'peli/');await page.locator('.pr-title-card').waitFor();
  await page.reload();await page.locator('.pr-title-card').waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__PIPE_RESCUE__),'undefined','No development game hook may ship in production');
  await page.getByRole('button',{name:'Pelaa',exact:true}).click();await page.getByRole('button',{name:'Työhön!',exact:true}).click();await page.locator('.pr-hud').waitFor();
  assert.equal(await page.locator('.pr-canvas canvas').count(),1);
  const routePage=await browser.newPage();
  for(const [route,selector] of [['','h1'],['yhteystiedot/','.contact-form'],['report/','.report-form']]){await routePage.goto(origin+base+route);await routePage.locator(selector).waitFor()}
  await mkdir('docs/game2-screenshots',{recursive:true});await page.screenshot({path:'docs/game2-screenshots/production-pages-gameplay.png',animations:'disabled'});
  assert.deepEqual(failures,[],'Production page had a runtime or request failure');
  console.log(`Production preview passed: ${base}peli/, direct refresh, one canvas, no dev hook; website/contact/report routes load.`);
}finally{await browser?.close();server.kill()}
