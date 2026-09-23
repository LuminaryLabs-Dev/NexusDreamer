import type { InferenceProgram } from '../../ast/program.js';
import { validateProgram } from '../../ast/program.js';

export interface ModelManifest {
  schemaVersion:1;
  id:string;
  name:string;
  provider:'stable-diffusion-cpp';
  capabilities:{generation:boolean;editing:boolean;references:boolean};
  files:Array<{key:'diffusion'|'vae'|'textEncoder'|'vision';repo:string;filename:string;remotePath?:string;required:boolean}>;
  resolvedFiles:{diffusion:string;vae:string;textEncoder:string;vision?:string};
}
export interface ExecutablePlan { executable:string; args:string[]; cwd:string; env:Record<string,string>; }

export function compileStableDiffusionCpp(program:InferenceProgram,manifest:ModelManifest,backendPath:string,cwd:string):ExecutablePlan {
  validateProgram(program);
  const params=program.nodes.find(n=>n.type==='set-parameters');
  const instruction=program.nodes.find(n=>n.type==='set-instruction');
  const image=program.nodes.find(n=>n.type==='load-image');
  const refs=program.nodes.filter(n=>n.type==='load-reference');
  const save=program.nodes.find(n=>n.type==='save-artifact');
  if(!params||params.type!=='set-parameters'||!instruction||instruction.type!=='set-instruction'||!save||save.type!=='save-artifact') throw new Error('Incomplete inference program');

  const args=['--diffusion-model',manifest.resolvedFiles.diffusion,'--vae',manifest.resolvedFiles.vae,'--llm',manifest.resolvedFiles.textEncoder];
  if(manifest.resolvedFiles.vision) args.push('--llm_vision',manifest.resolvedFiles.vision);
  if(image?.type==='load-image') args.push('-r',image.path);
  for(const ref of refs) if(ref.type==='load-reference') args.push('-r',ref.path);
  args.push('-p',instruction.value,'--cfg-scale',String(params.value.cfgScale),'--sampling-method','euler','--steps',String(params.value.steps),'--seed',String(params.value.seed),'-W',String(params.value.width),'-H',String(params.value.height),'-v');
  if(params.value.offloadToCpu) args.push('--offload-to-cpu');
  args.push('-o',save.path);
  return {executable:backendPath,args,cwd,env:{}};
}
