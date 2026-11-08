// Runs only from the isolated test runner, never with the production DATABASE_URL.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
process.env.BEVERLY_DATA_DIR=await mkdtemp(`${tmpdir()}/beverly-admin-test-`);
const {init,close,pool,history}=await import('../db.js');
const {enqueueReview,catalog}=await import('../review-store.js');
const {createApp}=await import('../server-app.js');
if(pool){
 // These public API roles already exist in Supabase; create them in the CI DB.
 await pool.query("DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$;");
}
await init();
const password='isolated-integration-test-password',app=createApp({password,production:false});
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
const origin=`http://127.0.0.1:${server.address().port}`;let cookie='';
const request=(path,body,options={})=>fetch(origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),Cookie:cookie,...options.headers},body:body?JSON.stringify(body):undefined});
try{
 assert.equal((await request('/api/admin/reviews')).status,401);
 assert.equal((await request('/api/admin/login',{password:'incorrect'})).status,401);
 assert.equal((await request('/api/admin/login',{password},{headers:{Origin:'https://other.example'}})).status,403);
 const login=await request('/api/admin/login',{password});assert.equal(login.status,200);
 const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/i);assert.match(setCookie,/SameSite=Strict/i);cookie=setCookie.split(';')[0];
 const marker=randomUUID().slice(0,8),shopId=`review-test-${marker}`;
 const proposed={restaurant_id:shopId,name:`Review Test ${marker}`,address:`${marker} Test St, Beverly, MA`,phone:'978-555-0100',source_url:'https://example.com/menu',mode:'prices',size:'10 inch',cheese:'16.99',topping:'18.99',evidence:'Test fixture confirms Beverly, 10-inch and whole pepperoni price.',price_note:'Regular crust.',confirmed:true};
 const entry=await enqueueReview({kind:'test',restaurant_id:shopId,name:proposed.name,source_url:proposed.source_url,reason:'Uncertain data must wait',candidate:{cheese:1699,topping:1899}});
 const duplicate=await enqueueReview({...entry.payload,checked_at:new Date().toISOString()});assert.equal(duplicate.id,entry.id);
 let publicRows=await(await request('/api/restaurants')).json();assert.ok(!publicRows.some(s=>s.id===shopId));
 assert.equal((await request(`/api/admin/reviews/${entry.id}/approve`,{...proposed,confirmed:false})).status,400);
 assert.equal((await request(`/api/admin/reviews/${entry.id}/approve`,{...proposed,size:''})).status,400);
 assert.equal((await request(`/api/admin/reviews/${entry.id}/approve`,{...proposed,source_url:'javascript:alert(1)'})).status,400);
 const results=await Promise.all([request(`/api/admin/reviews/${entry.id}/approve`,proposed),request(`/api/admin/reviews/${entry.id}/approve`,proposed)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 publicRows=await(await request('/api/restaurants')).json();let published=publicRows.find(s=>s.id===shopId);
 assert.equal(published.cheese,1699);assert.equal(published.topping,1899);assert.equal(published.sourceType,'manual');assert.equal(published.manualPricing,true);assert.equal(published.sizeInches,10);
 const pending=await enqueueReview({kind:'test-reject',name:`Rejected ${marker}`,reason:'Wrong town'});
 assert.equal((await request(`/api/admin/reviews/${pending.id}/reject`,{reason:'Not in Beverly'})).status,200);
 assert.equal((await enqueueReview(pending.payload)).status,'rejected');
 assert.equal((await request(`/api/admin/reviews/${pending.id}/approve`,proposed)).status,409);
 const notOffered=await enqueueReview({kind:'test-no-large',restaurant_id:shopId,reason:'No large offered'});
 assert.equal((await request(`/api/admin/reviews/${notOffered.id}/approve`,{...proposed,mode:'not-offered'})).status,200);
 publicRows=await(await request('/api/restaurants')).json();published=publicRows.find(s=>s.id===shopId);
 assert.equal(published.cheese,null);assert.equal(published.status,'not-offered');assert.ok(published.history.some(s=>s.cheese===1699));
 const removal=await enqueueReview({kind:'test-closed',restaurant_id:shopId,reason:'Closed fixture'});
 assert.equal((await request(`/api/admin/reviews/${removal.id}/approve`,{...proposed,mode:'closed'})).status,200);
 assert.ok(!(await(await request('/api/restaurants')).json()).some(s=>s.id===shopId));
 const queue=await(await request('/api/admin/reviews')).json();assert.equal(queue.reviews.find(r=>r.id===entry.id).status,'approved');assert.equal(queue.reviews.find(r=>r.id===pending.id).decision.reason,'Not in Beverly');
 assert.ok((await history()).some(r=>r.restaurant_id===shopId));
 if(pool){
  const flags=await pool.query("SELECT relrowsecurity FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='beverly_pizza' AND relname IN ('catalog','reviews')");assert.ok(flags.rows.every(r=>r.relrowsecurity));
  const privilege=await pool.query("SELECT has_table_privilege('anon','beverly_pizza.reviews','SELECT') AS allowed");assert.equal(privilege.rows[0].allowed,false);
 }
 if(process.env.RUN_BROWSER_TESTS){
  const {chromium}=await import('playwright'),browser=await chromium.launch();
  try{
   const uiName=`UI Fixture ${marker}`;
   await enqueueReview({kind:'ui-test',name:uiName,address:`${marker} Browser St, Beverly, MA`,source_url:'https://example.com/menu',reason:'UI verification fixture',candidate:{cheese:1200,topping:1400}});
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/admin');await page.locator('#password').fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
   await page.locator('#workspace').waitFor({state:'visible'});
   await page.locator('.finding').filter({hasText:uiName}).getByRole('button',{name:'Review details'}).click();
   await page.locator('[name=size]').fill('10 inch');await page.locator('[name=mode]').selectOption('prices');
   await page.locator('[name=evidence]').fill('UI test confirms the menu size and prices.');await page.locator('[name=confirmed]').check();
   await page.getByRole('button',{name:'Approve & publish',exact:true}).click();
   await page.getByText('Approved and published. The public directory is updated.',{exact:true}).waitFor();
   const uiShop=(await(await request('/api/restaurants')).json()).find(s=>s.name===uiName);
   assert.equal(uiShop.cheese,1200);assert.equal(uiShop.sizeInches,10);assert.equal(uiShop.topping,1400);assert.deepEqual(errors,[]);
   if(process.env.ADMIN_PREVIEW_PATH){await page.screenshot({path:process.env.ADMIN_PREVIEW_PATH,fullPage:true});}
  }finally{await browser.close();}
 }
 await request('/api/admin/logout',{});assert.equal((await request('/api/admin/reviews')).status,401);
 for(let i=0;i<8;i++)assert.equal((await request('/api/admin/login',{password:'wrong'})).status,401);
 assert.equal((await request('/api/admin/login',{password:'wrong'})).status,429);
 console.log('Admin integration passed');
}finally{
 await new Promise(resolve=>server.close(resolve));await close();await rm(process.env.BEVERLY_DATA_DIR,{recursive:true,force:true});
}
