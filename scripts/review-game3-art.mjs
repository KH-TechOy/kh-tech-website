import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const image=name=>'data:image/webp;base64,'+readFileSync('public/game2/v3/'+name+'.webp').toString('base64');
const browser=await chromium.launch({headless:true,...(process.env.GAME_BROWSER_EXECUTABLE?{executablePath:process.env.GAME_BROWSER_EXECUTABLE}:{})});
try{
  const page=await browser.newPage({viewport:{width:1540,height:1270},deviceScaleFactor:1});
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:25px;background:#17283e;color:#e8f5ff;font:16px Arial}h1{font-size:24px}main{display:grid;grid-template-columns:590px 865px;gap:20px}h2{font-size:16px;color:#adcde1}img{object-fit:contain}aside{display:grid;grid-template-columns:240px 610px;align-items:start}.character{width:590px;height:787px}.mascot{width:240px;height:345px}.atlas{width:865px;height:721px}.portrait{width:100px;height:100px}.material{width:235px;height:180px}</style><h1>GAME 3.0 · Asset review · actual packed textures, not gameplay</h1><main><section><h2>Four directions · idle / left step / right step</h2><img class="character" src="${image('plumber-sheet')}"><h2>Floor / wall · generated painted material textures</h2><img class="material" src="${image('floor')}"><img class="material" src="${image('wall')}"></section><section><aside><img class="mascot" src="${image('mascot')}"><div><h2>Same mascot · original PNG brand layers</h2><img class="portrait" src="${image('portrait')}"><p>28 reusable atlas frames. Source PNGs remain editable;<br>packing and logo placement are reproducible in JavaScript.</p></div></aside><h2>Props / compatible plumbing / water</h2><img class="atlas" src="${image('workshop-atlas')}"></section></main>`);
  await page.evaluate(async()=>Promise.all([...document.images].map(image=>image.decode())));
  mkdirSync('docs/game3-screenshots',{recursive:true});await page.screenshot({path:'docs/game3-screenshots/asset-review.png'});
}finally{await browser.close()}
