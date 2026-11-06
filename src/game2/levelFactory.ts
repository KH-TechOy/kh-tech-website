import { generateLevel } from './generator';
import type { GenerationResponse } from './generation.worker';
import type { Level } from './levels';
export class LevelFactory {
  private worker:Worker|null=null;
  private next=0;
  private pending=new Map<number,{resolve:(value:Level)=>void;reject:(reason:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  disposed=false;
  usedWorker=false;
  async create(seed:number,difficulty:number):Promise<Level>{
    if(this.disposed)throw new Error('Level factory disposed');
    try{
      if(!this.worker){this.worker=new Worker(new URL('./generation.worker.ts',import.meta.url),{type:'module'});this.worker.onmessage=({data}:MessageEvent<GenerationResponse>)=>{const request=this.pending.get(data.id);if(!request)return;clearTimeout(request.timer);this.pending.delete(data.id);if(data.level)request.resolve(data.level);else request.reject(new Error(data.error||'Generation failed'))};this.worker.onerror=()=>this.rejectPending()}
      const id=++this.next;const result=await new Promise<Level>((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Generation timeout'))},6000);this.pending.set(id,{resolve,reject,timer});this.worker!.postMessage({id,seed,difficulty})});this.usedWorker=true;return result;
    }catch(error){if(this.disposed)throw error;await new Promise<void>(resolve=>setTimeout(resolve,0));this.usedWorker=false;return generateLevel(seed,difficulty,0)}
  }
  private rejectPending(){for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(new Error('Generation worker unavailable'))}this.pending.clear();this.worker?.terminate();this.worker=null}
  dispose(){this.disposed=true;this.rejectPending()}
}
