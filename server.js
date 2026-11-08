import {init} from './db.js';
import {createApp} from './server-app.js';
await init();
createApp().listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Beverly Pizza is ready'));
