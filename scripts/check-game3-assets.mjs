import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const atlas=JSON.parse(readFileSync('public/game2/v3/workshop-atlas.json','utf8'));
assert.equal(Object.keys(atlas.frames).length,28);
for(const [name,{frame}] of Object.entries(atlas.frames)){
  assert(frame.x>=0&&frame.y>=0&&frame.x+frame.w<=1536&&frame.y+frame.h<=1280,name+' outside atlas');
}
const brand={};
for(const [source,target] of [['docs/kh-tech-logo-musta.png','kh-tech-logo.png'],['docs/favicon-kh-tech.png','kh-tech-icon.png']]){
  const bytes=readFileSync(source);assert(bytes.equals(readFileSync('public/brand/'+target)));
  assert(bytes.equals(readFileSync('dist/brand/'+target)));brand[target]=hash(bytes);
}
const assets=readdirSync('public/game2/v3').map(name=>{const bytes=readFileSync('public/game2/v3/'+name);assert(bytes.equals(readFileSync('dist/game2/v3/'+name)));return{name,bytes:bytes.length,sha256:hash(bytes)}});
assert(!readFileSync('src/game2/engine.ts','utf8').includes("'guide-arrow'"));
assert(!readFileSync('src/game2/GamePage.tsx','utf8').includes('suggestedPiece'));
const crawl=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?crawl(dir+'/'+entry.name):[dir+'/'+entry.name]);
assert(!crawl('dist').some(path=>/character-reference|Putkimestari_|game3\/source/i.test(path)));
mkdirSync('docs/game3-checks',{recursive:true});
writeFileSync('docs/game3-checks/assets.json',JSON.stringify({frames:28,brand,totalBytes:assets.reduce((sum,a)=>sum+a.bytes,0),assets},null,2)+'\n');
console.log('GAME 3.0: 28 atlas frames, original brand bytes, source/public/dist checks passed.');
