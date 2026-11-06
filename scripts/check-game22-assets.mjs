import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const logos=[];
for(const [source,target] of [['docs/kh-tech-logo-musta.png','brand/kh-tech-logo.png'],['docs/favicon-kh-tech.png','brand/kh-tech-icon.png']]){
  const original=await readFile(source),published=await readFile('public/'+target),built=await readFile('dist/'+target);
  assert(original.equals(published)&&original.equals(built),'Official branding must be copied verbatim');
  logos.push({source,target,sha256:digest(original),bytes:original.length});
}
const svgNames=(await readdir('public/game2')).filter(name=>name.endsWith('.svg'));
const svgText=await Promise.all(svgNames.map(name=>readFile('public/game2/'+name,'utf8')));
for(const name of ['mascot','plumber-sheet','toolbox','brand-sign']){
  const text=await readFile('public/game2/'+name+'.svg','utf8');
  assert(text.includes((await readFile('docs/kh-tech-logo-musta.png')).toString('base64')),'Branded SVG must embed original PNG');
}
assert(!svgText.some(text=>/character-reference|data:image\/jpe?g/i.test(text)),'Private photo must not be embedded');
async function files(root){const entries=await readdir(root,{withFileTypes:true});return(await Promise.all(entries.map(entry=>entry.isDirectory()?files(root+'/'+entry.name):[root+'/'+entry.name]))).flat()}
assert(!(await files('dist')).some(name=>/character-reference|putkimestari_? ?2\.png/i.test(name)),'Reference materials do not belong in production');
await mkdir('docs/game22-checks',{recursive:true});
await writeFile('docs/game22-checks/assets.json',JSON.stringify({logos,originalSvgAssets:svgNames.length,referencePhotoEmbedded:false,referenceMaterialsInDist:false},null,2));
console.log('Official PNG bytes preserved; '+svgNames.length+' original SVG assets; reference materials excluded from dist.');
