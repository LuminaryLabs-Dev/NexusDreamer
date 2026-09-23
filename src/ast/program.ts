import type { GenerateSettings } from '../shared/types.js';

export type InferenceNode =
  | {type:'load-model';modelId:string}
  | {type:'load-image';path:string}
  | {type:'load-reference';path:string}
  | {type:'set-instruction';value:string}
  | {type:'set-parameters';value:GenerateSettings}
  | {type:'generate'}
  | {type:'save-artifact';path:string};

export interface InferenceProgram { version:1; nodes:InferenceNode[]; }

export function validateProgram(program:InferenceProgram):void {
  const types = new Set(program.nodes.map(n=>n.type));
  for (const required of ['load-model','set-instruction','set-parameters','generate','save-artifact']) {
    if (!types.has(required as InferenceNode['type'])) throw new Error(`Inference AST missing node: ${required}`);
  }
}
