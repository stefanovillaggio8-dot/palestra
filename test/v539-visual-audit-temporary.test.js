import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
test('audit strumenti per pulizia fotografia sorgente',()=>{
 for(const args of [
 ['-c','from PIL import Image; print("PIL_OK",Image.__version__)'],
 ['-c','import numpy as np; print("NUMPY_OK",np.__version__)']]){
   const p=spawnSync('python3',args,{encoding:'utf8',timeout:12000});
   console.log('PY_CHECK',p.status,String(p.stdout).trim(),String(p.stderr).slice(0,250),p.error?.message||'');
 }
});
