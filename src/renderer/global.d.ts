import type { CommandResult, DomainEvent, DreamerCommand, RuntimeStatus } from '../shared/types';
declare global {
  interface Window {
    nexusDreamer:{
      execute(command:DreamerCommand):Promise<CommandResult>;
      runtime():Promise<RuntimeStatus>;
      pickImage():Promise<string|null>;
      imageData(filePath:string):Promise<string>;
      onEvent(listener:(event:DomainEvent)=>void):()=>void;
    };
  }
}
export {};
