const summary=document.getElementById('summary'),body=document.getElementById('coverage');
const money=value=>value===null?'Pending':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value/100);
try{
 const response=await fetch('/api/coverage');if(!response.ok)throw Error();const {summary:s,shops}=await response.json();
 summary.textContent=`${s.total} locations tracked · ${s.withCheese} with cheese prices · ${s.withBothPrices} with both prices · ${s.automated} automated collectors. City-wide completeness is not yet established.`;
 for(const shop of shops.sort((a,b)=>a.name.localeCompare(b.name))){
  const tr=document.createElement('tr');
  const values=[shop.name,shop.sizeInches==null?"Unconfirmed":`${shop.sizeInches} inches`,`${money(shop.cheese)} / ${money(shop.topping)}`,shop.collectionMethod,shop.verifiedAt?new Date(shop.verifiedAt).toLocaleDateString('en-US',{timeZone:'America/New_York'}):'Not verified',shop.status==='verified'?(shop.topping===null?'One-topping price not confirmed':'Current prices collected'):shop.issue];
  values.forEach((value,index)=>{const td=document.createElement('td');td.textContent=value;if(index===0){const a=document.createElement('a');a.href=shop.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=shop.name;td.replaceChildren(a);}tr.append(td);});body.append(tr);
 }
}catch{summary.textContent='Coverage could not load. Please refresh to retry.';}
