import {Router} from 'express';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {catalog,reviewQueue,enqueueReview,decideReview} from './review-store.js';
import {preparePublication} from './review-model.js';
import {history} from './db.js';
import {directory} from './directory.js';

const digest=value=>createHash('sha256').update(value).digest();
const equal=(a,b)=>timingSafeEqual(digest(a),digest(b));
export function adminRouter({password=process.env.ADMIN_PASSWORD,production=process.env.NODE_ENV==='production',clock=()=>Date.now()}={}){
 const router=Router(),attempts=new Map(),sessions=new Map();
 const configured=typeof password==='string'&&password.length>=16;
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');next();});
 router.use((req,res,next)=>{
  if(!configured)return res.status(503).json({error:'Admin is locked. Set ADMIN_PASSWORD to at least 16 characters in Render Environment, then redeploy.'});
  if(req.method!=='GET'){
   // Browser mutations must originate from this app; JSON blocks HTML form CSRF.
   const origin=req.get('origin');
   if(!req.is('application/json')||!origin||!['http:','https:'].some(protocol=>origin===`${protocol}//${req.get('host')}`))return res.status(403).json({error:'Use this app’s admin page to make changes'});
  }
  next();
 });
 router.post('/login',(req,res)=>{
  const now=clock(),key=req.ip;
  for(const [ip,record] of attempts)if(record.until<now)attempts.delete(ip);
  const record=attempts.get(key)??{count:0,until:now+15*60000};
  if(record.count>=8)return res.status(429).json({error:'Too many attempts. Try again in 15 minutes.'});
  record.count++;attempts.set(key,record);
  if(typeof req.body?.password!=='string'||!equal(req.body.password,password))return res.status(401).json({error:'Incorrect admin password'});
  attempts.delete(key);
  for(const [token,expiry] of sessions)if(expiry<now)sessions.delete(token);
  if(sessions.size>=100)sessions.delete(sessions.keys().next().value);
  const token=randomBytes(32).toString('base64url');sessions.set(token,now+8*3600000);
  res.cookie('beverly_admin',token,{httpOnly:true,secure:production,sameSite:'strict',path:'/api/admin',maxAge:8*3600000});
  res.json({ok:true});
 });
 router.use((req,res,next)=>{
  const token=(req.headers.cookie??'').split(';').map(c=>c.trim()).find(c=>c.startsWith('beverly_admin='))?.slice('beverly_admin='.length);
  if(!token||(sessions.get(token)??0)<clock())return res.status(401).json({error:'Please sign in'});
  req.adminToken=token;next();
 });
 router.post('/logout',(req,res)=>{sessions.delete(req.adminToken);res.clearCookie('beverly_admin',{path:'/api/admin',httpOnly:true,secure:production,sameSite:'strict'});res.json({ok:true});});
 router.get('/reviews',async(req,res,next)=>{
  try{const shops=await catalog();res.json({reviews:await reviewQueue(),shops:directory(await history(),shops),catalog:shops});}catch(e){next(e);}
 });
 router.post('/reviews',async(req,res,next)=>{
  try{
   const shops=await catalog(),input=req.body;
   // Validate before staging a manually entered candidate. Staging never publishes.
   const proposal=preparePublication(input,shops);
   const review=await enqueueReview({kind:'manual',restaurant_id:proposal.id,name:proposal.shop.name,address:proposal.shop.address,source_url:proposal.source_url,reason:'Owner-submitted verification awaiting publication',candidate:input});
   res.status(201).json({review});
  }catch(e){next(e);}
 });
 router.post('/reviews/:id/:action',async(req,res,next)=>{
  try{
   if(!/^[a-f0-9-]{36}$/.test(req.params.id)||!['approve','reject'].includes(req.params.action))return res.status(400).json({error:'Invalid review action'});
   const publication=req.params.action==='approve'?preparePublication(req.body,await catalog()):{reason:typeof req.body?.reason==='string'?req.body.reason.slice(0,1000):'Rejected by owner'};
   await decideReview(req.params.id,req.params.action,publication);res.json({ok:true});
  }catch(e){next(e);}
 });
 return router;
}
