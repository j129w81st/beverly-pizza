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
// A city-boundary query broadens discovery beyond businesses labeled "pizza".
// OSM is incomplete and can be stale; every result still needs menu verification.
try{
 const query='[out:json][timeout:25];area["name"="Massachusetts"]["admin_level"="4"]->.state;rel(area.state)["name"="Beverly"]["boundary"="administrative"]["admin_level"="8"];map_to_area->.city;nwr(area.city)["amenity"~"restaurant|fast_food|cafe|bar|pub"];out center tags;';
 const endpoint=new URL('https://overpass-api.de/api/interpreter');endpoint.searchParams.set('data',query);
 const response=await fetch(endpoint,{headers:{Accept:'application/json','User-Agent':'BeverlyPizza/1.0'},signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error(`City map returned HTTP ${response.status}`);
 const data=await response.json();
 let leads=0;
 for(const element of data.elements??[]){
  const tags=element.tags??{},name=tags.name;if(!name)continue;
  const address=[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' ');
  const street=s=>normalize(s).replace(/street/g,'st').replace(/avenue/g,'ave');
  if(restaurants.some(r=>normalize(r.name)===normalize(name)||(address&&street(r.address)===street(address))))continue;
  report.candidates.push({name,address,cuisine:tags.cuisine??null,source_url:`https://www.openstreetmap.org/${element.type}/${element.id}`,lead_url:tags.website??tags['contact:website']??null,status:'unverified-food-venue',pizzaTagged:/pizza/i.test(tags.cuisine??'')||/pizza|pizzeria/i.test(name),reason:'City-map food venue: verify current operation, pizza offering and duplicates before publishing'});leads++;
 }
 report.sources.push({url:'https://www.openstreetmap.org/',status:'checked',foodVenues:data.elements?.length??0,leads,attribution:'© OpenStreetMap contributors; ODbL https://www.openstreetmap.org/copyright'});
}catch(error){report.sources.push({url:'https://www.openstreetmap.org/',status:'failed',error:error.message});}
await mkdir('.local',{recursive:true});
await writeFile('.local/discovery-report.json',JSON.stringify(report,null,2));
console.log(`Discovery report: ${report.candidates.length} unverified leads; ${report.sources.filter(s=>s.status==='checked').length}/${report.sources.length} sources checked`);
if(report.sources.every(s=>s.status==='failed'))process.exitCode=1;
