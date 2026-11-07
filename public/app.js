let shops=[];
const $=id=>document.getElementById(id);
const money=n=>n==null?null:new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 const field=$('sort').value;
 const list=shops.filter(r=>(r.name+' '+r.address).toLowerCase().includes($('search').value.toLowerCase())&&(!$('verified').checked||r.cheese!=null)).sort((a,b)=>field==='name'?a.name.localeCompare(b.name):(a[field]??Infinity)-(b[field]??Infinity)||a.name.localeCompare(b.name));
 $('results').innerHTML=list.length?list.map(r=>{
 const stale=r.verifiedAt&&Date.now()-new Date(r.verifiedAt)>8*86400000;
 const status=r.status==='review'?'Menu needs review':r.verifiedAt?`${stale?'Older price · ':'Checked '}${new Date(r.verifiedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'})}`:'Price verification pending';
 return `<article class="shop"><div><h3>${escape(r.name)}</h3><p>${escape(r.address)} · ${escape(r.size)}</p>${r.phone?`<p><a href="tel:${escape(r.phone)}">${escape(r.phone)}</a></p>`:''}<span class="status">${escape(status)}</span></div><div class="price"><small>Large cheese</small>${r.cheese==null?'<em>Not verified yet</em>':`<strong>${money(r.cheese)}</strong>`}</div><div class="price"><small>+ one topping</small>${r.topping==null?'<em>Not verified yet</em>':`<strong>${money(r.topping)}</strong>`}</div><a class="source" href="${escape(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="View ${escape(r.name)} source menu">↗</a></article>`;
 }).join(''):'<p>No shops match your search.</p>';
}
for(const id of ['search','sort','verified'])$(id).addEventListener('input',render);
try{const response=await fetch('/api/restaurants');if(!response.ok)throw Error();shops=await response.json();$('count').textContent=shops.length;const prices=shops.map(s=>s.cheese).filter(v=>v!=null);$('lowest').textContent=prices.length?money(Math.min(...prices)):'Pending';render();}catch{$('results').textContent='The directory could not load. Please refresh to try again.';}
