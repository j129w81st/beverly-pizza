import express from 'express';
import {restaurants} from './data.js';
import {init,history} from './db.js';
await init();
const app=express();app.disable('x-powered-by');
app.get('/health',async(req,res,next)=>{try{await history();res.json({ok:true});}catch(e){next(e);}});
app.get('/api/restaurants',async(req,res,next)=>{
 try{const rows=await history();res.json(restaurants.map(shop=>{
  const all=rows.filter(r=>r.restaurant_id===shop.id),last=all[0],valid=all.find(r=>!r.error);
  return {...shop,adapter:undefined,cheese:valid?.cheese??null,topping:valid?.topping??null,verifiedAt:valid?.checked_at??null,checkedAt:last?.checked_at??null,status:last?.error?'review':valid?'verified':'pending',history:all.filter(r=>!r.error).slice(0,12)};
 }));}catch(e){next(e);}
});
app.use(express.static('public'));
app.use((err,req,res,next)=>{console.error(err.message);res.status(500).json({error:'Service temporarily unavailable'});});
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Beverly Pizza is ready'));
