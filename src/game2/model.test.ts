import { describe, it, expect } from 'vitest';
import { LEVELS, TUTORIAL_LEVEL, TILE, center } from './levels';
import { RescueModel, normalizeMovement, circleIntersectsRect, PLAYER_SPEED } from './model';
import { solveLevel, canPush } from './solver';
describe('continuous movement and collision',()=>{
  it('normalizes diagonals and applies a configurable joystick dead zone',()=>{const d=normalizeMovement(1,1);expect(Math.hypot(d.x,d.y)).toBeCloseTo(1);expect(d.x).toBeCloseTo(Math.SQRT1_2);expect(normalizeMovement(.05,0,.12)).toEqual({x:0,y:0});expect(normalizeMovement(.56,0,.12).x).toBeCloseTo(.5)});
  it('moves the same distance over different frame rates',()=>{const a=new RescueModel(LEVELS[0]),b=new RescueModel(LEVELS[0]);a.start();b.start();for(let i=0;i<60;i++)a.update(1/60,{x:1,y:0});for(let i=0;i<30;i++)b.update(1/30,{x:1,y:0});expect(a.player.x-b.player.x).toBeCloseTo(0);expect(a.player.x-center(LEVELS[0].start).x).toBeCloseTo(PLAYER_SPEED)});
  it('does not tunnel through walls during a slow frame',()=>{const model=new RescueModel(LEVELS[0]);model.start();model.update(3,{x:-1,y:0});expect(model.player.x).toBeGreaterThanOrEqual(TILE+15);expect(model.player.x).toBeLessThan(101)});
  it('checks the circle against rectangle corners',()=>{expect(circleIntersectsRect(9,9,4,10,10,20,20)).toBe(true);expect(circleIntersectsRect(0,0,4,10,10,20,20)).toBe(false)});
});
describe('gameplay state',()=>{
  it('operates the valve only when close',()=>{const model=new RescueModel(LEVELS[0]);model.start();model.interact();expect(model.valveClosed).toBe(false);model.player=center(model.level.valve);model.interact();expect(model.valveClosed).toBe(true)});
  it('collects each tool once and requires both for repair',()=>{const model=new RescueModel(LEVELS[0]);model.start();model.player=center(model.level.tools[0]);model.update(.1,{x:0,y:0});model.update(.1,{x:0,y:0});expect(model.collected).toEqual([true,false]);expect(model.drainEvents().filter(e=>e.type==='pickup')).toHaveLength(1);model.player=center(model.level.leak);model.valveClosed=true;model.interact();expect(model.phase).toBe('playing');model.collected[1]=true;model.gateOpen=true;model.interact();expect(model.phase).toBe('repair')});
  it('pushes grid-aligned boxes, opens the switch door, and supports undo',()=>{const model=new RescueModel(LEVELS[0]);model.start();model.player=center({x:7,y:4});model.facing='right';expect(model.push()).toBe(true);expect(model.crate).toEqual({x:9,y:4});model.update(.25,{x:0,y:0});model.player=center({x:8,y:4});expect(model.push()).toBe(true);expect(model.gateOpen).toBe(true);model.undoPush();expect(model.crate).toEqual({x:9,y:4});expect(model.gateOpen).toBe(true)});
  it('rejects pushes into walls or non-goal dead corners',()=>{expect(canPush(LEVELS[0],{x:2,y:1},'left',false)).toBe(false);expect(canPush(LEVELS[0],{x:1,y:1},'up',false)).toBe(false)});
  it('freezes countdown and movement while paused and resets on restart',()=>{const model=new RescueModel(LEVELS[0]);model.start();model.update(2,{x:1,y:0});const saved={...model.player};model.togglePause();model.update(20,{x:1,y:1});expect(model.remaining).toBe(88);expect(model.player).toEqual(saved);model.togglePause();model.update(1,{x:0,y:0});expect(model.remaining).toBe(87);model.restart();expect(model.remaining).toBe(90);expect(model.player).toEqual(center(model.level.start));expect(model.valveClosed).toBe(false)});
  it('counts down during repair and reaches a deterministic failure state',()=>{const model=new RescueModel(LEVELS[0]);model.phase='repair';model.update(91,{x:0,y:0});expect(model.remaining).toBe(0);expect(model.phase).toBe('lost');expect(model.drainEvents()).toContainEqual({type:'lost'})});
});
describe('complete level validation including pushing',()=>{
  for(const level of LEVELS)it(`validates ${level.id}: ${level.title}`,()=>{const result=solveLevel(level);expect(result.solvable).toBe(true);expect(result.plan.length).toBeGreaterThan(0);expect(result.plan[result.plan.length-1]?.crate).toEqual(level.plate)});
  it('detects an inaccessible pressure plate',()=>{const level={...LEVELS[0],plate:{x:0,y:0}};expect(solveLevel(level).solvable).toBe(false)});
});

describe('guided learning',()=>{
  it('blocks a non-corner deadlock along the closed gate wall',()=>{const model=new RescueModel(LEVELS[0]);model.start();model.player=center({x:8,y:3});expect(canPush(model.level,model.crate,'down',false)).toBe(true);expect(model.push()).toBe(false);expect(model.crate).toEqual(model.level.crate)});
  it('waits for movement, teaches objectives in order and freezes the tutorial clock',()=>{
    const model=new RescueModel(TUTORIAL_LEVEL);model.start();model.update(120,{x:0,y:0});expect(model.remaining).toBe(90);expect(model.tutorialStep).toBe(0);
    model.update(.2,{x:1,y:0});expect(model.tutorialStep).toBe(1);
    model.player=center(model.level.tools[0]);model.update(.1,{x:0,y:0});expect(model.collected[0]).toBe(false);
    model.player=center(model.level.valve);model.interact();expect(model.tutorialStep).toBe(2);
    expect(model.push()).toBe(false);
    for(const tool of model.level.tools){model.player=center(tool);model.update(.1,{x:0,y:0})}expect(model.tutorialStep).toBe(3);
    for(const step of solveLevel(model.level).plan){const direction={up:{x:0,y:-1},right:{x:1,y:0},down:{x:0,y:1},left:{x:-1,y:0}}[step.direction];model.player=center({x:model.crate.x-direction.x,y:model.crate.y-direction.y});model.update(.25,{x:0,y:0});expect(model.push()).toBe(true)}
    expect(model.tutorialStep).toBe(4);model.player=center(model.level.leak);model.interact();expect(model.phase).toBe('repair');model.update(120,{x:0,y:0});expect(model.remaining).toBe(90);
    for(let i=0;i<3;i++)model.rotatePiece(i);expect(model.tutorialStep).toBe(5);expect(model.phase).toBe('won');
  });
  it('starts a normal countdown when the player skips and retains the choice on restart',()=>{const model=new RescueModel(TUTORIAL_LEVEL);model.start();model.skipTutorial();model.update(3,{x:0,y:0});expect(model.remaining).toBe(87);model.restart();expect(model.guided).toBe(false);model.update(1,{x:0,y:0});expect(model.remaining).toBe(89)});
  it('requires every valve and every tool, with an optional five-second bonus',()=>{
    const level={...LEVELS[0],valves:[LEVELS[0].valve,{x:3,y:3}],tools:[...LEVELS[0].tools,{x:7,y:3}],bonus:{x:11,y:8}};
    const model=new RescueModel(level);model.start();model.player=center(level.valves[0]);model.interact();expect(model.valveClosed).toBe(false);model.player=center(level.valves[1]);model.interact();expect(model.valveClosed).toBe(true);
    for(const tool of level.tools){model.player=center(tool);model.update(.1,{x:0,y:0})}expect(model.collected).toEqual([true,true,true]);
    const remaining=model.remaining;model.player=center(level.bonus);model.update(.1,{x:0,y:0});expect(model.remaining).toBeCloseTo(remaining+4.9);model.update(.1,{x:0,y:0});expect(model.drainEvents().filter(event=>event.type==='bonus')).toHaveLength(1);
  });
});
