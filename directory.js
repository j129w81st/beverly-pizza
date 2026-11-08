import {restaurants} from './data.js';

export function directory(rows){
 return restaurants.map(shop=>{
  const all=rows.filter(r=>r.restaurant_id===shop.id),last=all[0];
  const valid=shop.operatingStatus==='needs-confirmation'?null:all.find(r=>!r.error);
  const status=shop.operatingStatus==='needs-confirmation'?'operation-review':last?.error?'review':valid?'verified':'pending';
  return {...shop,adapter:undefined,collector:undefined,url:valid?.source_url??shop.url,sourceType:valid?.source_type??null,collectionMethod:shop.collector?.type??(shop.adapter?'html':'manual'),cheese:valid?.cheese??null,topping:valid?.topping??null,verifiedAt:valid?.checked_at??null,checkedAt:last?.checked_at??null,status,issue:status==='operation-review'?'Current operation needs confirmation':last?.error??(!shop.adapter?'Menu size/prices need confirmation or a collector':'Awaiting collection'),history:all.filter(r=>!r.error).slice(0,12)};
 });
}

export function coverage(shops){
 return {total:shops.length,withCheese:shops.filter(s=>s.cheese!==null).length,withBothPrices:shops.filter(s=>s.cheese!==null&&s.topping!==null).length,automated:shops.filter(s=>s.collectionMethod!=='manual').length,operationReview:shops.filter(s=>s.status==='operation-review').length,completeCityInventory:false};
}

export function coverageCsv(shops){
 const columns=['Restaurant','Address','Size','Cheese price','One topping price','Method','Status','Last price check','Issue','Menu source'];
 const cell=value=>{
  let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
 };
 const rows=shops.map(s=>[s.name,s.address,s.size,s.cheese===null?'':(s.cheese/100).toFixed(2),s.topping===null?'':(s.topping/100).toFixed(2),s.collectionMethod,s.status,s.verifiedAt,s.status==='verified'?'':s.issue,s.url]);
 return [columns,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
