export function diameterInches(label){
 const text=String(label??'');
 if(/\d\s*(?:["”]|inches?)?\s*[x×]\s*\d/i.test(text))return null;
 const match=text.match(/\b(\d{1,2}(?:\.\d)?)\s*[-–]?\s*(?:inch(?:es)?|["”])/i);
 const value=match?Number(match[1]):null;
 return value!==null&&value>=4&&value<=60?value:null;
}
