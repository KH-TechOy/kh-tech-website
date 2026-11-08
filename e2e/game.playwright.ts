import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { TILE, center, DIRECTIONS, type Cell, type Direction } from '../src/game2/levels';
import { solveLevel, walkPath } from '../src/game2/solver';
const output=process.env.GAME_SCREENSHOTS||'docs/game3-screenshots';mkdirSync(output,{recursive:true});
const snapshot=(page:Page)=>page.evaluate(()=>window.__PIPE_RESCUE__!.snapshot());
let errors:string[]=[];
test.beforeEach(async({page})=>{errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`/peli/${process.env.GAME_RENDERER==='canvas'?'?renderer=canvas':''}`);await page.waitForFunction(()=>window.__PIPE_RESCUE__&&document.querySelector('.pr-title-card'))});
test.afterEach(()=>expect(errors,'browser runtime errors').toEqual([]));
async function begin(page:Page){await page.getByRole('button',{name:'Pelaa',exact:true}).click();await page.getByRole('button',{name:'Työhön!',exact:true}).click();await page.waitForFunction(()=>window.__PIPE_RESCUE__?.snapshot().phase==='playing')}
async function screenshot(page:Page,name:string){await page.locator('.pr-panel,.pr-title-card').evaluateAll(async elements=>{await Promise.all(elements.flatMap(element=>element.getAnimations()).filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})))});await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await page.screenshot({path:`${output}/${test.info().project.name}-${name}.png`,animations:'disabled'})}
async function moveTo(page:Page,point:Cell){
  for(const axis of ['x','y'] as const){const start=(await snapshot(page)).player[axis],target=point[axis];if(Math.abs(start-target)<4)continue;const sign=target>start?1:-1,key=axis==='x'?(sign>0?'ArrowRight':'ArrowLeft'):(sign>0?'ArrowDown':'ArrowUp');await page.keyboard.down(key);try{await page.waitForFunction(({axis,target,sign})=>{const p=window.__PIPE_RESCUE__!.snapshot().player;return sign>0?p[axis]>=target-2:p[axis]<=target+2},{axis,target,sign},{timeout:10000,polling:'raf'})}finally{await page.keyboard.up(key)}}
}
async function walkTo(page:Page,target:Cell){const state=await snapshot(page),current={x:Math.floor(state.player.x/TILE),y:Math.floor(state.player.y/TILE)};const path=walkPath(state.level,current,target,state.crate,state.gateOpen);expect(path,'target must have a path').not.toBeNull();await page.locator('.pr-page').focus();for(const cell of path!.slice(1))await moveTo(page,center(cell))}
const arrow:Record<Direction,string>={up:'ArrowUp',right:'ArrowRight',down:'ArrowDown',left:'ArrowLeft'};

test('homepage game teaser uses the current mascot and fits narrow phones',async({page})=>{
  await page.goto('/');
  const teaser=page.locator('.game-teaser'),image=teaser.locator('img');
  await teaser.scrollIntoViewIfNeeded();await expect(image).toHaveAttribute('src','/game2/v3/mascot.webp');
  await image.evaluate(image=>(image as HTMLImageElement).decode());
  await expect(teaser.getByRole('link',{name:'Pelaa Putkimestaria'})).toHaveAttribute('href','/peli/');
  for(const width of test.info().project.name==='portrait'?[390,320]:[page.viewportSize()!.width]){
    await page.setViewportSize({width,height:page.viewportSize()!.height});await teaser.scrollIntoViewIfNeeded();
    const card=(await teaser.locator('.game-promo-art').boundingBox())!,picture=(await image.boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(0);expect(card.x+card.width).toBeLessThanOrEqual(width);
    expect(picture.height/picture.width).toBeCloseTo(1.25,1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:`docs/walk-review/${test.info().project.name}-teaser-${width}.png`});
  }
});

test('exploration has no route markers, context is local and closing water freezes coverage',async({page})=>{
  await begin(page);
  const initial=await snapshot(page);
  expect(initial.presentation?.loadedGuidanceTextures).toEqual([]);
  expect(initial.presentation?.contextVisible).toBe(false);
  expect(await page.locator('.pr-intro-panel').count()).toBe(0);
  await page.waitForTimeout(1200);
  const wet=await snapshot(page);
  expect(wet.presentation!.water.coverage).toBeGreaterThan(initial.presentation!.water.coverage);
  expect(wet.presentation!.water.jetVisible).toBe(true);
  const valve=wet.level.valve;await walkTo(page,valve);
  await expect.poll(async()=>(await snapshot(page)).presentation!.contextVisible).toBe(true);
  const atValve=await snapshot(page);
  expect(atValve.presentation!.playerFoot.y).toBeCloseTo(atValve.player.y*.72,4);
  expect(atValve.presentation!.avatar.x).toBeCloseTo(atValve.player.x,4);
  await page.keyboard.press('e');await page.waitForTimeout(80);
  const closed=await snapshot(page);
  expect(closed.valveClosed).toBe(true);expect(closed.tutorialStep).toBe(2);
  expect(closed.presentation!.water.emitting).toBe(false);
  expect(closed.presentation!.water.jetVisible).toBe(false);
  await page.waitForTimeout(1200);const settled=await snapshot(page);
  expect(settled.presentation!.water.coverage).toBe(closed.presentation!.water.coverage);
  expect(settled.presentation!.water.settle).toBeLessThan(closed.presentation!.water.settle);
  expect(settled.presentation!.contextVisible).toBe(false);
  await expect(page.locator('.pr-objective')).toHaveCount(4);
  await page.getByRole('button',{name:'Ohita opastus',exact:true}).click();
  await expect(page.locator('.pr-context')).toHaveText('Tutki huonetta ja ratkaise korjaustyö. Tavoitteet näkyvät ylhäällä.');
});

test('frame delivery measurement without tracing or screenshot capture',async({page})=>{
  await begin(page);await page.waitForTimeout(6000);const state=await snapshot(page);
  const data={environment:'Headless Chromium on this development computer. Mobile viewport emulation, not a physical phone.',browserVersion:page.context().browser()?.version(),viewport:page.viewportSize(),...state.metrics};
  writeFileSync(output+'/'+test.info().project.name+'-benchmark.json',JSON.stringify(data,null,2));expect(state.remaining).toBe(90);expect(state.guided).toBe(true);
});

test('orientation, safe areas, reduced motion and optional audio retain one canvas',async({page,context})=>{
  test.skip(test.info().project.name!=='portrait','Orientation is checked once.');
  await begin(page);await page.setViewportSize({width:844,height:390});await expect(page.locator('.pr-canvas canvas')).toHaveCount(1);
  await expect.poll(async()=>Math.round((await page.locator('.pr-canvas canvas').boundingBox())!.width)).toBeGreaterThan(800);
  await page.setViewportSize({width:390,height:844});
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:44,bottom:34,left:0,right:0}});
  await expect.poll(async()=>Math.round((await page.locator('.pr-topbar').boundingBox())!.height)).toBe(93);
  for(const name of ['Liikeohjain','Vuorovaikuta tai korjaa']){const box=await page.getByRole('button',{name,exact:true}).boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(810)}
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);await screenshot(page,'safe-area');
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,bottom:0,left:0,right:0}});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.pr-title-card').waitFor();
  expect(await page.locator('.pr-title-art>img').evaluate(element=>getComputedStyle(element).animationName)).toBe('none');await begin(page);
  await page.getByRole('button',{name:'Äänet päälle',exact:true}).click();await expect(page.getByRole('button',{name:'Mykistä',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Mykistä',exact:true}).click();await expect(page.getByRole('button',{name:'Äänet päälle',exact:true})).toBeVisible();
});

test('keyboard, simultaneous mobile touch, cancellation, pause and responsive layout',async({page,context})=>{
  await screenshot(page,'title');await begin(page);await expect(page.locator('.pr-tutorial strong')).toHaveText('Liiku putkimiehellä!');
  const before=await snapshot(page);await page.keyboard.down('d');await page.waitForFunction(()=>window.__PIPE_RESCUE__!.snapshot().player.x>250);await page.keyboard.up('d');
  expect((await snapshot(page)).player.x).toBeGreaterThan(before.player.x+30);await expect(page.locator('.pr-tutorial strong')).toHaveText('Sulje vesihana!');
  await page.keyboard.press('Escape');const paused=await snapshot(page);await page.waitForTimeout(600);expect((await snapshot(page)).remaining).toBe(paused.remaining);await page.getByRole('button',{name:'Jatka peliä'}).click();
  if(test.info().project.name!=='desktop'){
    const joystick=await page.getByRole('button',{name:'Liikeohjain',exact:true}).boundingBox(),action=await page.getByRole('button',{name:'Vuorovaikuta tai korjaa',exact:true}).boundingBox();
    const cdp=await context.newCDPSession(page),x=joystick!.x+joystick!.width/2,y=joystick!.y+joystick!.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+35,y,id:1},{x:action!.x+action!.width/2,y:action!.y+action!.height/2,id:2}]});
    await page.waitForTimeout(150);expect((await snapshot(page)).input.analog.x).toBeGreaterThan(.65);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(100);expect((await snapshot(page)).input.analog).toEqual({x:0,y:0});
  }
  await screenshot(page,'gameplay');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
});

async function playLevel(page:Page,guided:boolean){
  const level=(await snapshot(page)).level;
  for(const valve of level.valves||[level.valve]){await walkTo(page,valve);await page.keyboard.press('e')}
  expect((await snapshot(page)).valveClosed).toBe(true);
  if(guided)await expect(page.locator('.pr-tutorial strong')).toHaveText('Kerää työkalut!');
  for(const tool of level.tools)await walkTo(page,tool);expect((await snapshot(page)).collected.every(Boolean)).toBe(true);
  if(guided){await expect(page.locator('.pr-tutorial strong')).toHaveText('Siirrä laatikko!');await screenshot(page,'tutorial-crate')}
  const solution=solveLevel(level);expect(solution.solvable).toBe(true);
  for(const step of solution.plan){
    const state=await snapshot(page),d=DIRECTIONS[step.direction];await walkTo(page,{x:state.crate.x-d.x,y:state.crate.y-d.y});
    await page.keyboard.down(arrow[step.direction]);await page.waitForTimeout(45);await page.keyboard.up(arrow[step.direction]);await page.keyboard.press('Space');await page.waitForTimeout(260);
    expect((await snapshot(page)).crate).toEqual(step.crate);
  }
  expect((await snapshot(page)).gateOpen).toBe(true);if(guided){await expect(page.locator('.pr-tutorial strong')).toHaveText('Korjaa vuoto!');await screenshot(page,'door-open')}
  await walkTo(page,level.leak);await page.keyboard.press('e');await expect(page.locator('.pr-repair-panel')).toBeVisible();await screenshot(page,guided?'repair':'generated-repair');
  await expect(page.locator('.pr-pipe-cell.pr-highlight')).toHaveCount(0);
  await expect(page.locator('.pr-port')).toHaveCount(2);
  for(let index=0;index<(await snapshot(page)).puzzle.masks.length;index++)for(let i=0;i<4;i++){
    const state=await snapshot(page);if(state.phase==='won'||state.puzzle.masks[index]===state.puzzle.solved[index])break;await page.getByTestId('pipe-'+index).click();
  }
  await expect(page.getByRole('heading',{name:'Homma hoidettu!',exact:true})).toBeVisible();
}
test('interactive tutorial from movement to victory, next generated job and contact link',async({page})=>{
  await begin(page);await playLevel(page,true);expect((await snapshot(page)).remaining).toBe(90);await screenshot(page,'victory');
  await expect(page.getByRole('link',{name:'Ota yhteyttä',exact:true})).toHaveAttribute('href','/yhteystiedot/');
  await page.getByRole('button',{name:'Seuraava taso',exact:true}).click();await page.locator('.pr-intro-panel').waitFor();
  const state=await snapshot(page);expect(state.level.generation).toBeDefined();expect(state.workerUsed).toBe(true);
  await page.getByRole('button',{name:'Työhön!',exact:true}).click();await screenshot(page,'generated-gameplay');expect((await snapshot(page)).guided).toBe(false);
});

test('replay code, worker responsiveness, structural variation and generated-level completion',async({page})=>{
  test.skip(test.info().project.name!=='desktop','Stress and generated gameplay are checked once in browser.');
  const samples:Array<{seed:number;theme:string;hash:string;milliseconds:number;worker:boolean}>=[];
  await page.evaluate(()=>{const w=window as Window&{__rafTimes?:number[];__rafStop?:boolean};w.__rafTimes=[];const frame=(t:number)=>{w.__rafTimes!.push(t);if(!w.__rafStop)requestAnimationFrame(frame)};requestAnimationFrame(frame)});
  for(let i=0;i<12;i++){
    await page.getByRole('button',{name:i===0?'Asetukset ja kenttäkoodi':'Asetukset',exact:true}).click();
    await page.getByLabel('Pelaa kenttä koodilla').fill('KHT-'+(0xace000+i*391).toString(16)+'-D'+(i%12+1));
    await page.getByRole('button',{name:'Pelaa kenttä',exact:true}).click();await page.locator('.pr-intro-panel').waitFor();const state=await snapshot(page);
    samples.push({seed:state.level.seed!,theme:state.level.theme,hash:state.level.generation!.layoutHash,milliseconds:state.level.generation!.milliseconds,worker:state.workerUsed});
    await page.getByRole('button',{name:'Työhön!',exact:true}).click();
    await page.getByRole('button',{name:'Tauko',exact:true}).click();
  }
  const timing=await page.evaluate(()=>{const w=window as Window&{__rafTimes?:number[];__rafStop?:boolean};w.__rafStop=true;const values=w.__rafTimes!;return{frames:values.length,maxGapMs:Math.max(...values.slice(1).map((n,i)=>n-values[i])),durationMs:values.at(-1)!-values[0]}});
  writeFileSync('docs/game3-checks/worker-browser.json',JSON.stringify({samples,timing},null,2));
  expect(samples.every(s=>s.worker)).toBe(true);expect(new Set(samples.map(s=>s.hash)).size).toBe(12);expect(new Set(samples.map(s=>s.theme)).size).toBeGreaterThan(3);
  await page.getByRole('button',{name:'Asetukset',exact:true}).click();await page.getByLabel('Pelaa kenttä koodilla').fill('KHT-12345678-D6');await page.getByRole('button',{name:'Pelaa kenttä',exact:true}).click();await page.locator('.pr-intro-panel').waitFor();
  const first=(await snapshot(page)).level;await page.getByRole('button',{name:'Työhön!',exact:true}).click();await screenshot(page,'seeded-gameplay');
  await playLevel(page,false);await screenshot(page,'generated-victory');
  await page.getByRole('button',{name:'Pelaa uudelleen',exact:true}).click();expect((await snapshot(page)).level).toEqual(first);
  expect(new URL(page.url()).searchParams.get('seed')).toBe('12345678');
});

test('skip begins a real countdown, expiry loses and restart restores the same level',async({page})=>{
  test.skip(test.info().project.name!=='desktop','Real countdown checked once.');
  await begin(page);await page.getByRole('button',{name:'Ohita opastus',exact:true}).click();expect((await snapshot(page)).guided).toBe(false);
  await expect(page.getByRole('heading',{name:'Aika loppui!'})).toBeVisible({timeout:105000});await screenshot(page,'failure');
  await page.getByRole('button',{name:'Yritä uudelleen',exact:true}).click();const state=await snapshot(page);expect(state.phase).toBe('playing');expect(state.remaining).toBeGreaterThan(89);expect(state.guided).toBe(false);expect(state.collected).toEqual([false,false]);
});

test('unavailable worker yields a validated fallback and route navigation cleans up the scene',async({page})=>{
  test.skip(test.info().project.name!=='desktop','Worker failure checked once.');
  await page.route(/generation\.worker\.ts/,route=>route.abort());
  await page.getByRole('button',{name:'Osaan jo pelata',exact:true}).click();await page.locator('.pr-intro-panel').waitFor();
  const state=await snapshot(page);expect(state.workerUsed).toBe(false);expect(state.level.generation!.fallback).toBe(true);expect(solveLevel(state.level).solvable).toBe(true);
  await page.getByRole('button',{name:'Työhön!',exact:true}).click();await page.getByRole('link',{name:'Takaisin sivustolle'}).click();
  await expect(page.locator('.hero')).toBeVisible();expect(await page.evaluate(()=>typeof window.__PIPE_RESCUE__)).toBe('undefined');await expect(page.locator('.pr-canvas canvas')).toHaveCount(0);
  await page.goto('/peli/');await page.locator('.pr-title-card').waitFor();await expect(page.locator('.pr-canvas canvas')).toHaveCount(1);
});
