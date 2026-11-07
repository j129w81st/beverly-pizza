import {restaurants} from '../data.js';
import {init,save,history,close} from '../db.js';
import {parsePrices} from '../prices.js';
await init();
try{
 const rows=await history();
 for(const shop of restaurants.filter(r=>r.adapter)){
  const latest=rows.find(r=>r.restaurant_id===shop.id);
  if(!process.argv.includes('--force')&&latest&&Date.now()-new Date(latest.checked_at)<7*86400000)continue;
  const row={restaurant_id:shop.id,checked_at:new Date().toISOString(),cheese:null,topping:null,error:null};
  try{const response=await fetch(shop.url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'BeverlyPizza/1.0 (public menu price check; weekly)'}});if(!response.ok)throw new Error(`Menu returned HTTP ${response.status}`);Object.assign(row,parsePrices(shop.adapter,await response.text()));}
  catch(e){row.error=e.message;console.error(`${shop.id}: ${e.message}`);}
  await save(row);
 }
}finally{await close();}
