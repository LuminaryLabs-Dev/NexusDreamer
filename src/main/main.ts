import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import os from 'node:os';
import path from 'node:path';
import { access, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { DreamerCommand, RuntimeStatus } from '../shared/types.js';
import { ProjectStore } from '../infrastructure/persistence/ProjectStore.js';
import { ProjectService, ArtifactService, ChainService } from '../application/services/CoreServices.js';
import { EventBus } from '../application/services/EventBus.js';
import { ModelService } from '../application/services/ModelService.js';
import { InferenceService } from '../application/services/InferenceService.js';
import { CommandBus } from '../application/services/CommandBus.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const appRoot=path.resolve(__dirname,'..','..');
let windowRef:BrowserWindow|null=null;

async function bootstrap(){
  const dataRoot=path.join(app.getPath('userData'),'NexusDreamer Data');
  await Promise.all(['projects','models/diffusion','models/vae','models/textEncoder','models/vision','backend','cache','outputs','logs'].map(p=>mkdir(path.join(dataRoot,p),{recursive:true})));
  const store=new ProjectStore(path.join(dataRoot,'projects')),events=new EventBus(),projects=new ProjectService(store),chains=new ChainService(),artifacts=new ArtifactService(store),models=new ModelService(appRoot,dataRoot);
  const backend=process.env.NEXUS_DREAMER_SD_CLI??null;
  const inference=new InferenceService(dataRoot,()=>backend,models,events),commands=new CommandBus(projects,chains,artifacts,inference,events,models);

  events.subscribe(async event=>{windowRef?.webContents.send('dreamer:event',event);const projectId=(event.payload as {projectId?:string})?.projectId;if(projectId)await store.appendEvent(projectId,event);});
  ipcMain.handle('dreamer:command',(_e,command:DreamerCommand)=>commands.execute(command));
  ipcMain.handle('dreamer:pick-image',async()=>{const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']}]});return r.canceled?null:r.filePaths[0];});
  ipcMain.handle('dreamer:image-data',async(_e,filePath:string)=>{const bytes=await readFile(filePath),ext=path.extname(filePath).toLowerCase(),mime=ext==='.webp'?'image/webp':ext==='.jpg'||ext==='.jpeg'?'image/jpeg':'image/png';return `data:${mime};base64,${bytes.toString('base64')}`;});
  ipcMain.handle('dreamer:runtime',async():Promise<RuntimeStatus>=>{let backendReady=false;if(backend){try{await access(backend);backendReady=true;}catch{}}const modelIssues=await models.verify().catch(e=>[String(e)]);return{platform:process.platform,arch:process.arch,cpus:os.cpus().length,totalMemoryGb:+(os.totalmem()/2**30).toFixed(1),freeMemoryGb:+(os.freemem()/2**30).toFixed(1),dataRoot,backendPath:backend,backendReady,modelReady:modelIssues.length===0,modelIssues};});

  windowRef=new BrowserWindow({width:1460,height:900,minWidth:1000,minHeight:680,backgroundColor:'#0b0d10',webPreferences:{contextIsolation:true,nodeIntegration:false,preload:path.join(__dirname,'..','preload','preload.js')}});
  if(!app.isPackaged)await windowRef.loadURL('http://127.0.0.1:5173');else await windowRef.loadFile(path.join(appRoot,'dist','renderer','index.html'));
}

app.whenReady().then(bootstrap);
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)void bootstrap();});
