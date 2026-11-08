import {catalog,enqueueReview} from '../review-store.js';
import {init,save,history,close} from '../db.js';
import {collectPrices,closeCollectors} from '../collectors.js';
import {mkdir,writeFile} from 'node:fs/promises';
await init();
const restaurants=await catalog();
const reviews=restaurants.filter(r=>!r.adapter).map(r=>({restaurant_id:r.id,source_url:r.url,reason:r.operatingStatus==='needs-confirmation'?'Current operation needs confirmation':'Collector, diameter or price needs verification'}));
try{
 for(const item of reviews){const shop=restaurants.find(s=>s.id===item.restaurant_id);if(shop.operatingStatus==='closed'||shop.priceAvailability==='not-offered'||shop.manualPricing)continue;await enqueueReview({kind:'coverage',...item,name:shop.name,address:shop.address});}
 const rows=await history();
 for(const shop of restaurants.filter(r=>r.adapter&&r.operatingStatus!=='closed')){
  const latest=rows.find(r=>r.restaurant_id===shop.id);
  if(!process.argv.includes('--force')&&latest&&Date.now()-new Date(latest.checked_at)<86400000)continue;
  const row={restaurant_id:shop.id,checked_at:new Date().toISOString(),cheese:null,topping:null,error:null};
  try{
   const collected=await collectPrices(shop);
   if(shop.manualPricing){
    const confirmed=rows.find(r=>r.restaurant_id===shop.id&&!r.error);
    if(shop.priceAvailability!=='not-offered'&&confirmed?.cheese===collected.cheese&&confirmed?.topping===collected.topping)continue;
    await enqueueReview({kind:'price-change',restaurant_id:shop.id,name:shop.name,address:shop.address,source_url:collected.source_url,reason:'Collector result for an owner-managed restaurant; review before replacing confirmed data',candidate:{cheese:collected.cheese,topping:collected.topping}});continue;
   }
   Object.assign(row,collected);console.log(`${shop.id}: collected ${row.source_type} prices`);
   if(collected.size_inches===null)await enqueueReview({kind:'diameter',restaurant_id:shop.id,name:shop.name,address:shop.address,source_url:collected.source_url,reason:'Cheese price found; diameter in inches needs confirmation',candidate:{cheese:collected.cheese,topping:collected.topping,size_label:collected.size_label}});
  }
  catch(e){
   row.error=e.message;
   if(e.code!=='REVIEW_REQUIRED')process.exitCode=1;
   reviews.push({restaurant_id:shop.id,checked_at:row.checked_at,reason:e.message,...e.review});
   await enqueueReview({kind:'collector',restaurant_id:shop.id,name:shop.name,address:shop.address,source_url:e.review?.source_url??shop.url,reason:e.message,...e.review});
   console.error(`${shop.id}: ${e.message}`);
  }
  if(!shop.manualPricing)await save(row);
 }
}finally{
 await mkdir('.local',{recursive:true});
 await writeFile('.local/collector-reviews.json',JSON.stringify(reviews,null,2));
 await closeCollectors();await close();
}
