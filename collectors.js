import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';
import {parsePrices} from './prices.js';

const MAX_BYTES=16*1024*1024;
export class ReviewRequiredError extends Error {code='REVIEW_REQUIRED';}
export async function download(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'BeverlyPizza/1.0 (public menu price check)'}});
 if(!response.ok)throw new Error(`Menu returned HTTP ${response.status}`);
 if(Number(response.headers.get('content-length'))>MAX_BYTES)throw new Error('Menu exceeds 16 MB limit');
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>MAX_BYTES)throw new Error('Menu exceeds 16 MB limit');chunks.push(chunk);}
 return {data:Buffer.concat(chunks),url:response.url};
}

export async function extractPdf(data,{ocr=false}={}){
 if(Buffer.from(data).subarray(0,5).toString()!=='%PDF-')throw new Error('Menu link did not return a PDF');
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:new Uint8Array(data),isEvalSupported:false,stopAtErrors:true,standardFontDataUrl:fileURLToPath(new URL('standard_fonts/',import.meta.resolve('pdfjs-dist/package.json')))});
 try{
  const pdf=await task.promise;
  if(pdf.numPages>20)throw new Error('PDF exceeds 20-page menu limit');
  const pages=[],scanned=[];
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i),content=await page.getTextContent();
   const text=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('');
   pages.push(text);
   if(ocr&&text.trim().length<40){
    if(scanned.length>=4)throw new ReviewRequiredError('Scanned PDF exceeds four-page OCR review limit');
    const natural=page.getViewport({scale:1});
    const scale=Math.min(2,Math.sqrt(10000000/(natural.width*natural.height)));
    const viewport=page.getViewport({scale});
    const {createCanvas}=await import('@napi-rs/canvas');
    const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await page.render({canvasContext:canvas.getContext('2d'),viewport,canvas}).promise;
    scanned.push({index:i-1,image:canvas.toBuffer('image/png')});
   }
  }
  let confidence=null;
  if(scanned.length){
   const {recognizeMenuImages}=await import('./ocr.js');
   const results=await recognizeMenuImages(scanned.map(p=>p.image));
   results.forEach((result,index)=>{pages[scanned[index].index]=result.text;});
   confidence=Math.min(...results.map(result=>result.confidence));
  }
  const text=pages.join('\n\n');
  if(text.trim().length<40)throw new Error('PDF has no usable text; scanned menu needs OCR review');
  return {text,method:scanned.length?'ocr':'text',confidence};
 }finally{await task.destroy();}
}
export async function pdfText(data){return (await extractPdf(data)).text;}

let browserPromise;
async function browserPage(url,waitForText,adapter){
 if(!browserPromise){const {chromium}=await import('playwright');browserPromise=chromium.launch();}
 const browser=await browserPromise;
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 try{
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  if(response&&!response.ok()){
   if([401,403,429].includes(response.status()))throw new ReviewRequiredError(`Browser menu requires access verification (HTTP ${response.status()})`);
   throw new Error(`Browser menu returned HTTP ${response.status()}`);
  }
  if(waitForText)await page.getByText(new RegExp(waitForText,'i')).first().waitFor({state:'visible',timeout:20000});
  const prices=adapter==='panini-browser'?await paniniOptions(page):undefined;
  const text=await page.locator('body').innerText();
  if(/verify you are human|access denied|checking your browser|just a moment|performing security verification/i.test(text.slice(0,1000)))throw new ReviewRequiredError('Browser menu requires access verification');
  return {text,prices,url:page.url()};
 }finally{await context.close();}
}

async function paniniOptions(page){
 const body=await page.locator('body').innerText();
 if(!/Panini Pizza Co/i.test(body))throw new Error('Unexpected restaurant on browser menu');
 await page.getByText('Create Your Own Pizza',{exact:true}).first().click();
 const dialog=page.locator('#defaultModal');
 await dialog.waitFor({state:'visible'});
 const pickup=dialog.locator('label').filter({hasText:'Carryout'});
 if(await pickup.count()){
  if(!/5a Dodge St, Beverly, MA 01915/i.test(await dialog.innerText()))throw new Error('Pickup menu is not the Beverly location');
  await pickup.click();
  await dialog.locator('#update-settings-btn').click();
 }
 const size=dialog.locator('#OrderItem_SizeId');
 await size.waitFor({state:'visible'});
 const options=await size.locator('option').evaluateAll(es=>es.map(e=>({label:e.textContent,value:e.value})));
 const large=options.filter(o=>/^Large\b/i.test(o.label.trim()));
 if(large.length!==1)throw new ReviewRequiredError('Browser menu does not offer one unambiguous Large pizza size');
 await size.selectOption(large[0].value);
 const expected=large[0].label.match(/\$(\d+\.\d{2})/)?.[1];
 if(!expected)throw new Error('Large size has no explicit price');
 await page.waitForFunction(value=>document.querySelector('#item-price-display')?.textContent.trim()==='$'+value,expected,{timeout:10000});
 const cheese=Math.round(Number(expected)*100);
 // Read the large base without adding anything to the cart. The current menu
 // does not expose a confirmed whole-pizza pepperoni rate; leave it unknown.
 return validatePrices({cheese,topping:null});
}

function validatePrices(result){
 if(!Number.isFinite(result.cheese)||result.cheese<500||result.cheese>10000||(result.topping!==null&&(!Number.isFinite(result.topping)||result.topping<result.cheese||result.topping>15000)))throw new Error('Price outside expected range; review required');
 return result;
}
export async function closeCollectors(){
 const pending=browserPromise;browserPromise=undefined;
 if(pending){try{await(await pending).close();}catch{/* A failed launch has no browser to close. */}}
}

export function parseDocument(adapter,text){
 const normalized=text.replace(/\s+/g,' ').trim();
 let cheese,topping;
 if(adapter==='regina-pdf'){
  if(!/800 Cummings Center/i.test(normalized)||!/Beverly/i.test(normalized))throw new Error('PDF is not the Beverly location menu');
  const section=normalized.match(/CHEESE PIZZA\s+Our Regina dough[\s\S]{0,260}?10[”"“]\s+(\d+(?:\.\d{1,2})?)\s+16[”"“]\s+(\d+(?:\.\d{1,2})?)(?=\s|$)/);
  const pepperoni=normalized.match(/PEPPERONI PIZZA\s+Our Regina dough[\s\S]{0,260}?10[”"“]\s+(\d+(?:\.\d{1,2})?)\s+16[”"“]\s+(\d+(?:\.\d{1,2})?)(?=\s|$)/);
  cheese=section?.[2];topping=pepperoni?.[2];
 }else if(adapter==='giuseppes-browser'){
  if(!/Pizza\s*-\s*Pizza Menu\s+Beverly/i.test(normalized))throw new Error('Browser menu is not the Beverly pizza menu');
  const match=normalized.match(/Build Your Own Pizza\s*\|\s*Large\s+\$(\d+(?:\.\d{1,2})?)\s+Large\s+\$(\d+(?:\.\d{1,2})?)\s+per topping\s+Meats:[^:]{0,100}Pepperoni/i);
  if(match){cheese=match[1];topping=Number(cheese)+Number(match[2]);}
 }
 if(cheese===undefined||topping===undefined)throw new Error('Menu format needs review; no unambiguous large prices');
 const result={cheese:Math.round(Number(cheese)*100),topping:Math.round(Number(topping)*100)};
 return validatePrices(result);
}

export async function collectPrices(shop){
 const config=shop.collector??{type:'html'};
 let text,url,prices;
 if(config.type==='pdf'){
  const landing=await download(shop.url),$=load(landing.data.toString());
  const links=$('a[href]').toArray().map(a=>new URL($(a).attr('href'),landing.url).href).filter(h=>new RegExp(config.linkPattern).test(h));
  const unique=[...new Set(links)];
  if(unique.length!==1)throw new Error('Expected exactly one location-specific PDF menu link');
  const pdf=await download(unique[0]);url=pdf.url;
  const extracted=await extractPdf(pdf.data,{ocr:config.ocr===true});text=extracted.text;
  if(extracted.method==='ocr'){
   let candidate=null;
   try{candidate=parseDocument(shop.adapter,text);}catch{/* An uncertain OCR result must not become a published price. */}
   const review=new ReviewRequiredError('Scanned menu read with OCR; price verification required');
   review.review={restaurant_id:shop.id,source_url:url,confidence:extracted.confidence,candidate,excerpt:text.slice(0,700)};
   throw review;
  }
  prices=parseDocument(shop.adapter,text);
 }else if(config.type==='browser'){
  const page=await browserPage(config.url??shop.url,config.waitForText,shop.adapter);url=page.url;text=page.text;prices=page.prices??parseDocument(shop.adapter,text);
 }else{
  const page=await download(shop.url);url=page.url;text=page.data.toString();prices=parsePrices(shop.adapter,text);
 }
 return {...prices,source_url:url,source_type:config.type,source_sha256:createHash('sha256').update(text).digest('hex')};
}
