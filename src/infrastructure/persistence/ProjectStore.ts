import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DomainEvent, DreamerProject } from '../../shared/types.js';

export class ProjectStore {
  constructor(private readonly projectsRoot:string) {}
  projectDir(projectId:string) { return path.join(this.projectsRoot, projectId); }
  async ensure(projectId:string) {
    const root = this.projectDir(projectId);
    await Promise.all(['steps','runs','artifacts','references','events'].map(p=>mkdir(path.join(root,p),{recursive:true})));
  }
  async save(project:DreamerProject) {
    await this.ensure(project.id);
    await writeFile(path.join(this.projectDir(project.id),'project.json'), JSON.stringify(project,null,2));
  }
  async load(projectId:string):Promise<DreamerProject> {
    return JSON.parse(await readFile(path.join(this.projectDir(projectId),'project.json'),'utf8')) as DreamerProject;
  }
  async appendEvent(projectId:string,event:DomainEvent) {
    await this.ensure(projectId);
    await appendFile(path.join(this.projectDir(projectId),'events','events.ndjson'), JSON.stringify(event)+'\n');
  }
}
