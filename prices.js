import {load} from 'cheerio';
export function parsePrices(adapter,html){
 const $=load(html);$('script,style').remove();const text=$('body').text().replace(/\s+/g,' ');
 let cheese,topping;
 if(adapter==='little-italy'){
  cheese=text.match(/Large Pizza\s*\(16[^)]*\)\s*[-–]?\s*\$(\d+\.\d{2})/i)?.[1];
  topping=text.match(/Meat Toppings\s*[-–]?\s*\$(\d+\.\d{2})/i)?.[1];
 }else if(adapter==='rantoul'){
  cheese=text.match(/Cheese Pizza\s*\$\d+\.\d{2}\s*\/\s*\$(\d+\.\d{2})/i)?.[1];
  // Use the explicit pepperoni pizza price; add-on pricing may differ.
  const pepperoni=text.match(/Pepperoni\s*\$\d+\.\d{2}\s*\/\s*\$(\d+\.\d{2})/i)?.[1];
  if(cheese&&pepperoni) topping=Number(pepperoni)-Number(cheese);
 }
 if(!cheese||topping===undefined) throw new Error('Menu format needs review');
 const c=Math.round(Number(cheese)*100),t=c+Math.round(Number(topping)*100);
 if(c<500||c>10000||t<c||t>15000)throw new Error('Price outside expected range; review required');
 return {cheese:c,topping:t};
}
