import pg from 'pg';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
const pool=process.env.DATABASE_URL ? new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:15000,idleTimeoutMillis:10000}) : null;
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
  COMMIT;
 `);
 else await mkdir('.local',{recursive:true});
}
export async function history(){
 if(pool) return (await pool.query('SELECT restaurant_id, checked_at, cheese, topping, error, source_url, source_type, source_sha256 FROM beverly_pizza.observations ORDER BY checked_at DESC,id DESC')).rows;
 try{return JSON.parse(await readFile('.local/observations.json','utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}
}
export async function save(row){
 if(pool) await pool.query('INSERT INTO beverly_pizza.observations (restaurant_id,checked_at,cheese,topping,error,source_url,source_type,source_sha256) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[row.restaurant_id,row.checked_at,row.cheese,row.topping,row.error,row.source_url??null,row.source_type??null,row.source_sha256??null]);
 else {const rows=await history(); rows.unshift(row);await writeFile('.local/observations.tmp',JSON.stringify(rows));await rename('.local/observations.tmp','.local/observations.json');}
}
export async function close(){await pool?.end();}
