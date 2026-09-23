import type { CommandResult, DreamerCommand } from '../../shared/types.js';
import { id, now } from '../../domain/ids.js';
import { EventBus } from './EventBus.js';
import { ProjectService, ArtifactService, ChainService } from './CoreServices.js';
import { ModelService } from './ModelService.js';
import { InferenceService } from './InferenceService.js';

export class CommandBus {
  constructor(private projects:ProjectService,private chains:ChainService,private artifacts:ArtifactService,private inference:InferenceService,private events:EventBus,private models:ModelService){}
  private async emit(projectId:string,type:string,payload:Record<string,unknown>={}) {
    await this.events.publish({id:id('event'),type,timestamp:now(),payload:{projectId,...payload}});
  }
  async execute(command:DreamerCommand):Promise<CommandResult> {
    try {
      if(command.type==='project.create'){const project=await this.projects.create(command.name);await this.emit(project.id,'project.created');return{ok:true,data:project};}
      if(command.type==='run.cancel')return{ok:this.inference.cancel(command.runId),data:{runId:command.runId}};
      if(command.type==='model.install'){await this.models.install(command.modelId,p=>void this.events.publish({id:id('event'),type:'model.download-progress',timestamp:now(),payload:p}));return{ok:true,data:{modelId:command.modelId}};}
      const project=await this.projects.load(command.projectId);
      if(command.type==='image.import'){const artifact=await this.artifacts.import(project.id,command.sourcePath);project.artifacts[artifact.id]=artifact;const chain=this.chains.initialize(project,artifact.id);await this.projects.save(project);await this.emit(project.id,'artifact.created',{artifact});await this.emit(project.id,'chain.created',{chain});return{ok:true,data:project};}
      if(command.type==='chain.append-edit'){const step=this.chains.append(project,command.chainId,command.instruction,command.settings);await this.projects.save(project);await this.emit(project.id,'step.created',{step});return{ok:true,data:{project,step}};}
      if(command.type==='step.run'||command.type==='step.retry'){
        const step=project.steps[command.stepId];if(!step)throw new Error('Step not found');const input=project.artifacts[step.inputArtifactId];if(!input)throw new Error('Input artifact missing');
        try{const result=await this.inference.run(project,step.id,input.path,step.instruction,step.settings!);const artifact=await this.artifacts.import(project.id,result.outputPath);project.artifacts[artifact.id]=artifact;result.run.outputArtifactId=artifact.id;await this.projects.save(project);return{ok:true,data:{project,run:result.run,artifact}};}
        catch(error){await this.projects.save(project);throw error;}
      }
      if(command.type==='step.accept'){this.chains.accept(project,command.stepId,command.runId);await this.projects.save(project);await this.emit(project.id,'step.accepted',{stepId:command.stepId,runId:command.runId});return{ok:true,data:project};}
      if(command.type==='step.reject'){this.chains.reject(project,command.stepId);await this.projects.save(project);await this.emit(project.id,'step.rejected',{stepId:command.stepId});return{ok:true,data:project};}
      if(command.type==='chain.checkout'){this.chains.checkout(project,command.stepId);await this.projects.save(project);await this.emit(project.id,'chain.head-changed',{stepId:command.stepId});return{ok:true,data:project};}
      if(command.type==='chain.branch'){const branch=this.chains.branch(project,command.stepId);await this.projects.save(project);await this.emit(project.id,'chain.branched',{stepId:command.stepId,chainId:branch.id});return{ok:true,data:project};}
      return{ok:false,error:'Unsupported command'};
    } catch(error){return{ok:false,error:error instanceof Error?error.message:String(error)};}
  }
}
