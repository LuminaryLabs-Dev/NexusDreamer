import { existsSync } from 'node:fs';

const required=['dist/main/main.js','dist/preload/preload.js','dist/renderer/index.html','data/models/qwen-image-2.1-q4km.json'];
let failed=false;
for(const file of required){
  const ok=existsSync(file);
  console.log((ok?'PASS ':'FAIL ')+file);
  if(!ok)failed=true;
}
if(failed)process.exit(1);
console.log('PASS build contract');
