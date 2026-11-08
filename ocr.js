import {mkdir} from 'node:fs/promises';
import {createWorker} from 'tesseract.js';

export async function recognizeMenuImages(images){
 if(!images.length||images.length>4)throw new Error('OCR requires between one and four menu pages');
 await mkdir('.local/ocr-cache',{recursive:true});
 const worker=await createWorker('eng',1,{cachePath:'.local/ocr-cache'});
 try{
  const pages=[];
  for(const image of images){
   let timer;
   try{
    const result=await Promise.race([
     worker.recognize(image),
     new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Menu OCR exceeded 60 seconds')),60000);})
    ]);
    pages.push({text:result.data.text,confidence:result.data.confidence});
   }finally{clearTimeout(timer);}
  }
  return pages;
 }finally{await worker.terminate();}
}
