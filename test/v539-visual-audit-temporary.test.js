import {test} from 'node:test';
import {spawnSync,execFileSync} from 'node:child_process';
test('audit v539: verifica visiva reale immagini reference',()=>{
 const tools=spawnSync('bash',['-lc','command -v ffmpeg || true; command -v convert || true; command -v magick || true; python3 -c "import PIL; print(PIL.__version__)" 2>&1 || true'],{encoding:'utf8'});
 console.log('DIAGNOSTIC_TOOLS',tools.stdout,tools.stderr);
 for(const p of ['img/effetti/effetti-reference-v537.webp','img/effetti/reference-approvata-v537.png']){
   const width=p.includes('.webp')?690:720;
   const run=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-i',p,'-vf','scale='+width+':-2','-frames:v','1','-q:v','9','-f','image2pipe','-vcodec','mjpeg','pipe:1'],{maxBuffer:15000000,timeout:18000});
   if(run.status!==0){console.log('IMAGE_ERR:'+p+':'+String(run.error?.message||run.stderr).slice(0,800));continue;}
   const base=run.stdout.toString('base64');
   console.log('IMAGE_DIAGNOSTIC:'+p+':'+base);
   console.log('IMAGE_SIZE:'+p+':'+run.stdout.length);
 }
});
