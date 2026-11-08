import {load} from 'cheerio';
export function parsePrices(adapter,html){
 const $=load(html);$('script,style').remove();
 const text=$('body').find('*').addBack().contents().filter((i,n)=>n.type==='text').map((i,n)=>n.data).get().join(' ').replace(/\s+/g,' ');
 const rows=$('tr').toArray().map(r=>$(r).children('td,th').map((i,c)=>$(c).text().replace(/\s+/g,' ').trim()).get());
 let cheese,topping;
 if(adapter==='little-italy'){
  cheese=text.match(/Large Pizza\s*\(16[^)]*\)\s*[-–]?\s*\$(\d+\.\d{2})/i)?.[1];
  topping=text.match(/Meat Toppings\s*[-–]?\s*\$(\d+\.\d{2})/i)?.[1];
 }else if(adapter==='rantoul'){
  cheese=text.match(/Cheese Pizza\s*\$\d+\.\d{2}\s*\/\s*\$(\d+\.\d{2})/i)?.[1];
  // Use the explicit pepperoni pizza price; add-on pricing may differ.
  const pepperoni=text.match(/Pepperoni\s*\$\d+\.\d{2}\s*\/\s*\$(\d+\.\d{2})/i)?.[1];
  if(cheese&&pepperoni) topping=Number(pepperoni)-Number(cheese);
 }else if(adapter==='gregs'){
  const header=rows.findIndex(r=>r[0]==='PIZZA'&&r[1]==='SMALL'&&r[2]==='LARGE');
  const row=rows[header+1];
  if(header>=0&&row?.[0]==='CHEESE PIZZA')cheese=row[2];
  // Pepperoni is absent from the published regular-topping list. Do not infer it.
  topping=null;
 }else if(adapter==='mikes'){
  const start=rows.findIndex(r=>/^PIZZA Our pizzas/.test(r[0]));
  const header=rows[start],index=header?.findIndex(c=>/^Large\s+16/.test(c));
  const section=rows.slice(start+1).slice(0,8);
  if(start>=0&&index>0){
   cheese=section.find(r=>/^Original Sauce\b/.test(r[0]))?.[index];
   topping=section.find(r=>r[0]==='Regular Topping')?.[index];
  }
 }else if(adapter==='tesoro'){
  const section=text.match(/Pizza\s+One Size\s*-\s*16[”"]\s+Margherita\s+(\d+(?:\.\d{1,2})?)\s+Crushed San Marzano/i);
  cheese=section?.[1];
  topping=text.match(/PIZZA TOPPINGS\s+(\d+\.\d{2})\s+EA\s+Pepperoni/i)?.[1];
 }else if(adapter==='prides'){
  const table=$('table').toArray().find(t=>{
   const labels=$(t).find('tr').toArray().map(r=>$(r).children('td,th').first().text().trim());
   return labels.includes('Roni')&&labels.includes('Cheese');
  });
  if(table){
   const entries=$(table).find('tr').toArray().map(r=>$(r).children('td,th').map((i,c)=>$(c).text().trim()).get());
   const header=entries.find(r=>r.includes('Medium')&&r.includes('Large'));
   const index=header?.indexOf('Large');
   if(index>0){cheese=entries.find(r=>r[0]==='Cheese')?.[index];const roni=entries.find(r=>r[0]==='Roni')?.[index];if(cheese&&roni)topping=Number(roni)-Number(cheese);}
  }
 }else if(adapter==='anchor'){
  const section=text.match(/Pizza\s+Toppings:\s*([\s\S]{0,900}?)Shrimp Scampi/i)?.[1];
  if(section&&/Pepperoni/i.test(section)){
   cheese=section.match(/Cheese\s*\$\d+\.\d{2}\s*\/\s*Small\s*\$(\d+\.\d{2})\s*\/\s*Large/i)?.[1];
   topping=section.match(/Large:\s*\+\$(\d+\.\d{2})\s+per topping/i)?.[1];
  }
 }else if(adapter==='mikeys'){
  const section=text.match(/Pizza\s+Toppings for\s*\+\$(\d+\.\d{2})\s+each:\s*([\s\S]{0,450}?)Cheese Pizza\s+Small\s*-\s*\$\d+\.\d{2}\s*\|\s*Large\s*-\s*\$(\d+\.\d{2})/i);
  if(section&&/Pepperoni/i.test(section[2])){cheese=section[3];topping=section[1];}
 }else if(adapter==='rev'){
  if(/45 Enon St\.? Beverly/i.test(text)&&/Neapolitan Crust in 9[”"]\s*&\s*16[”"]/i.test(text)){
   const byo=text.match(/Build Your Own\s+Individual\s+\d+(?:\.\d{2})?,\s*Toppings\s*\$\d+(?:\.\d{2})?\s+each\s+Regular\s+(\d+(?:\.\d{2})?),\s*Toppings\s*\$(\d+(?:\.\d{2})?)\s+each/i);
   if(byo&&/Pepperoni/i.test(text)){cheese=byo[1];topping=byo[2];}
  }
 }else if(adapter==='marias'){
  cheese=text.match(/Large Three Blended Cheeses Pizza\s*\$(\d+\.\d{2})/i)?.[1];
  topping=null;
 }
 if(!cheese||topping===undefined) throw new Error('Menu format needs review');
 const c=Math.round(Number(cheese)*100),t=topping===null?null:c+Math.round(Number(topping)*100);
 if(!Number.isFinite(c)||c<500||c>10000||(t!==null&&(!Number.isFinite(t)||t<c||t>15000)))throw new Error('Price outside expected range; review required');
 return {cheese:c,topping:t};
}
