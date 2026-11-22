import {test} from 'node:test';
import {readFileSync} from 'node:fs';
test('audit v539: visualizza asset WebP v537 nei log di sola verifica',()=>{
 const file=readFileSync(new URL('../img/effetti/effetti-reference-v537.webp',import.meta.url));
 const b64=file.toString('base64');
 const len=20000;
 console.log('AUDIT_WEBP_META:'+file.length+':'+b64.length);
 for(let i=0;i<b64.length;i+=len)
  console.log('AUDIT_WEBP_PART:'+String(i/len).padStart(4,'0')+':'+b64.slice(i,i+len));
 console.log('AUDIT_WEBP_END');
});
