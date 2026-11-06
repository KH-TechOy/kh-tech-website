import {describe,it,expect} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';
import {generateLevel,parseReplayCode,replayCode,MAX_GENERATION_ATTEMPTS,mixSeed} from './generator';
import {solveLevel,canPush,walkPath} from './solver';
import {createPuzzle,isPuzzleComplete} from './puzzle';
import {DIRECTIONS,sameCell,center} from './levels';
import {RescueModel} from './model';

describe('seeded procedural generation',()=>{
  it('replays layout and puzzles from the public seed code',()=>{const a=generateLevel(0x12345678,6),b=generateLevel(0x12345678,6);expect({...a,generation:undefined}).toEqual({...b,generation:undefined});expect(parseReplayCode(replayCode(a.seed!,6))).toEqual({seed:0x12345678,difficulty:6});expect(parseReplayCode('KHT-12345678-D99')).toBeNull()});
  it('validates deterministic fallbacks when generation attempts are disabled',()=>{for(let seed=0;seed<48;seed++){const level=generateLevel(seed,7,0);expect(level.generation!.fallback).toBe(true);expect(solveLevel(level).solvable).toBe(true)}});
  it('stress validates 1,000 different seeds with independent push certificate checks',()=>{
    const samples:number[]=[],layouts=new Set<string>(),themes=new Set<string>(),dimensions=new Set<string>(),stats={seeds:1000,fallbacks:0,maxStates:0,maxAttempts:0,multipleValves:0,extraTools:0,bonusObjectives:0};const start=performance.now();
    for(let i=0;i<1000;i++){
      const difficulty=[1,3,6,10,12][i%5],level=generateLevel(mixSeed(i,42),difficulty),solution=solveLevel(level);
      expect(solution.solvable,`seed ${level.seed} D${difficulty}: ${solution.reason}`).toBe(true);
      expect(level.generation!.attempts).toBeLessThanOrEqual(MAX_GENERATION_ATTEMPTS);
      expect(level.time).toBeGreaterThanOrEqual(Math.ceil(level.generation!.expectedSeconds*1.6+15));
      const model=new RescueModel(level);model.start();model.valveClosed=true;model.collected.fill(true);
      let player=level.start,crate=level.crate,open=false;
      for(const target of [...(level.valves||[level.valve]),...level.tools]){expect(walkPath(level,player,target,crate,open)).not.toBeNull();player=target}
      for(const step of solution.plan){const d=DIRECTIONS[step.direction];expect(walkPath(level,player,{x:crate.x-d.x,y:crate.y-d.y},crate,open)).not.toBeNull();expect(canPush(level,crate,step.direction,open)).toBe(true);player=crate;crate={x:crate.x+d.x,y:crate.y+d.y};expect(crate).toEqual(step.crate);model.player=center({x:player.x-d.x,y:player.y-d.y});model.update(.25,{x:0,y:0});expect(model.push(),'runtime safety permits certified push').toBe(true);expect(model.crate).toEqual(crate);open ||= sameCell(crate,level.plate)}
      expect(open).toBe(true);expect(walkPath(level,player,level.leak,crate,open)).not.toBeNull();const puzzle=createPuzzle(level.puzzleRows,mixSeed(level.seed!,23),level.puzzleColumns);puzzle.masks=[...puzzle.solved];expect(isPuzzleComplete(puzzle)).toBe(true);
      samples.push(level.generation!.milliseconds);layouts.add(level.generation!.layoutHash);themes.add(level.theme);dimensions.add(`${level.width}x${level.height}`);stats.fallbacks+=Number(level.generation!.fallback);stats.maxStates=Math.max(stats.maxStates,solution.states);stats.maxAttempts=Math.max(stats.maxAttempts,level.generation!.attempts);stats.multipleValves+=Number((level.valves||[]).length>1);stats.extraTools+=Number(level.tools.length>2);stats.bonusObjectives+=Number(!!level.bonus);
    }
    samples.sort((a,b)=>a-b);const report={...stats,uniqueStructuralLayouts:layouts.size,themes:[...themes].sort(),dimensions:[...dimensions].sort(),totalValidationMilliseconds:performance.now()-start,generationMedianMs:samples[500],generationP95Ms:samples[950],generationMaxMs:samples[999]};mkdirSync('docs/game22-checks',{recursive:true});writeFileSync('docs/game22-checks/generation-stress.json',JSON.stringify(report,null,2));console.log(report);
    expect(layouts.size).toBeGreaterThan(900);expect(themes.size).toBe(6);expect(stats.fallbacks).toBeLessThan(100);expect(stats.multipleValves).toBeGreaterThan(50);expect(stats.extraTools).toBeGreaterThan(100);expect(stats.bonusObjectives).toBeGreaterThan(50);
  },120000);
});
