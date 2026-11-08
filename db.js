import pg from 'pg';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {reviewSchema} from './review-schema.js';
export const dataDir=process.env.BEVERLY_DATA_DIR??'.local';
export const pool=process.env.DATABASE_URL ? new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:15000,idleTimeoutMillis:10000}) : null;
export async function init(){
 if(process.env.NODE_ENV==='production'&&!pool) throw new Error('DATABASE_URL is required in production');
 if(pool) await pool.query(`
  BEGIN;
  SELECT pg_advisory_xact_lock(hashtext('beverly_pizza_schema'));
  CREATE SCHEMA IF NOT EXISTS beverly_pizza;
  REVOKE ALL ON SCHEMA beverly_pizza FROM PUBLIC;
  CREATE TABLE IF NOT EXISTS beverly_pizza.observations (
   id BIGSERIAL PRIMARY KEY, restaurant_id TEXT NOT NULL,
   checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), cheese INTEGER, topping INTEGER, error TEXT
  );
  ALTER TABLE beverly_pizza.observations ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON beverly_pizza.observations FROM PUBLIC;
  ALTER TABLE beverly_pizza.observations ADD COLUMN IF NOT EXISTS source_url TEXT;
  ALTER TABLE beverly_pizza.observations ADD COLUMN IF NOT EXISTS source_type TEXT;
  ALTER TABLE beverly_pizza.observations ADD COLUMN IF NOT EXISTS source_sha256 TEXT;
  ALTER TABLE beverly_pizza.observations ADD COLUMN IF NOT EXISTS size_label TEXT;
  ALTER TABLE beverly_pizza.observations ADD COLUMN IF NOT EXISTS size_inches NUMERIC;
  ${reviewSchema}
  COMMIT;
 `);
 else await mkdir(dataDir,{recursive:true});
}
export async function history(){
 if(pool) return (await pool.query('SELECT restaurant_id, checked_at, cheese, topping, error, source_url, source_type, source_sha256,size_label,size_inches::float8 FROM beverly_pizza.observations ORDER BY checked_at DESC,id DESC')).rows;
 const read=async file=>{try{return JSON.parse(await readFile(`${dataDir}/${file}`,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const rows=await read('observations.json')??[],admin=await read('admin.json');
 return [...rows,...(admin?.observations??[])].sort((a,b)=>new Date(b.checked_at)-new Date(a.checked_at));
}
export async function save(row){
 if(pool) await pool.query('INSERT INTO beverly_pizza.observations (restaurant_id,checked_at,cheese,topping,error,source_url,source_type,source_sha256,size_label,size_inches) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[row.restaurant_id,row.checked_at,row.cheese,row.topping,row.error,row.source_url??null,row.source_type??null,row.source_sha256??null,row.size_label??null,row.size_inches??null]);
 else {let rows=[];try{rows=JSON.parse(await readFile(`${dataDir}/observations.json`,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}rows.unshift(row);await writeFile(`${dataDir}/observations.tmp`,JSON.stringify(rows));await rename(`${dataDir}/observations.tmp`,`${dataDir}/observations.json`);}
}
export async function close(){await pool?.end();}
