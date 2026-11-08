import {test} from 'node:test';
import assert from 'node:assert/strict';
import {directory,coverage,coverageCsv} from '../directory.js';
import {diameterInches} from '../pizza-size.js';
test('Diameters use explicit inches and never infer Large or rectangular pan dimensions',()=>{
 assert.equal(diameterInches('10-inch'),10);assert.equal(diameterInches('16 inch'),16);assert.equal(diameterInches('12.5”'),12.5);assert.equal(diameterInches('Large'),null);assert.equal(diameterInches('10 x 14 inch pan'),null);
});
test('The observation’s size stays attached to its price instead of using a different catalog size',()=>{
 const shop=directory([{restaurant_id:'sized',cheese:1275,topping:null,error:null,checked_at:new Date().toISOString(),size_label:'Small',size_inches:null}],[{id:'sized',name:'Sized fixture',size:'16 inch'}])[0];assert.equal(shop.size,'Small');assert.equal(shop.sizeInches,null);
});
test('An operation-review location cannot appear in current price comparisons',()=>{
 const shops=directory([{restaurant_id:'prides',cheese:1499,topping:1699,error:null,checked_at:'2026-11-01T12:00:00Z'}]);
 const shop=shops.find(s=>s.id==='prides');
 assert.equal(shop.status,'operation-review');assert.equal(shop.cheese,null);assert.equal(shop.history[0].cheese,1499);assert.equal(coverage(shops).withCheese,0);
});
test('Failed new checks retain the previous verified observation',()=>{
 const shops=directory([{restaurant_id:'anchor',error:'Menu changed',checked_at:'2026-11-08T12:00:00Z'},{restaurant_id:'anchor',cheese:1200,topping:1275,error:null,checked_at:'2026-11-07T12:00:00Z'}]);
 const shop=shops.find(s=>s.id==='anchor');assert.equal(shop.status,'review');assert.equal(shop.cheese,1200);assert.equal(shop.verifiedAt,'2026-11-07T12:00:00Z');assert.equal(shop.issue,'Menu changed');
});
test('CSV escapes quotes, avoids spreadsheet formulas and leaves missing prices blank',()=>{
 const csv=coverageCsv([{name:'=SUM(1)',address:'1 "Main" Street',size:'Large',cheese:1200,topping:null,collectionMethod:'html',status:'verified',url:'https://example.com'}]);
 assert.ok(csv.includes('"\'=SUM(1)"'));assert.ok(csv.includes('"1 ""Main"" Street"'));assert.ok(csv.includes('"12.00",""'));
});
