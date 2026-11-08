import express from 'express';
import {directory,coverage,coverageCsv} from './directory.js';
import {history} from './db.js';
import {catalog} from './review-store.js';
import {adminRouter} from './admin.js';
export function createApp(adminOptions){
 const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
 app.use(express.json({limit:'32kb'}));app.use('/api/admin',adminRouter(adminOptions));
 const currentDirectory=async()=>directory(await history(),await catalog());
 app.get('/health',async(req,res,next)=>{try{await history();res.json({ok:true});}catch(e){next(e);}});
 app.get('/api/restaurants',async(req,res,next)=>{try{res.json(await currentDirectory());}catch(e){next(e);}});
 app.get('/api/coverage',async(req,res,next)=>{try{const shops=await currentDirectory();res.json({summary:coverage(shops),shops});}catch(e){next(e);}});
 app.get('/api/coverage.csv',async(req,res,next)=>{try{res.type('text/csv').attachment('beverly-pizza-coverage.csv').send(coverageCsv(await currentDirectory()));}catch(e){next(e);}});
 app.get('/admin',(req,res)=>res.redirect('/admin.html'));
 app.use(express.static('public'));
 app.use((err,req,res,next)=>{console.error(err.message);const status=Number.isInteger(err.status)&&err.status>=400&&err.status<500?err.status:500;res.status(status).json({error:status===500?'Service temporarily unavailable':err.message});});
 return app;
}
