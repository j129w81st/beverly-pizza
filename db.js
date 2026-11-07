import pg from 'pg';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
const pool=process.env.DATABASE_URL ? new pg.Pool({connectionString:process.env.DATABASE_URL}) : null;
export async function init(){
 if(process.env.NODE_ENV==='production'&&!pool) throw new Error('DATABASE_URL is required in production');
 if(pool) await pool.query('CREATE TABLE IF NOT EXISTS observations (id BIGSERIAL PRIMARY KEY, restaurant_id TEXT NOT NULL, checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), cheese INTEGER, topping INTEGER, error TEXT)');
 else await mkdir('.local',{recursive:true});
}
export async function history(){
 if(pool) return (await pool.query('SELECT restaurant_id, checked_at, cheese, topping, error FROM observations ORDER BY checked_at DESC,id DESC')).rows;
 try{return JSON.parse(await readFile('.local/observations.json','utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}
}
export async function save(row){
 if(pool) await pool.query('INSERT INTO observations (restaurant_id,checked_at,cheese,topping,error) VALUES ($1,$2,$3,$4,$5)',[row.restaurant_id,row.checked_at,row.cheese,row.topping,row.error]);
 else {const rows=await history(); rows.unshift(row);await writeFile('.local/observations.tmp',JSON.stringify(rows));await rename('.local/observations.tmp','.local/observations.json');}
}
export async function close(){await pool?.end();}
