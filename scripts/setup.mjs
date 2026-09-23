import os from 'node:os';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

function electronUserData(){
  if(process.platform==='win32')return path.join(process.env.APPDATA||path.join(os.homedir(),'AppData','Roaming'),'NexusDreamer');
  if(process.platform==='darwin')return path.join(os.homedir(),'Library','Application Support','NexusDreamer');
  return path.join(process.env.XDG_CONFIG_HOME||path.join(os.homedir(),'.config'),'NexusDreamer');
}

const root=path.join(electronUserData(),'NexusDreamer Data');
for(const d of ['models/diffusion','models/vae','models/textEncoder','models/vision','backend','projects','cache','outputs','logs'])await mkdir(path.join(root,d),{recursive:true});
console.log('Prepared '+root);
