import { generateLevel } from './generator';
import type { Level } from './levels';
export type GenerationRequest={id:number;seed:number;difficulty:number};
export type GenerationResponse={id:number;level?:Level;error?:string};
const scope=self as unknown as {onmessage:((event:MessageEvent<GenerationRequest>)=>void)|null;postMessage:(message:GenerationResponse)=>void};
scope.onmessage=({data})=>{try{scope.postMessage({id:data.id,level:generateLevel(data.seed,data.difficulty)})}catch(error){scope.postMessage({id:data.id,error:error instanceof Error?error.message:'Generation failed'})}};
