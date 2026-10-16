const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('character uploads, campaign access, validation and persistence',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'evolink-test-'));process.env.DATA_DIR=dir;
 const modulePath=path.join(root,'server.js');let server;
 async function start(){delete require.cache[require.resolve(modulePath)];server=require(modulePath).createServer();}
 await start();
 const call=async(url,data,cookie)=>new Promise((resolve,reject)=>{
 const {PassThrough}=require('node:stream');const req=new PassThrough();req.url=url;req.method=data?'POST':'GET';req.socket={remoteAddress:'test'};req.headers={host:'localhost','content-type':'application/json',...(cookie?{cookie}:{})};
 const headers={};const res={headersSent:false,setHeader(k,v){headers[k.toLowerCase()]=v;},writeHead(status,h){this.status=status;Object.entries(h).forEach(([k,v])=>headers[k.toLowerCase()]=v);this.headersSent=true;},end(body){resolve({status:this.status,cookie:headers['set-cookie']?.split(';')[0],body:headers['content-type']?.includes('json')?JSON.parse(body):body});}};
 server.emit('request',req,res);req.end(data?JSON.stringify(data):'');
 });
 try{
 const reg=async(username,role='jogador')=>{const r=await call('/api/register',{username,role,name:username,password:'password123'});assert.equal(r.status,201);return r.cookie;};
 const gm=await reg('master','mestre'),a=await reg('playera'),b=await reg('playerb'),outsider=await reg('outsider');
 const c=(await call('/api/campaigns',{name:'Test campaign'},gm)).body.campaign;
 await call('/api/campaigns/join',{code:c.code},a);await call('/api/campaigns/join',{code:c.code},b);
 const species=(await call(`/api/campaigns/${c.id}/species`,{number:1,name:'Bulbasaur',type1:'Grama'},gm)).body.species;
 let me=(await call('/api/me',null,a)).body;assert.equal(me.species[0].unknown,true);assert.equal(me.species[0].name,undefined);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXZkAAAAASUVORK5CYII=','base64');
 assert.equal((await call('/api/trainer/image',{base64:png.toString('base64')},gm)).status,403);
 assert.equal((await call('/api/trainer/image',{base64:Buffer.from('<svg>invalid format here</svg>').toString('base64')},a)).status,400);
 assert.equal((await call('/api/trainer/image',{base64:Buffer.alloc(5_000_001).toString('base64')},a)).status,400);
 let image;
 for(const buf of [png,Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(30)]),Buffer.concat([Buffer.from('RIFF0000WEBP'),Buffer.alloc(30)])]){
 const old=image;const uploaded=await call('/api/trainer/image',{base64:buf.toString('base64')},a);assert.equal(uploaded.status,200);image=uploaded.body.trainer.image;
 if(old)assert.equal((await call(old,null,a)).status,404);
 assert.equal((await call(image,null,a)).status,200);
 }
 assert.equal((await call(image)).status,401);assert.equal((await call(image,null,outsider)).status,404);
 assert.equal((await call(image,null,gm)).status,200);assert.equal((await call(image,null,b)).status,200);
 await call('/api/trainer',{name:'New trainer',hometown:'Town',bio:'Story'},a);
 assert.equal((await call('/api/me',null,a)).body.user.trainer.image,image);
 assert.equal((await call('/api/me',null,b)).body.campaigns[0].members.find(m=>m.trainer.image===image).trainer.name,'New trainer');
 server.close();await start();assert.equal((await call(image,null,a)).status,200);
 me=(await call('/api/me',null,gm)).body;assert.equal(me.species[0].id,species.id);assert.equal(me.campaigns[0].members.length,2);
 await call(`/api/campaigns/${c.id}/remove-member`,{memberId:(await call('/api/me',null,a)).body.user.id},gm);
 assert.equal((await call(image,null,b)).status,404);
 }finally{server.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('Pokédex sections, player silhouettes and profile rendering',()=>{
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8').split('(async()=>{')[0];
 const el={addEventListener(){},dataset:{},classList:{}};
 const ctx=vm.createContext({document:{body:{dataset:{}},getElementById(){return el;}},location:{search:''},URLSearchParams,localStorage:{getItem(){return null;}},window:{addEventListener(){}},navigator:{},setTimeout,clearTimeout,console});
 vm.runInContext(source,ctx);
 vm.runInContext(`state.user={id:'gm',role:'mestre',name:'GM'};state.campaigns=[{id:'c',name:'Test',members:[{id:'p',name:'Player',trainer:{name:'Player',image:'/api/trainer-media/test.png'}}]}];state.species=[{id:'s',campaignId:'c',name:'Testmon',number:1,type1:'Grama'}];`,ctx);
 const render=()=>vm.runInContext('dashboardPokedex()',ctx);
 let html=render();assert.match(html,/Fichas e criação/);assert.doesNotMatch(html,/id="add-species-form"|data-action="edit-species"/);
 vm.runInContext("state.dexSection='manage';state.dexFilter='caught'",ctx);html=render();assert.match(html,/id="add-species-form"/);assert.match(html,/data-action="edit-species"/);assert.match(html,/import-species-form/);
 vm.runInContext("state.user={id:'p',role:'jogador',name:'Player',trainer:{name:'Player'}};state.dexFilter='all'",ctx);html=render();assert.match(html,/monster-shadow/);assert.doesNotMatch(html,/Fichas e criação|add-species-form/);
 assert.match(vm.runInContext('dashboardProfile()',ctx),/trainer-image-form/);
 html=vm.runInContext('campaignCards()',ctx);assert.match(html,/trainer-portrait/);assert.doesNotMatch(html,/data-action="remove-member"/);
});
