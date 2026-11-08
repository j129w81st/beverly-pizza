import {test} from 'node:test';
import assert from 'node:assert/strict';
import {directory,coverage,coverageCsv} from '../directory.js';
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
