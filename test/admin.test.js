import {test} from 'node:test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
test('Admin authentication, approval isolation, rejection, publication and decision audit',async()=>{
 await execute(process.execPath,['scripts/check-admin.mjs'],{env:{...process.env,DATABASE_URL:'',NODE_ENV:'test'},timeout:30000});
});
test('Postgres review transactions and private-table permissions',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 await execute(process.execPath,['scripts/check-admin.mjs'],{env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL,NODE_ENV:'test'},timeout:30000});
});
