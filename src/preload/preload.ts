import { contextBridge, ipcRenderer } from 'electron';
import type { DomainEvent, DreamerCommand } from '../shared/types.js';

contextBridge.exposeInMainWorld('nexusDreamer',{
  execute:(command:DreamerCommand)=>ipcRenderer.invoke('dreamer:command',command),
  runtime:()=>ipcRenderer.invoke('dreamer:runtime'),
  pickImage:()=>ipcRenderer.invoke('dreamer:pick-image'),
  imageData:(filePath:string)=>ipcRenderer.invoke('dreamer:image-data',filePath),
  onEvent:(listener:(event:DomainEvent)=>void)=>{const wrapped=(_:Electron.IpcRendererEvent,event:DomainEvent)=>listener(event);ipcRenderer.on('dreamer:event',wrapped);return()=>ipcRenderer.removeListener('dreamer:event',wrapped);}
});
