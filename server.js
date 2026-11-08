import express from 'express';
import {directory,coverage,coverageCsv} from './directory.js';
import {init,history} from './db.js';
await init();
const app=express();app.disable('x-powered-by');
app.get('/health',async(req,res,next)=>{try{await history();res.json({ok:true});}catch(e){next(e);}});
app.get('/api/restaurants',async(req,res,next)=>{
 try{res.json(directory(await history()));}catch(e){next(e);}
});
app.get('/api/coverage',async(req,res,next)=>{try{const shops=directory(await history());res.json({summary:coverage(shops),shops});}catch(e){next(e);}});
app.get('/api/coverage.csv',async(req,res,next)=>{try{res.type('text/csv').attachment('beverly-pizza-coverage.csv').send(coverageCsv(directory(await history())));}catch(e){next(e);}});
app.use(express.static('public'));
app.use((err,req,res,next)=>{console.error(err.message);res.status(500).json({error:'Service temporarily unavailable'});});
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Beverly Pizza is ready'));
