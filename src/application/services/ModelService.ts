import { access, mkdir, readFile, rename, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ModelManifest } from '../../providers/stable-diffusion-cpp/compiler.js';

export interface DownloadProgress { key:string; filename:string; received:number; total?:number; }

export class ModelService {
  constructor(private appRoot:string,private dataRoot:string) {}
  async manifest(modelId='qwen-image-2.1-q4km'):Promise<ModelManifest> {
    const raw=JSON.parse(await readFile(path.join(this.appRoot,'data','models',modelId+'.json'),'utf8')) as Omit<ModelManifest,'resolvedFiles'>;
    const resolvedFiles=Object.fromEntries(raw.files.map(f=>[f.key,path.join(this.dataRoot,'models',f.key,f.filename)]));
    return {...raw,resolvedFiles} as ModelManifest;
  }
  async verify(modelId?:string):Promise<string[]> {
    const manifest=await this.manifest(modelId), issues:string[]=[];
    for(const file of manifest.files.filter(f=>f.required)){ try{await access(manifest.resolvedFiles[file.key]);}catch{issues.push(`Missing ${file.key}: ${file.filename}`);} }
    return issues;
  }
  async install(modelId='qwen-image-2.1-q4km',progress?:(p:DownloadProgress)=>void) {
    const manifest=await this.manifest(modelId);
    for(const file of manifest.files.filter(f=>f.required)) {
      const target=manifest.resolvedFiles[file.key];
      try{await access(target);continue;}catch{}
      await mkdir(path.dirname(target),{recursive:true});
      const partial=target+'.part'; let offset=0; try{offset=(await stat(partial)).size;}catch{}
      const remotePath=file.remotePath??file.filename, url=`https://huggingface.co/${file.repo}/resolve/main/${remotePath}`;
      const response:any=await fetch(url,{redirect:'follow',headers:offset>0?{Range:`bytes=${offset}-`}:{}});
      if(!response.ok) throw new Error(`Download failed for ${file.filename}: HTTP ${response.status}`);
      const append=offset>0&&response.status===206; if(!append)offset=0;
      const contentLength=Number(response.headers.get('content-length')??0), total=contentLength?contentLength+offset:undefined;
      const stream=createWriteStream(partial,{flags:append?'a':'w'}); let received=offset; const source:any=Readable.fromWeb(response.body);
      source.on('data',(chunk:Buffer)=>{received+=chunk.length;progress?.({key:file.key,filename:file.filename,received,total});});
      await new Promise<void>((resolve,reject)=>{source.on('error',reject);stream.on('error',reject);stream.on('finish',resolve);source.pipe(stream);});
      await rename(partial,target);
    }
  }
}
