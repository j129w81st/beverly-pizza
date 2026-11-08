import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createCanvas} from '@napi-rs/canvas';
import {extractPdf,collectPrices} from '../collectors.js';

function scannedPdf(){
 const canvas=createCanvas(1800,600),ctx=canvas.getContext('2d');
 ctx.fillStyle='white';ctx.fillRect(0,0,1800,600);ctx.fillStyle='black';ctx.font='36px sans-serif';
 ['800 Cummings Center Beverly','CHEESE PIZZA','Our Regina dough 10" 12.50 16" 17.50','PEPPERONI PIZZA','Our Regina dough 10" 15.75 16" 22.00'].forEach((line,i)=>ctx.fillText(line,40,70+i*85));
 const image=canvas.toBuffer('image/jpeg');
 const content=Buffer.from('q 900 0 0 300 0 0 cm /Im0 Do Q');
 const objects=[
  Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
  Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
  Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 900 300] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'),
  Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1800 /Height 600 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),image,Buffer.from('\nendstream')]),
  Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`),content,Buffer.from('\nendstream')])
 ];
 const chunks=[Buffer.from('%PDF-1.4\n')],offsets=[];
 for(const [index,object]of objects.entries()){
  offsets.push(chunks.reduce((n,b)=>n+b.length,0));chunks.push(Buffer.from(`${index+1} 0 obj\n`),object,Buffer.from('\nendobj\n'));
 }
 const xref=chunks.reduce((n,b)=>n+b.length,0);
 chunks.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
 return Buffer.concat(chunks);
}

test('Scanned PDF renders into OCR text and becomes a review candidate, never published',{skip:!process.env.RUN_OCR_TESTS,timeout:120000},async()=>{
 const pdf=scannedPdf();
 const result=await extractPdf(pdf,{ocr:true});
 assert.equal(result.method,'ocr');assert.match(result.text,/Beverly/);assert.match(result.text,/17\.50/);assert.ok(result.confidence>0);
 const server=createServer((req,res)=>{if(req.url.endsWith('.pdf')){res.setHeader('Content-Type','application/pdf');res.end(pdf);}else res.end('<a href="/menu.pdf">Menu</a>');});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  await assert.rejects(collectPrices({id:'regina',url:`http://127.0.0.1:${server.address().port}`,adapter:'regina-pdf',collector:{type:'pdf',ocr:true,linkPattern:'/menu\\.pdf$'}}),error=>{
   assert.equal(error.code,'REVIEW_REQUIRED');assert.equal(error.review.restaurant_id,'regina');assert.ok(error.review.source_url.endsWith('/menu.pdf'));assert.ok(error.review.confidence>0);return true;
  });
 }finally{await new Promise(resolve=>server.close(resolve));}
});
