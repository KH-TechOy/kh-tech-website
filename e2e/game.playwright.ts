import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LEVELS, TILE, center, DIRECTIONS, type Cell, type Direction } from '../src/game2/levels';
import { solveLevel, walkPath } from '../src/game2/solver';
const output='docs/game2-screenshots';mkdirSync(output,{recursive:true});
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

test('frame delivery measurement without tracing or screenshot capture',async({page})=>{await begin(page);await page.waitForTimeout(6000);const state=await snapshot(page);const data={environment:'Headless Chromium on the development computer; actual graphics implementation is recorded below. Mobile viewport emulation, not a physical phone.',browserVersion:page.context().browser()?.version(),viewport:page.viewportSize(),...state.metrics};console.log(JSON.stringify(data));writeFileSync(`${output}/${test.info().project.name}-benchmark-${state.metrics.renderer.toLowerCase()}.json`,JSON.stringify(data,null,2));expect(state.remaining).toBeLessThan(85);expect(state.remaining).toBeGreaterThan(81)});

test('orientation changes, reduced motion and opt-in sound keep one game instance',async({page,context})=>{
  test.skip(test.info().project.name!=='portrait','One live orientation / preference check is sufficient.');
  await begin(page);await page.setViewportSize({width:844,height:390});await expect(page.locator('.pr-canvas canvas')).toHaveCount(1);await expect.poll(async()=>Math.round((await page.locator('.pr-canvas canvas').boundingBox())!.width)).toBeGreaterThan(800);
  await page.setViewportSize({width:390,height:844});await expect.poll(async()=>Math.round((await page.locator('.pr-canvas canvas').boundingBox())!.width)).toBeLessThan(390);await expect(page.locator('.pr-canvas canvas')).toHaveCount(1);
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:44,bottom:34,left:0,right:0}});await expect.poll(async()=>Math.round((await page.locator('.pr-topbar').boundingBox())!.height)).toBe(93);const joystick=await page.getByRole('button',{name:'Liikeohjain',exact:true}).boundingBox();expect(joystick!.y+joystick!.height).toBeLessThan(810);const action=await page.getByRole('button',{name:'Vuorovaikuta tai korjaa',exact:true}).boundingBox();expect(action!.y+action!.height).toBeLessThanOrEqual(810);expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);await screenshot(page,'safe-area');await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,bottom:0,left:0,right:0}});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.pr-title-card').waitFor();expect(await page.locator('.pr-title-art>img').evaluate(element=>getComputedStyle(element).animationName)).toBe('none');await begin(page);await expect(page.getByRole('button',{name:'Äänet päälle',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Äänet päälle',exact:true}).click();await expect(page.getByRole('button',{name:'Mykistä',exact:true})).toBeVisible();await page.getByRole('button',{name:'Mykistä',exact:true}).click();await expect(page.getByRole('button',{name:'Äänet päälle',exact:true})).toBeVisible();
});

test('title, controls, pointer cancellation and responsive layout',async({page,context})=>{
  await screenshot(page,'title');await begin(page);const before=await snapshot(page);await page.keyboard.down('d');await page.waitForFunction(()=>window.__PIPE_RESCUE__!.snapshot().player.x>230);await page.keyboard.up('d');expect((await snapshot(page)).player.x).toBeGreaterThan(before.player.x+30);
  await page.keyboard.press('Escape');const paused=await snapshot(page);await page.waitForTimeout(600);expect((await snapshot(page)).remaining).toBe(paused.remaining);await page.getByRole('button',{name:'Jatka peliä'}).click();
  if(test.info().project.name!=='desktop'){
    const joystick=await page.getByRole('button',{name:'Liikeohjain',exact:true}).boundingBox(),action=await page.getByRole('button',{name:'Vuorovaikuta tai korjaa',exact:true}).boundingBox();expect(joystick).not.toBeNull();expect(action).not.toBeNull();const cdp=await context.newCDPSession(page),x=joystick!.x+joystick!.width/2,y=joystick!.y+joystick!.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+35,y,id:1},{x:action!.x+action!.width/2,y:action!.y+action!.height/2,id:2}]});await page.waitForTimeout(150);expect((await snapshot(page)).input.analog.x).toBeGreaterThan(.65);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(100);expect((await snapshot(page)).input.analog).toEqual({x:0,y:0});
  }
  await screenshot(page,'gameplay');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
});

test('tutorial played with keyboard and pipe puzzle clicks from start to victory',async({page})=>{
  await begin(page);await walkTo(page,LEVELS[0].valve);await page.keyboard.press('e');expect((await snapshot(page)).valveClosed).toBe(true);
  const solution=solveLevel(LEVELS[0]);expect(solution.solvable).toBe(true);
  for(const step of solution.plan){const state=await snapshot(page),d=DIRECTIONS[step.direction];await walkTo(page,{x:state.crate.x-d.x,y:state.crate.y-d.y});await page.keyboard.down(arrow[step.direction]);await page.waitForTimeout(45);await page.keyboard.up(arrow[step.direction]);await page.keyboard.press('Space');await page.waitForTimeout(260)}
  expect((await snapshot(page)).gateOpen).toBe(true);await screenshot(page,'door-open');
  for(const tool of LEVELS[0].tools)await walkTo(page,tool);expect((await snapshot(page)).collected).toEqual([true,true]);await walkTo(page,LEVELS[0].leak);await page.keyboard.press('e');await expect(page.getByRole('heading',{name:'Yhdistä putket!'})).toBeVisible();await screenshot(page,'repair');
  for(let index=0;index<(await snapshot(page)).puzzle.masks.length;index++){for(let i=0;i<4;i++){const state=await snapshot(page);if(state.phase==='won'||state.puzzle.masks[index]===state.puzzle.solved[index])break;await page.getByTestId(`pipe-${index}`).click()}}
  await expect(page.getByRole('heading',{name:'Vuoto pysäytetty!'})).toBeVisible();await screenshot(page,'victory');const metrics=(await snapshot(page)).metrics;writeFileSync(`${output}/${test.info().project.name}-performance.json`,JSON.stringify({environment:'Headless Chromium on the development computer; mobile viewport emulation, not a physical phone',viewport:page.viewportSize(),...metrics},null,2));
  await page.getByRole('button',{name:'Seuraava kohde'}).click();await expect(page.getByRole('heading',{name:LEVELS[1].title})).toBeVisible();
});

test('real countdown reaches failure and restart restores the tutorial',async({page})=>{
  test.skip(test.info().project.name!=='desktop','Countdown is covered once in the browser and in pure model tests.');
  await begin(page);await expect(page.getByRole('heading',{name:'Aika loppui!'})).toBeVisible({timeout:105000});await screenshot(page,'failure');await page.getByRole('button',{name:'Yritä uudelleen',exact:true}).click();const state=await snapshot(page);expect(state.phase).toBe('playing');expect(state.remaining).toBeGreaterThan(89);expect(state.valveClosed).toBe(false);expect(state.collected).toEqual([false,false]);
});
