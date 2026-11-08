const $=id=>document.getElementById(id),form=$('publication');
let data,selected=null;
const money=n=>n==null?'Pending':`$${(n/100).toFixed(2)}`;
const message=text=>$('message').textContent=text;
async function api(path,body){
 const response=await fetch(`/api/admin${path}`,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const result=await response.json();
 if(!response.ok){if(response.status===401){$('login').hidden=false;$('workspace').hidden=true;}throw Error(result.error||'Request failed');}return result;
}
function field(name,value){form.elements.namedItem(name).value=value??'';}
function shopFields(shop){
 field('name',shop.name);field('address',shop.address);field('phone',shop.phone);field('source_url',shop.url);field('size',shop.size);field('price_note',shop.priceNote);
 const current=data.shops.find(s=>s.id===shop.id);
 field('cheese',current?.cheese==null?'':(current.cheese/100).toFixed(2));field('topping',current?.topping==null?'':(current.topping/100).toFixed(2));
}
function edit(review,shop){
 selected=review??null;form.reset();$('editor').hidden=false;
 $('editor-title').textContent=review?'Verify a finding':'Add a verified finding';
 $('publish').textContent=review?'Approve & publish':'Stage for review';$('reject').hidden=!review;
 const p=review?.payload??{},candidate=p.candidate??{};
 const id=p.restaurant_id??shop?.id??'';field('restaurant_id',data.catalog.some(s=>s.id===id)?id:'');
 if(id&&data.catalog.some(s=>s.id===id))shopFields(data.catalog.find(s=>s.id===id));
 else{field('name',p.name);field('address',p.address);field('source_url',p.lead_url||p.source_url);}
 if(shop)shopFields(shop);
 $('reason').textContent=p.reason??'Enter the source and confirmed details. Staging a finding does not publish it.';
 const url=p.source_url||shop?.url;const link=$('evidence-link');link.hidden=true;
 try{const parsed=new URL(url);if(['http:','https:'].includes(parsed.protocol)){link.href=parsed.href;link.hidden=false;}}catch{}
 $('evidence').textContent=[p.excerpt,p.confidence==null?'':`OCR confidence: ${p.confidence} (requires verification)`,p.cuisine?`Discovery cuisine tag: ${p.cuisine}`:'',p.candidate?JSON.stringify(p.candidate,null,2):''].filter(Boolean).join('\n\n');
 if(p.kind==='manual'){for(const key of ['name','address','phone','source_url','size','cheese','topping','evidence','price_note','mode'])if(candidate[key]!=null)field(key,candidate[key]);}
 else if(candidate.cheese!=null){field('cheese',(candidate.cheese/100).toFixed(2));field('topping',candidate.topping==null?'':(candidate.topping/100).toFixed(2));if(candidate.size_label)field('size',candidate.size_label);}
 if(!candidate.cheese&&!form.elements.cheese.value)field('mode','listing');
 form.elements.confirmed.checked=false;
 $('editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
 const pending=data.reviews.filter(r=>r.status==='pending');
 $('totals').textContent=`${data.shops.length} public locations · ${pending.length} findings waiting for review`;
 const queue=$('queue');queue.replaceChildren();
 const view=$('view').value;
 const entries=view==='gaps'?data.catalog.filter(s=>{const current=data.shops.find(r=>r.id===s.id);return !current||current.cheese===null||current.topping===null;}):view==='pending'?pending:data.reviews.filter(r=>r.status!=='pending');
 if(!entries.length){const p=document.createElement('p');p.textContent='No findings in this view.';queue.append(p);}
 for(const item of entries){
  const card=document.createElement('article');card.className='finding';
  const p=item.payload,shop=p?null:item;
  const h=document.createElement('h3');h.textContent=p?.name??data.catalog.find(s=>s.id===p?.restaurant_id)?.name??shop?.name??'Unidentified finding';card.append(h);
  const info=document.createElement('p');info.textContent=p?(p.reason??'Review required'):shop.address;card.append(info);
  const status=document.createElement('small');status.textContent=p?`${p.kind} · ${item.status} · ${new Date(item.created_at).toLocaleDateString()}`:`Cheese ${money(data.shops.find(s=>s.id===shop.id)?.cheese)} · + pepperoni ${money(data.shops.find(s=>s.id===shop.id)?.topping)}`;card.append(status);
  if(item.status==='pending'||shop){const button=document.createElement('button');button.textContent='Review details';button.addEventListener('click',()=>edit(p?item:null,shop));card.append(document.createElement('br'),document.createElement('br'),button);}
  else if(item.decision){const note=document.createElement('p');note.textContent=item.decision.evidence??item.decision.reason??'Decision recorded';card.append(note);}
  queue.append(card);
 }
}
async function load(){data=await api('/reviews');$('login').hidden=true;$('workspace').hidden=false;const select=$('restaurant');select.replaceChildren(new Option('New Beverly restaurant',''));for(const shop of [...data.catalog].sort((a,b)=>a.name.localeCompare(b.name)))select.add(new Option(`${shop.name} · ${shop.address}`,shop.id));render();}
async function run(fn){try{await fn();}catch(e){message(e.message);}}
$('login').addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('/login',{password:$('password').value});$('password').value='';message('Signed in');await load();});});
$('refresh').addEventListener('click',()=>run(load));$('view').addEventListener('change',render);
$('new').addEventListener('click',()=>edit());$('cancel').addEventListener('click',()=>{$('editor').hidden=true;selected=null;});
$('restaurant').addEventListener('change',e=>{const shop=data.catalog.find(s=>s.id===e.target.value);if(shop)shopFields(shop);});
$('logout').addEventListener('click',()=>run(async()=>{await api('/logout',{});data=null;selected=null;$('editor').hidden=true;$('workspace').hidden=true;$('login').hidden=false;message('Signed out');}));
form.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 const input=Object.fromEntries(new FormData(form));input.confirmed=form.elements.confirmed.checked;
 $('publish').disabled=true;
 try{if(selected){await api(`/reviews/${selected.id}/approve`,input);message('Approved and published. The public directory is updated.');}else{await api('/reviews',input);message('Finding staged. Review it in Pending findings, then approve to publish.');}
 $('editor').hidden=true;selected=null;await load();}finally{$('publish').disabled=false;}
});});
$('reject').addEventListener('click',()=>run(async()=>{if(!selected)return;await api(`/reviews/${selected.id}/reject`,{reason:form.elements.evidence.value||'Rejected by owner'});message('Finding rejected; it was not published.');$('editor').hidden=true;selected=null;await load();}));
run(load);
