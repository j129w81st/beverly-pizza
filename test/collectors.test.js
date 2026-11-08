import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {parseDocument,pdfText,collectPrices,closeCollectors} from '../collectors.js';

const regina=`800 Cummings Center Suite 147-R Beverly
CHEESE PIZZA Our Regina dough aged and proofed to perfection.
Topped with our spicy-sweet Original Regina Pizza sauce and Mozzarella 10” 12.50 16” 17.50
PEPPERONI PIZZA Our Regina dough, Original Regina Pizza sauce and Mozzarella.
Finished with sliced Pepperoni full of flavor with a balance of sweet, savory and spice 10” 15.75 16” 22`;
test('Regina PDF parser picks 16 inch prices rather than 10 inch',()=>assert.deepEqual(parseDocument('regina-pdf',regina),{cheese:1750,topping:2200}));
test('Regina rejects a menu for another location',()=>assert.throws(()=>parseDocument('regina-pdf',regina.replace('Beverly','Boston'))));
test('Regina rejects missing pepperoni rather than using a different pizza',()=>assert.throws(()=>parseDocument('regina-pdf',regina.replace('PEPPERONI PIZZA','BUFFALO CHICKEN'))));
test('Regina rejects a missing size rather than using a small pizza',()=>assert.throws(()=>parseDocument('regina-pdf',regina.replaceAll('16”','12”'))));
test('Giuseppe’s requires the Beverly location and explicit large topping charge',()=>assert.deepEqual(parseDocument('giuseppes-browser','Pizza - Pizza Menu Beverly Build Your Own Pizza | Large $19 Large $2 per topping Meats: Italian Sausage, Pepperoni, Meatballs'),{cheese:1900,topping:2100}));
test('Browser access challenges cannot become prices',()=>assert.throws(()=>parseDocument('giuseppes-browser','Performing security verification. $19')));
const nicks='207 Essex Street, Beverly, MA 01915 Pizza & Calzones Cheese SM - $10.00 LG - $12.99 Specialty Pizzas Meat Lovers SM - $15.00 LG - $20.00';
test('Nick’s reads the large cheese rather than small or specialty prices',()=>assert.deepEqual(parseDocument('nicks-browser',nicks),{cheese:1299,topping:null}));
test('Nick’s rejects another location and menus without a large price',()=>{
 assert.throws(()=>parseDocument('nicks-browser',nicks.replace('207 Essex Street','100 Main Street')));
 assert.throws(()=>parseDocument('nicks-browser',nicks.replace('LG - $12.99','')));
});
test('PDF collector rejects HTML responses',async()=>assert.rejects(pdfText(Buffer.from('<html>Access denied</html>')),/did not return a PDF/));

test('Ellie’s selects Large, waits for its topping charge and never adds to cart',{skip:!process.env.RUN_BROWSER_TESTS},async()=>{
 let cartRequests=0;
 const server=createServer((req,res)=>{
  if(req.url==='/cart'){cartRequests++;res.end('unexpected');return;}
  res.setHeader('Content-Type','text/html');
  res.end(`<body>728 Hale St, Beverly Farms, MA 01915
   <button data-name="Cheese Pizza_productContent" onclick="document.querySelector('[role=dialog]').hidden=false">Cheese Pizza</button>
   <div role="dialog" aria-label="Product modal for Cheese Pizza" hidden>
    <div role="radiogroup"><button role="radio" aria-checked="true">Small $9.95</button><button role="radio" aria-checked="false" onclick="setTimeout(()=>{this.setAttribute('aria-checked','true');document.querySelector('#extra').textContent='+$2.00';document.querySelector('#total').textContent='$16.99'},150)">Large $16.99</button></div>
    <button role="checkbox" aria-checked="false" onclick="this.setAttribute('aria-checked','true');document.querySelector('#total').textContent='$18.99'">Pepperoni <span id="extra">+$1.35</span></button>
    <button onclick="fetch('/cart',{method:'POST'})">Add to Order <span id="total">$9.95</span></button>
   </div></body>`);
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const result=await collectPrices({url:`http://127.0.0.1:${server.address().port}`,adapter:'ellies-browser',collector:{type:'browser',waitForText:'Cheese Pizza'}});
  assert.equal(result.cheese,1699);assert.equal(result.topping,1899);assert.equal(cartRequests,0);
 }finally{await closeCollectors();await new Promise(resolve=>server.close(resolve));}
});

// A real, minimal PDF generated in memory verifies the binary-to-text pipeline.
function makePdf(text){
 const stream=`BT /F1 12 Tf 20 700 Td (${text}) Tj ET`;
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 4000 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
 ];
 let result='%PDF-1.4\n';const offsets=[0];
 objects.forEach((value,i)=>{offsets.push(Buffer.byteLength(result));result+=`${i+1} 0 obj\n${value}\nendobj\n`;});
 const xref=Buffer.byteLength(result);
 result+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return Buffer.from(result);
}
test('PDF.js extracts text from actual PDF bytes',async()=>assert.match(await pdfText(makePdf('Beverly location menu with large cheese pizza and pepperoni prices')),/Beverly location menu/));
test('Scanned PDFs without text are flagged for OCR review',async()=>assert.rejects(pdfText(makePdf('')),/needs OCR review/));

test('PDF collector discovers the current link and records its source',async()=>{
 const pdf=makePdf(regina.replace(/[”“]/g,'"').replace(/\n/g,' '));
 const server=createServer((req,res)=>{
  if(req.url.endsWith('.pdf')){res.setHeader('Content-Type','application/pdf');res.end(pdf);}
  else res.end('<a href="/reg-beverly-menu-999.pdf">Menu</a>');
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  const result=await collectPrices({url,adapter:'regina-pdf',collector:{type:'pdf',linkPattern:'reg-beverly-menu-[0-9]+\\.pdf$'}});
  assert.equal(result.cheese,1750);assert.equal(result.topping,2200);
  assert.equal(result.source_url,url+'/reg-beverly-menu-999.pdf');
  assert.equal(result.source_type,'pdf');assert.match(result.source_sha256,/^[a-f0-9]{64}$/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('Browser collector handles pickup, waits for the large price, and rejects small-only menus',{skip:!process.env.RUN_BROWSER_TESTS},async()=>{
 let cartRequests=0;
 const server=createServer((req,res)=>{
  if(req.method!=='GET')cartRequests++;
  const small=req.url==='/small';
  const itemHtml=`<select id="OrderItem_SizeId"><option value="small">Small ($12.75)</option>${small?'':'<option value="large">Large ($18.00)</option>'}</select><button id="fake-cart">Add to Cart <span id="item-price-display">$12.75</span></button>`;
  res.setHeader('Content-Type','text/html');
  res.end(`<body>Panini Pizza Co <button onclick="document.querySelector('#defaultModal').style.display='block'">Create Your Own Pizza</button>
   <div id="defaultModal" style="display:none">5a Dodge St, Beverly, MA 01915
    <label onclick="this.dataset.selected='yes'">Carryout</label>
    <button id="update-settings-btn" onclick="showItem()">Update</button>
   </div><script>
   function showItem(){
    document.querySelector('#defaultModal').innerHTML=${JSON.stringify(itemHtml)};
    document.querySelector('#OrderItem_SizeId').addEventListener('change',()=>setTimeout(()=>document.querySelector('#item-price-display').textContent='$18.00',100));
    document.querySelector('#fake-cart').addEventListener('click',()=>fetch('/cart',{method:'POST'}));
   }
   </script></body>`);
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=`http://127.0.0.1:${server.address().port}`;
 const shop={url,adapter:'panini-browser',collector:{type:'browser',waitForText:'Create Your Own Pizza'}};
 try{
  const result=await collectPrices(shop);
  assert.equal(result.cheese,1800);assert.equal(result.topping,null);assert.equal(result.source_type,'browser');
  await assert.rejects(collectPrices({...shop,url:url+'/small'}),error=>error.code==='REVIEW_REQUIRED');
  assert.equal(cartRequests,0,'collector must never add items to the cart');
 }finally{await closeCollectors();await new Promise(resolve=>server.close(resolve));}
});
