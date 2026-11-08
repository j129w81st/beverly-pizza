import {restaurants} from '../data.js';
import {init,save,history,close} from '../db.js';
import {collectPrices,closeCollectors} from '../collectors.js';
await init();
try{
 const rows=await history();
 for(const shop of restaurants.filter(r=>r.adapter)){
  const latest=rows.find(r=>r.restaurant_id===shop.id);
  if(!process.argv.includes('--force')&&latest&&Date.now()-new Date(latest.checked_at)<86400000)continue;
  const row={restaurant_id:shop.id,checked_at:new Date().toISOString(),cheese:null,topping:null,error:null};
  try{Object.assign(row,await collectPrices(shop));console.log(`${shop.id}: collected ${row.source_type} prices`);}
  catch(e){row.error=e.message;if(e.code!=='REVIEW_REQUIRED')process.exitCode=1;console.error(`${shop.id}: ${e.message}`);}
  await save(row);
 }
}finally{await closeCollectors();await close();}
