import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { DreamerProject, GenerateSettings, InferenceRun } from '../../shared/types.js';
import type { InferenceProgram } from '../../ast/program.js';
import { id, now } from '../../domain/ids.js';
import { compileStableDiffusionCpp } from '../../providers/stable-diffusion-cpp/compiler.js';
import { ModelService } from './ModelService.js';
import { EventBus } from './EventBus.js';

export class InferenceService {
  private processes=new Map<string,ChildProcessWithoutNullStreams>();
  constructor(private dataRoot:string,private backendPath:()=>string|null,private models:ModelService,private events:EventBus){}
  buildProgram(inputPath:string,instruction:string,outputPath:string,settings:GenerateSettings):InferenceProgram {
    return {version:1,nodes:[{type:'load-model',modelId:settings.modelId},{type:'load-image',path:inputPath},{type:'set-instruction',value:instruction},{type:'set-parameters',value:settings},{type:'generate'},{type:'save-artifact',path:outputPath}]};
  }
  async run(project:DreamerProject,stepId:string,inputPath:string,instruction:string,settings:GenerateSettings) {
    const backend=this.backendPath(); if(!backend)throw new Error('stable-diffusion.cpp backend is not installed. Set NEXUS_DREAMER_SD_CLI.');
    const issues=await this.models.verify(settings.modelId); if(issues.length)throw new Error(issues.join('; '));
    const runId=id('run'),runDir=path.join(this.dataRoot,'cache','runs',runId); await mkdir(runDir,{recursive:true}); const outputPath=path.join(runDir,'output.png');
    const run:InferenceRun={id:runId,stepId,provider:'stable-diffusion-cpp',model:settings.modelId,inputArtifacts:[project.steps[stepId].inputArtifactId],parameters:settings,status:'running',startedAt:now()};
    project.runs[runId]=run; project.steps[stepId].runIds.push(runId); project.steps[stepId].status='running';
    const manifest=await this.models.manifest(settings.modelId),program=this.buildProgram(inputPath,instruction,outputPath,settings),plan=compileStableDiffusionCpp(program,manifest,backend,runDir);
    await this.events.publish({id:id('event'),type:'run.started',timestamp:now(),payload:{projectId:project.id,stepId,runId,program}});
    try {
      await new Promise<void>((resolve,reject)=>{
        const child=spawn(plan.executable,plan.args,{cwd:plan.cwd,env:{...process.env,...plan.env}}); this.processes.set(runId,child);
        const onData=async(chunk:Buffer)=>{const m=chunk.toString().match(/(\d+)\s*\/\s*(\d+)/);if(m)await this.events.publish({id:id('event'),type:'run.progress',timestamp:now(),payload:{projectId:project.id,runId,current:Number(m[1]),total:Number(m[2])}});};
        child.stdout.on('data',onData);child.stderr.on('data',onData);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`sd-cli exited with code ${code}`)));
      });
      run.status='completed';run.completedAt=now();project.steps[stepId].status='review';
      await this.events.publish({id:id('event'),type:'run.completed',timestamp:now(),payload:{projectId:project.id,stepId,runId,outputPath}});
      return {run,outputPath};
    } catch(error) {
      run.status='failed';run.completedAt=now();run.error=error instanceof Error?error.message:String(error);project.steps[stepId].status='failed';
      await this.events.publish({id:id('event'),type:'run.failed',timestamp:now(),payload:{projectId:project.id,stepId,runId,error:run.error}});
      throw error;
    } finally { this.processes.delete(runId); }
  }
  cancel(runId:string){const p=this.processes.get(runId);if(!p)return false;p.kill();return true;}
}
