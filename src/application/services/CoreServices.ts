import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Artifact, Chain, ChainStep, DreamerProject, GenerateSettings } from '../../shared/types.js';
import { id, now } from '../../domain/ids.js';
import { ProjectStore } from '../../infrastructure/persistence/ProjectStore.js';

export class ProjectService {
  constructor(private store:ProjectStore) {}
  async create(name:string):Promise<DreamerProject> {
    const projectId=id('project'), chainId=id('chain'), createdAt=now();
    const project:DreamerProject={schemaVersion:1,id:projectId,name:name.trim()||'Untitled Dream',createdAt,updatedAt:createdAt,activeChainId:chainId,chains:{},steps:{},runs:{},artifacts:{}};
    await this.store.save(project); return project;
  }
  load(projectId:string){ return this.store.load(projectId); }
  async save(project:DreamerProject){ project.updatedAt=now(); await this.store.save(project); }
}

export class ArtifactService {
  constructor(private store:ProjectStore) {}
  async import(projectId:string,sourcePath:string):Promise<Artifact> {
    const bytes=await readFile(sourcePath), sha256=createHash('sha256').update(bytes).digest('hex');
    const ext=path.extname(sourcePath).toLowerCase()||'.png', artifactId=id('artifact');
    const target=path.join(this.store.projectDir(projectId),'artifacts',artifactId+ext);
    await mkdir(path.dirname(target),{recursive:true}); await copyFile(sourcePath,target);
    return {id:artifactId,sha256,path:target,mimeType:ext==='.webp'?'image/webp':ext==='.jpg'||ext==='.jpeg'?'image/jpeg':'image/png'};
  }
}

export class ChainService {
  initialize(project:DreamerProject,inputArtifactId:string):Chain {
    const root:ChainStep={id:id('step'),parentStepId:null,inputArtifactId,outputArtifactId:inputArtifactId,instruction:'Imported source image',runIds:[],status:'accepted',createdAt:now()};
    const chain:Chain={id:project.activeChainId,projectId:project.id,rootStepId:root.id,headStepId:root.id,createdAt:now()};
    project.steps[root.id]=root; project.chains[chain.id]=chain; return chain;
  }
  append(project:DreamerProject,chainId:string,instruction:string,settings:GenerateSettings):ChainStep {
    const chain=project.chains[chainId]; if(!chain) throw new Error('Chain not found');
    const parent=project.steps[chain.headStepId], inputArtifactId=parent.outputArtifactId??parent.inputArtifactId;
    const step:ChainStep={id:id('step'),parentStepId:parent.id,inputArtifactId,instruction:instruction.trim(),runIds:[],status:'draft',createdAt:now(),settings};
    if(!step.instruction) throw new Error('Edit instruction is required');
    project.steps[step.id]=step; return step;
  }
  accept(project:DreamerProject,stepId:string,runId:string){
    const step=project.steps[stepId],run=project.runs[runId],chain=project.chains[project.activeChainId];
    if(!step||!run||!run.outputArtifactId) throw new Error('Completed run output is required');
    step.outputArtifactId=run.outputArtifactId; step.status='accepted'; chain.headStepId=step.id;
  }
  reject(project:DreamerProject,stepId:string){ const step=project.steps[stepId]; if(!step)throw new Error('Step not found'); step.status='rejected'; }
  checkout(project:DreamerProject,stepId:string){ if(!project.steps[stepId])throw new Error('Step not found'); project.chains[project.activeChainId].headStepId=stepId; }
  branch(project:DreamerProject,stepId:string):Chain {
    if(!project.steps[stepId])throw new Error('Step not found');
    const source=project.chains[project.activeChainId], branch:Chain={id:id('chain'),projectId:project.id,rootStepId:source.rootStepId,headStepId:stepId,createdAt:now()};
    project.chains[branch.id]=branch; project.activeChainId=branch.id; return branch;
  }
}
