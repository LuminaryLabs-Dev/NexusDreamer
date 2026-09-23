export type StepStatus = 'draft'|'running'|'review'|'accepted'|'rejected'|'failed';
export type RunStatus = 'running'|'completed'|'failed'|'cancelled';

export interface Artifact { id:string; sha256:string; path:string; mimeType:string; }
export interface ChainStep {
  id:string; parentStepId:string|null; inputArtifactId:string; outputArtifactId?:string;
  instruction:string; runIds:string[]; status:StepStatus; createdAt:string; settings?:GenerateSettings;
}
export interface Chain { id:string; projectId:string; rootStepId:string; headStepId:string; createdAt:string; }
export interface InferenceRun {
  id:string; stepId:string; provider:string; model:string; inputArtifacts:string[];
  parameters:Record<string,unknown>; status:RunStatus; startedAt?:string; completedAt?:string;
  outputArtifactId?:string; error?:string;
}
export interface DreamerProject {
  schemaVersion:1; id:string; name:string; createdAt:string; updatedAt:string; activeChainId:string;
  chains:Record<string,Chain>; steps:Record<string,ChainStep>; runs:Record<string,InferenceRun>; artifacts:Record<string,Artifact>;
}
export interface DomainEvent<T=unknown> { id:string; type:string; timestamp:string; payload:T; }
export interface GenerateSettings {
  modelId:string; seed:number; steps:number; cfgScale:number; width:number; height:number; offloadToCpu:boolean;
}
export interface RuntimeStatus {
  platform:string; arch:string; cpus:number; totalMemoryGb:number; freeMemoryGb:number; dataRoot:string;
  backendPath:string|null; backendReady:boolean; modelReady:boolean; modelIssues:string[];
}
export type DreamerCommand =
  | {type:'project.create';name:string}
  | {type:'image.import';projectId:string;sourcePath:string}
  | {type:'chain.append-edit';projectId:string;chainId:string;instruction:string;settings:GenerateSettings}
  | {type:'step.run';projectId:string;stepId:string}
  | {type:'step.retry';projectId:string;stepId:string}
  | {type:'step.accept';projectId:string;stepId:string;runId:string}
  | {type:'step.reject';projectId:string;stepId:string}
  | {type:'chain.checkout';projectId:string;stepId:string}
  | {type:'chain.branch';projectId:string;stepId:string}
  | {type:'run.cancel';runId:string}
  | {type:'model.install';modelId:string};
export interface CommandResult<T=unknown> { ok:boolean; data?:T; error?:string; }
