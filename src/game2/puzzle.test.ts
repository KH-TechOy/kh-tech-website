import { describe, it, expect } from 'vitest';
import { createPuzzle, rotateMask, isPuzzleComplete, N, E, S, W } from './puzzle';
import { RescueModel } from './model';
import { LEVELS, center } from './levels';
describe('pipe rotation puzzle',()=>{
  it('rotates each port clockwise with deterministic completion',()=>{expect(rotateMask(N|E)).toBe(E|S);expect(rotateMask(W|N)).toBe(N|E);for(let rows=1;rows<=3;rows++){const puzzle=createPuzzle(rows,42);expect(isPuzzleComplete(puzzle)).toBe(false);puzzle.masks=[...puzzle.solved];expect(isPuzzleComplete(puzzle)).toBe(true);puzzle.masks[0]=rotateMask(puzzle.masks[0]);expect(isPuzzleComplete(puzzle)).toBe(false)}});
  it('uses a repeatable scramble for each seed',()=>expect(createPuzzle(3,123)).toEqual(createPuzzle(3,123)));
  it('plays one complete level through the repair action to victory',()=>{const model=new RescueModel(LEVELS[0]);model.start();model.valveClosed=true;model.gateOpen=true;model.collected=[true,true];model.player=center(model.level.leak);model.interact();expect(model.phase).toBe('repair');model.puzzle.masks.forEach((_,index)=>{for(let turns=0;model.puzzle.masks[index]!==model.puzzle.solved[index]&&turns<4;turns++)model.rotatePiece(index)});expect(model.phase).toBe('won');expect(model.drainEvents().some(event=>event.type==='win')).toBe(true)});
});
