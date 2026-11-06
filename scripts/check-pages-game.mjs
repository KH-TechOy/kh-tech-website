import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
  const page=await browser.newPage({viewport:{width:1440,height:900}}),failures=[],workerRequests=[];
  page.on('pageerror',error=>failures.push(error.message));page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`)});
  page.on('worker',worker=>workerRequests.push(worker.url()));
  await page.goto(origin+base+'peli/');await page.locator('.pr-title-card').waitFor();
  await page.reload();await page.locator('.pr-title-card').waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__PIPE_RESCUE__),'undefined','No development game hook may ship in production');
  await page.getByRole('button',{name:'Pelaa',exact:true}).click();await page.getByRole('button',{name:'Työhön!',exact:true}).click();await page.locator('.pr-hud').waitFor();
  assert.equal(await page.locator('.pr-canvas canvas').count(),1);
  await page.getByRole('button',{name:'Ohita opastus',exact:true}).click();
  await page.getByRole('button',{name:'Asetukset',exact:true}).click();
  await page.getByLabel('Pelaa kenttä koodilla').fill('KHT-12345678-D6');
  await page.getByRole('button',{name:'Pelaa kenttä',exact:true}).click();
  await page.locator('.pr-intro-panel').waitFor();
  assert.match(await page.locator('.pr-intro-panel').innerText(),/KHT-12345678-D6/);
  assert(workerRequests.some(url=>url.includes('generation.worker-')),'Built generation worker must load under the deployment base');
  await page.getByRole('button',{name:'Työhön!',exact:true}).click();
  const routePage=await browser.newPage();
  routePage.on('pageerror',error=>failures.push(error.message));
  for(const [route,selector] of [['','h1'],['palvelut/','h1'],['yritys/','h1'],['tietosuoja/','h1'],['yhteystiedot/','.contact-form'],['report/','.report-form']]){await routePage.goto(origin+base+route);await routePage.locator(selector).waitFor()}
  await routePage.locator('[name=customer]').fill('Paikallinen QA-asiakas');await routePage.locator('[name=address]').fill('Testikatu 1');await routePage.locator('[name=worker]').fill('Testaaja');await routePage.locator('textarea[name=description]').fill('Paikallinen PDF-tarkistus.');
  const downloadPromise=routePage.waitForEvent('download');await routePage.getByRole('button',{name:'Luo ja lataa PDF'}).click();const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/KHT-.*\.pdf$/);assert((await readFile(await download.path())).subarray(0,4).equals(Buffer.from('%PDF')));
  await routePage.reload();assert.equal(await routePage.locator('[name=customer]').inputValue(),'Paikallinen QA-asiakas');
  await routePage.goto(origin+base+'yhteystiedot/');await routePage.locator('[name=name]').fill('QA-tarkistus');await routePage.locator('[name=phone]').fill('0401234567');await routePage.locator('textarea[name=description]').fill('Paikallinen lomakekäyttöliittymän tarkistus.');await routePage.locator('[name=consent]').check();
  await routePage.getByRole('button',{name:'Lähetä pyyntö'}).click();assert.match(await routePage.getByRole('status').innerText(),/Pyyntöä ei lähetetty/);
  await mkdir('docs/game3-screenshots',{recursive:true});await page.screenshot({path:`docs/game3-screenshots/production-${base==='/'?'root':'pages'}-gameplay.png`,animations:'disabled'});
  assert.deepEqual(failures,[],'Production page had a runtime or request failure');
  await writeFile(`docs/game3-checks/production-${base==='/'?'root':'pages'}.json`,JSON.stringify({base,game:true,refresh:true,oneCanvas:true,noDevHook:true,workerRequests,allRoutes:true,localPdfDownload:true,reportDraftPersisted:true,contactDemoStatus:true,failures},null,2));
  console.log(`Production preview passed: ${base}peli/, direct refresh, one canvas, no dev hook, worker and official assets; all routes, contact demo, report draft and actual PDF download.`);
}finally{await browser?.close();server.kill()}
