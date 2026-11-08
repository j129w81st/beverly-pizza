import {mkdir,writeFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {restaurants} from '../data.js';
import {download} from '../collectors.js';

// These are discovery leads, never automatically published restaurants/prices.
const sources=['https://bevmain.org/explore/','https://www.restaurantji.com/ma/beverly/pizza/'];
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases=['Cafe Salerno',"Mikey's Famous Roastbeef And Pizza Beverly",'Cabot Pizza and Spanish food',"Domino's Pizza"].map(normalize);
const report={checked_at:new Date().toISOString(),completeCityInventory:false,sources:[],candidates:[]};
for(const source of sources){
 try{
  const response=await download(source),$=load(response.data.toString());$('script,style,nav,footer').remove();
  const candidates=new Map();
  $('h2,h3,h4,a[href]').each((i,element)=>{
   const name=$(element).text().replace(/\s+/g,' ').trim();
   if(name.length<4||name.length>85||!/pizza|pizzeria|tavern|pub|grill|burger|cucina|salerno|otto|sally|deli|kitchen|cafe|roast beef/i.test(name)||/best |review|menu|privacy|cookie|category|restaurants? in|restaurants? near|plans |vending/i.test(name))return;
   const normalized=normalize(name);
   if(aliases.includes(normalized)||restaurants.some(r=>normalize(r.name)===normalized))return;
   const href=$(element).attr('href');
   if(source.includes('restaurantji.com')){
    if(!href)return;
    const path=new URL(href,response.url).pathname;
    if(!/^\/ma\/beverly\/[^/]+\/$/.test(path)||path==='/ma/beverly/pizza/')return;
   }
   candidates.set(normalized,{name,source_url:source,lead_url:href?new URL(href,response.url).href:source,status:'unverified-lead',reason:'Verify Beverly address, current operation, pizza offering, and duplicate names before publishing'});
  });
  report.sources.push({url:source,status:'checked',leads:candidates.size});report.candidates.push(...candidates.values());
 }catch(error){report.sources.push({url:source,status:'failed',error:error.message});}
}
await mkdir('.local',{recursive:true});
await writeFile('.local/discovery-report.json',JSON.stringify(report,null,2));
console.log(`Discovery report: ${report.candidates.length} unverified leads; ${report.sources.filter(s=>s.status==='checked').length}/${sources.length} sources checked`);
if(report.sources.every(s=>s.status==='failed'))process.exitCode=1;
