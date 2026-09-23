import { describe, expect, it } from 'vitest';
import { validateProgram, type InferenceProgram } from '../src/ast/program';

describe('InferenceProgram',()=>{
  it('accepts the required execution spine',()=>{
    const program:InferenceProgram={version:1,nodes:[
      {type:'load-model',modelId:'m'},
      {type:'set-instruction',value:'add one small detail'},
      {type:'set-parameters',value:{modelId:'m',seed:1,steps:1,cfgScale:1,width:32,height:32,offloadToCpu:false}},
      {type:'generate'},
      {type:'save-artifact',path:'out.png'}
    ]};
    expect(()=>validateProgram(program)).not.toThrow();
  });
});
