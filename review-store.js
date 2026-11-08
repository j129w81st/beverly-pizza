import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {pool,dataDir} from './db.js';
import {restaurants} from './data.js';
import {diameterInches} from './pizza-size.js';

async function localState(){
 try{return JSON.parse(await readFile(`${dataDir}/admin.json`,'utf8'));}
 catch(e){if(e.code==='ENOENT')return {catalog:{},reviews:[],observations:[]};throw e;}
}
let localLock=Promise.resolve();
function mutate(fn){
 const operation=localLock.then(async()=>{const state=await localState(),result=await fn(state);await writeFile(`${dataDir}/admin.tmp`,JSON.stringify(state));await rename(`${dataDir}/admin.tmp`,`${dataDir}/admin.json`);return result;});
 localLock=operation.catch(()=>{});return operation;
}
export async function catalog(){
 const overrides=pool?(await pool.query('SELECT id,payload FROM beverly_pizza.catalog')).rows.map(r=>({id:r.id,...r.payload})):Object.entries((await localState()).catalog).map(([id,payload])=>({id,...payload}));
 const combined=new Map(restaurants.map(r=>[r.id,{...r}]));
 for(const item of overrides)combined.set(item.id,{...combined.get(item.id),...item});
 return [...combined.values()];
}
export async function enqueueReview(payload){
 // Dates and run IDs are not part of identity: repeated failures remain one item.
 const fingerprint=createHash('sha256').update(JSON.stringify([payload.kind,payload.restaurant_id??payload.name,payload.address??'',payload.source_url??'',payload.reason??'',payload.candidate??null])).digest('hex');
 const id=randomUUID();
 if(pool){
  const result=await pool.query(`INSERT INTO beverly_pizza.reviews(id,fingerprint,payload) VALUES($1,$2,$3)
   ON CONFLICT(fingerprint) DO UPDATE SET last_seen_at=NOW(),payload=CASE WHEN beverly_pizza.reviews.status='pending' THEN EXCLUDED.payload ELSE beverly_pizza.reviews.payload END RETURNING *`,[id,fingerprint,payload]);
  return result.rows[0];
 }
 return mutate(state=>{
  const found=state.reviews.find(r=>r.fingerprint===fingerprint),now=new Date().toISOString();
  if(found){found.last_seen_at=now;if(found.status==='pending')found.payload=payload;return found;}
  const row={id,fingerprint,payload,status:'pending',created_at:now,last_seen_at:now};state.reviews.unshift(row);return row;
 });
}
export async function reviewQueue(){
 if(pool)return (await pool.query("SELECT * FROM beverly_pizza.reviews ORDER BY (status='pending') DESC,created_at DESC LIMIT 500")).rows;
 return (await localState()).reviews.slice(0,500);
}
export async function decideReview(id,action,publication){
 const apply=(review)=>{
  if(!review)throw Object.assign(new Error('Review not found'),{status:404});
  if(review.status!=='pending')throw Object.assign(new Error('This review has already been decided'),{status:409});
  const now=new Date().toISOString();
  const observation=action==='approve'&&publication.cheese!==null?{
   restaurant_id:publication.id,checked_at:now,cheese:publication.cheese,topping:publication.topping,
   error:null,source_url:publication.source_url,source_type:'manual',source_sha256:null,size_label:publication.shop.size,size_inches:diameterInches(publication.shop.size)
  }:null;
  return {observation,now};
 };
 if(pool){
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const review=(await client.query('SELECT * FROM beverly_pizza.reviews WHERE id=$1 FOR UPDATE',[id])).rows[0];
   const {observation,now}=apply(review);
   if(action==='approve')await client.query(`INSERT INTO beverly_pizza.catalog(id,payload) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()`,[publication.id,publication.shop]);
   if(observation)await client.query(`INSERT INTO beverly_pizza.observations(restaurant_id,checked_at,cheese,topping,error,source_url,source_type,size_label,size_inches) VALUES($1,$2,$3,$4,NULL,$5,'manual',$6,$7)`,[observation.restaurant_id,now,observation.cheese,observation.topping,observation.source_url,observation.size_label,observation.size_inches]);
   await client.query('UPDATE beverly_pizza.reviews SET status=$2,decided_at=$3,decision=$4 WHERE id=$1',[id,action==='approve'?'approved':'rejected',now,publication]);
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }else await mutate(state=>{
  const review=state.reviews.find(r=>r.id===id),{observation,now}=apply(review);
  if(action==='approve')state.catalog[publication.id]=publication.shop;
  if(observation)state.observations.unshift(observation);
  Object.assign(review,{status:action==='approve'?'approved':'rejected',decided_at:now,decision:publication});
 });
}
