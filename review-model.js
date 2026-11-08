import {randomUUID} from 'node:crypto';
const bad=message=>{throw Object.assign(new Error(message),{status:400});};
function text(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}
export function sourceUrl(value){
 try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)bad('Use a public http or https source URL');return url.href;}
 catch{bad('Use a public http or https source URL');}
}
export function preparePublication(input,shops){
 if(!input||typeof input!=='object')bad('Enter review details');
 if(input.confirmed!==true)bad('Confirm the Beverly location, evidence and selected pizza size before publishing');
 const id=text(input.restaurant_id,100)||`shop-${randomUUID()}`;
 if(!/^[a-z0-9-]+$/.test(id))bad('Invalid restaurant identifier');
 const old=shops.find(s=>s.id===id);
 const name=text(input.name,160),address=text(input.address,240),size=text(input.size,100),evidence=text(input.evidence,3000);
 if(!name||!address||!evidence)bad('Name, Beverly address and verification notes are required');
 const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/street/g,'st').replace(/avenue/g,'ave');
 if(!old&&shops.some(s=>normalize(s.address)===normalize(address)||normalize(s.name)===normalize(name)))bad('This looks like an existing restaurant. Select it from the restaurant dropdown instead of adding a duplicate.');
 const source_url=sourceUrl(input.source_url);
 const mode=input.mode;
 if(!['prices','listing','not-offered','closed'].includes(mode))bad('Select what to publish');
 const cents=value=>{
  if(value===null||value===undefined||value==='')return null;
  if(typeof value!=='string'||!/^\d{1,3}(?:\.\d{1,2})?$/.test(value))bad('Enter prices in dollars, for example 16.99');
  const number=Math.round(Number(value)*100);
  if(number<500||number>15000)bad('Price must be between $5 and $150');return number;
 };
 let cheese=null,topping=null;
 if(mode==='prices'){
  if(!size)bad('Enter the published pizza size, or “Diameter unconfirmed” if it is not stated');
  cheese=cents(input.cheese);topping=cents(input.topping);
  if(cheese===null)bad('A confirmed cheese pizza price is required');
  if(topping!==null&&topping<cheese)bad('The one-topping total cannot be less than cheese');
 }
 const shop={...old,id,name,address,phone:text(input.phone,40),url:source_url,size:size||'Size to confirm',
  priceNote:text(input.price_note,700),operatingStatus:mode==='closed'?'closed':'active',
  priceAvailability:mode==='not-offered'?'not-offered':'pending',
  // Later scrapes become new proposals instead of overwriting the owner's review.
  manualPricing:true,priceReviewAt:new Date().toISOString()};
 if(mode==='prices')shop.priceAvailability='available';
 return {id,shop,cheese,topping,source_url,evidence,mode};
}
