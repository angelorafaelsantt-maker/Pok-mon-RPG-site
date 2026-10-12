'use strict';
// EvoLink — aplicativo web multiusuário simples, sem dependências externas.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const DATA_FILE = path.join(DATA_DIR, 'evolink.json');
// Um servidor efêmero no Railway apagaria as contas/campanhas após cada implantação.
if (process.env.RAILWAY_PROJECT_ID) {
  const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (!volume || DATA_DIR !== path.resolve(volume)) {
    throw new Error('EvoLink: configure um volume Railway persistente no caminho ' + DATA_DIR + ' antes de iniciar.');
  }
}
const PORT = Number(process.env.PORT || 3000);
const MEDIA_DIR = path.join(DATA_DIR, 'species-images');
const MAX_IMAGE_BYTES = 20_000_000; // 20 MB por arte normal/shiny
const MAX_IMAGE_BODY_BYTES = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 2048;
const MAX_ITEMS_PER_CAMPAIGN = 150;
const MAX_WALLET = 1_000_000_000;
const MAX_CAPTURED_PER_PLAYER = 250;
const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const TYPES = new Set(['Normal','Fogo','Água','Grama','Elétrico','Gelo','Lutador','Veneno','Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada']);
fs.mkdirSync(DATA_DIR, {recursive:true});
let db;
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!db || !Array.isArray(db.users) || !Array.isArray(db.campaigns) || !Array.isArray(db.sessions)) throw new Error('Arquivo de dados inválido');
} catch (error) {
  if (fs.existsSync(DATA_FILE)) throw error; // Nunca substituir silenciosamente um banco danificado.
  db = {version:1, users:[], sessions:[], campaigns:[], species:[]};
}
db.species ||= [];
db.captured ||= []; // Instâncias de Pokémon pertencentes a treinadores, separadas das espécies
db.discoveries ||= []; // Progresso de cada treinador na Pokédex de cada campanha
db.items ||= []; // Catálogo de itens compartilhado por campanha
db.inventory ||= []; // Itens possuídos por cada treinador
db.wallets ||= []; // Pokédólares de cada treinador
db.itemHistory ||= []; // Histórico de mudanças de inventário / dinheiro
fs.mkdirSync(MEDIA_DIR, {recursive:true});
function save() {
  const temp = DATA_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), {mode:0o600});
  fs.renameSync(temp, DATA_FILE);
}
function id() {return crypto.randomUUID();}
function clean(x, limit=100) {return typeof x === 'string' ? x.trim().slice(0,limit) : '';}
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return salt + ':' + crypto.scryptSync(password, Buffer.from(salt,'hex'),64).toString('hex');
}
function verifyPassword(password, hashed) {
  const [salt, old] = hashed.split(':');
  if (!salt || !old) return false;
  const attempt = Buffer.from(hashPassword(password,salt).split(':')[1], 'hex');
  const expected = Buffer.from(old,'hex');
  return expected.length === attempt.length && crypto.timingSafeEqual(expected,attempt);
}
function sessionHash(token) {return crypto.createHash('sha256').update(token).digest('hex');}
function cookie(req, name) {
  const all = (req.headers.cookie || '').split(';').map(v=>v.trim());
  return all.find(v=>v.startsWith(name+'='))?.slice(name.length+1);
}
function currentUser(req) {
  const token = cookie(req, 'evolink_session');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = db.sessions.find(s=>s.hash===sessionHash(token) && s.expires>Date.now());
  return session ? db.users.find(u=>u.id===session.userId) || null : null;
}
function safeUser(user) {return {id:user.id,username:user.username,name:user.name,role:user.role,trainer:user.trainer || {name:user.name, hometown:'',bio:''}};}
function response(res, status, data, headers={}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});
  res.end(body);
}
function createSession(res, req, user) {
  db.sessions = db.sessions.filter(s=>s.expires>Date.now());
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({hash:sessionHash(token),userId:user.id,expires:Date.now()+SESSION_MS});
  save();
  const secure = req.socket.encrypted || (process.env.TRUST_PROXY==='1' && req.headers['x-forwarded-proto']==='https');
  res.setHeader('Set-Cookie',`evolink_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MS/1000}${secure?'; Secure':''}`);
}
function auth(req) {const u=currentUser(req); if(!u) fail(401,'Entre na sua conta para continuar.');return u;}
function master(req) {const u=auth(req);if(u.role!=='mestre')fail(403,'Apenas o Mestre pode fazer isso.');return u;}
function campaignAccess(req,campaignId) {
  const user=auth(req);
  const campaign=db.campaigns.find(c=>c.id===campaignId);
  if (!campaign || (campaign.masterId!==user.id && !campaign.memberIds.includes(user.id))) fail(404,'Campanha não encontrada.');
  return {user,campaign};
}
function owner(req,campaignId) {
  const {user,campaign}=campaignAccess(req,campaignId);
  if(campaign.masterId!==user.id) fail(403,'Somente o Mestre desta campanha pode alterar seus dados.');
  return campaign;
}
function campaignInfo(c, viewer=null) {
  const gm=db.users.find(u=>u.id===c.masterId);
  return {id:c.id,name:c.name,...((!viewer||viewer.id===c.masterId)?{code:c.code}:{}),masterName:gm?.name||'Mestre',members:c.memberIds.map(uid=>{
    const u=db.users.find(x=>x.id===uid);return u?{id:u.id,name:u.name,username:u.username,trainer:u.trainer||{name:u.name}}:null;
  }).filter(Boolean),speciesCount:db.species.filter(p=>p.campaignId===c.id && (!viewer || c.masterId===viewer.id || p.visibleToPlayers!==false)).length,capturedCount:db.captured.filter(x=>x.campaignId===c.id).length,createdAt:c.createdAt};
}
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() { let code; do {code=Array.from(crypto.randomBytes(7)).slice(0,7).map(i=>alphabet[i%alphabet.length]).join('');} while(db.campaigns.some(c=>c.code===code));return code; }
const limitMap=new Map();
function rateLimit(req) {
  const ip=req.socket.remoteAddress||'unknown'; const now=Date.now();
  let rec=limitMap.get(ip); if(!rec||rec.reset<now) rec={count:0,reset:now+15*60*1000};
  rec.count++; limitMap.set(ip,rec);
  if(rec.count>30) fail(429,'Muitas tentativas. Tente novamente mais tarde.');
  if(limitMap.size>5000) for(const [key,value] of limitMap) if(value.reset<now)limitMap.delete(key);
}
function readJSON(req, maxBytes=32768) {
  return new Promise((resolve,reject)=>{
    let chunks=[]; let bytes=0; let ended=false;
    if(!(req.headers['content-type']||'').startsWith('application/json')) return reject(Object.assign(new Error('Envie dados em JSON.'),{status:415}));
    req.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes){if(!ended){ended=true;reject(Object.assign(new Error('Dados muito grandes.'),{status:413}));}return;}chunks.push(chunk);});
    req.on('end',()=>{if(ended)return;try {const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')fail(400,'Dados inválidos.');resolve(value);}catch(e){reject(Object.assign(e,{status:400}));}});
    req.on('error',reject);
  });
}
// Dados de uma espécie: ficha pública compartilhada pelos treinadores; o Pokémon capturado terá outra ficha futuramente.
function nullableNumber(v, min=0, max=99999) {
  if(v===undefined || v===null || v==='')return null;
  const n=Number(v);
  if(!Number.isFinite(n)||n<min||n>max)fail(400,`Número fora do intervalo (${min} a ${max}).`);
  return n;
}
function normalizeSpecies(data, campaignId, existing=null) {
  const name=clean(data.name,45),number=Number(data.number),type1=clean(data.type1,20),type2=clean(data.type2,20);
  if(name.length<2||!Number.isInteger(number)||number<1||number>9999)fail(400,'Informe nome e número de Pokédex válidos.');
  if(!TYPES.has(type1)||(type2&&!TYPES.has(type2))||(type1===type2))fail(400,'Selecione tipos Pokémon válidos.');
  if(db.species.some(p=>p.campaignId===campaignId&&p.id!==existing?.id&&(p.number===number||p.name.toLowerCase()===name.toLowerCase())))fail(409,'Número ou nome já cadastrado nesta campanha.');
  const stats={};for(const key of ['hp','attack','defense','spAttack','spDefense','speed']){
    stats[key]=nullableNumber(data.stats?.[key],1,255);
    if(stats[key]!==null && !Number.isInteger(stats[key]))fail(400,'Os seis status precisam ser números inteiros.');
  }
  const from=nullableNumber(data.evolvesFrom,1,9999),to=nullableNumber(data.evolvesTo,1,9999);
  if(from!==null&&!Number.isInteger(from)||to!==null&&!Number.isInteger(to))fail(400,'A evolução precisa referenciar um número inteiro da Pokédex.');
  if(from===number||to===number)fail(400,'Um Pokémon não pode evoluir para si mesmo.');
  const own=(data.images&&typeof data.images==='object')?data.images:{};
  return {id:existing?.id||id(),campaignId,name,number,type1,type2,
    category:clean(data.category,80),inspirationCountry:clean(data.inspirationCountry,80),
    heightM:nullableNumber(data.heightM,0,1000),weightKg:nullableNumber(data.weightKg,0,99999),
    description:clean(data.description,750),
    abilities:{primary:clean(data.abilities?.primary,60),secondary:clean(data.abilities?.secondary,60),hidden:clean(data.abilities?.hidden,60)},
    stats,evolvesFrom:from,evolvesTo:to,evolutionMethod:clean(data.evolutionMethod,150),
    images: existing?.images||{normal:'',shiny:''},visibleToPlayers:data.visibleToPlayers!==false,
    createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
}
function serveMedia(req,res,pathname){
  const m=pathname.match(/^\/api\/species-media\/([a-f\d-]{36})\/([a-f\d-]{36}-(?:normal|shiny)-[a-f\d-]{36}\.(?:png|jpg|webp))$/);
  if(!m)fail(404,'Imagem não encontrada.');
  const {user}=campaignAccess(req,m[1]);
  const uri=pathname;const sp=db.species.find(x=>x.campaignId===m[1]&&(x.images?.normal===uri||x.images?.shiny===uri));
  if(!sp || (db.campaigns.find(x=>x.id===m[1]).masterId!==user.id&&!db.discoveries.some(d=>d.campaignId===m[1]&&d.speciesId===sp.id&&d.ownerId===user.id)))fail(404,'Imagem não encontrada.');
  const file=path.join(MEDIA_DIR,m[1],m[2]);
  if(!fs.existsSync(file))fail(404,'Arquivo de imagem indisponível.');
  const buf=fs.readFileSync(file);let mime='image/png';if(file.endsWith('.jpg'))mime='image/jpeg';if(file.endsWith('.webp'))mime='image/webp';
  res.writeHead(200,{'Content-Type':mime,'Content-Length':buf.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});res.end(buf);
}
function receiveImage(campaignId,speciesId,data) {
  const sp=db.species.find(x=>x.campaignId===campaignId&&x.id===speciesId);if(!sp)fail(404,'Pokémon não encontrado.');
  if(!['normal','shiny'].includes(data.variant))fail(400,'Escolha imagem normal ou shiny.');
  if(typeof data.base64!=='string'||data.base64.length>Math.ceil(MAX_IMAGE_BYTES*4/3)+8||!/^[a-zA-Z0-9+/]+={0,2}$/.test(data.base64))fail(400,'Imagem inválida ou grande demais.');
  const buf=Buffer.from(data.base64,'base64');if(buf.length<20||buf.length>MAX_IMAGE_BYTES)fail(400,'A imagem deve ter até 20 MB.');
  const isPng=buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  const isJpg=buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff;
  const isWebp=buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';
  if(!isPng&&!isJpg&&!isWebp)fail(400,'Use imagem PNG, JPG ou WEBP válida.');
  const ext=isPng?'png':isJpg?'jpg':'webp';const dir=path.join(MEDIA_DIR,campaignId);fs.mkdirSync(dir,{recursive:true});
  const file=`${speciesId}-${data.variant}-${id()}.${ext}`;
  fs.writeFileSync(path.join(dir,file),buf,{flag:'wx',mode:0o600});
  const old=sp.images?.[data.variant];sp.images||={normal:'',shiny:''};sp.images[data.variant]=`/api/species-media/${campaignId}/${file}`;
  save();
  if(old?.startsWith(`/api/species-media/${campaignId}/`)){try{fs.unlinkSync(path.join(dir,path.basename(old)));}catch{}}
  return sp;
}
function recordDiscovery(campaignId, ownerId, speciesId, status) {
  const old=db.discoveries.find(d=>d.campaignId===campaignId&&d.ownerId===ownerId&&d.speciesId===speciesId);
  if(old){
    if(status==='caught' && old.status!=='caught')old.status='caught';
    else if(status==='seen' && old.status!=='caught')old.status='seen';
    old.updatedAt=new Date().toISOString();return old;
  }
  const fresh={campaignId,ownerId,speciesId,status,updatedAt:new Date().toISOString()};db.discoveries.push(fresh);return fresh;
}
// Migra automaticamente equipes existentes para o histórico de capturas sem perder a Pokédex.
let discoveryMigration=false;
for(const cap of db.captured){
  if(!db.discoveries.some(d=>d.campaignId===cap.campaignId&&d.ownerId===cap.ownerId&&d.speciesId===cap.speciesId&&d.status==='caught')){
    recordDiscovery(cap.campaignId,cap.ownerId,cap.speciesId,'caught');discoveryMigration=true;
  }
}
if(discoveryMigration)save();
// Itens e dinheiro: saldos persistentes separados por campanha e jogador.
const ITEM_CATEGORIES=['Pokébolas','Cura','Batalha','Evolução','Missão','Outros'];
const DEFAULT_ITEMS=[
  ['Poké Ball','Pokébolas','Uma Pokébola comum para tentativas de captura.',0,'🔴'],
  ['Great Ball','Pokébolas','Pokébola de desempenho superior.',0,'🔵'],
  ['Potion','Cura','Recupera 20 HP de um Pokémon não desmaiado.',20,'🧪'],
  ['Super Potion','Cura','Recupera 50 HP de um Pokémon não desmaiado.',50,'💊'],
  ['Antidote','Cura','Item para tratar envenenamento durante a sessão; aplicação narrada pelo Mestre.',0,'💚']
];
let itemMigration=false;
for(const c of db.campaigns){
  if(!db.items.some(item=>item.campaignId===c.id)){
    for(const [name,category,description,healHp,icon] of DEFAULT_ITEMS){
      db.items.push({id:id(),campaignId:c.id,name,category,description,healHp,icon,createdAt:new Date().toISOString()});
    }
    itemMigration=true;
  }
}
if(itemMigration)save();
function getWallet(campaignId,ownerId){return db.wallets.find(w=>w.campaignId===campaignId&&w.ownerId===ownerId)?.balance||0;}
function getQuantity(campaignId,ownerId,itemId){return db.inventory.find(x=>x.campaignId===campaignId&&x.ownerId===ownerId&&x.itemId===itemId)?.quantity||0;}
function validateInventoryOwner(c,ownerId){if(!c.memberIds.includes(ownerId))fail(400,'Selecione um jogador da campanha.');}
function addHistory(c,ownerId,kind,delta,actorId,itemId=null,details=''){
  db.itemHistory.push({id:id(),campaignId:c.id,ownerId,kind,itemId,delta,actorId,details,at:new Date().toISOString()});
  if(db.itemHistory.length>3000)db.itemHistory.splice(0,db.itemHistory.length-3000);
}
function changeItemBalance(c,ownerId,itemId,delta,actorId,kind='adjust',details=''){
  const item=db.items.find(x=>x.campaignId===c.id&&x.id===itemId);
  if(!item)fail(404,'Item não encontrado na campanha.');
  const original=getQuantity(c.id,ownerId,itemId),quantity=original+delta;
  if(quantity<0)fail(409,'O treinador não possui itens suficientes.');
  if(quantity>9999)fail(400,'Limite de 9999 unidades por item.');
  let row=db.inventory.find(x=>x.campaignId===c.id&&x.ownerId===ownerId&&x.itemId===itemId);
  if(!row){row={campaignId:c.id,ownerId,itemId,quantity:0};db.inventory.push(row);}
  row.quantity=quantity;addHistory(c,ownerId,kind,delta,actorId,itemId,details);
  return row;
}
function normalItem(data,c,existing=null){
  const name=clean(data.name,65),category=clean(data.category,25),description=clean(data.description,400);
  const icon=clean(data.icon||'🎁',6);
  if(name.length<2)fail(400,'O nome do item precisa ter pelo menos 2 caracteres.');
  if(!ITEM_CATEGORIES.includes(category))fail(400,'Categoria de item inválida.');
  if(db.items.some(x=>x.campaignId===c.id&&x.id!==existing?.id&&x.name.toLowerCase()===name.toLowerCase()))fail(409,'Já existe um item com este nome.');
  const healHp=numberInt(data.healHp??0,0,9999,'Recuperação de HP');
  if(healHp>0&&category!=='Cura')fail(400,'Recuperação de HP exige categoria Cura.');
  return {id:existing?.id||id(),campaignId:c.id,name,category,description,icon,healHp,createdAt:existing?.createdAt||new Date().toISOString()};
}
function publicSpeciesFor(user,p) {
  const c=db.campaigns.find(c=>c.id===p.campaignId);
  if(!c)return null;
  if(c.masterId===user.id)return p;
  if(!c.memberIds.includes(user.id))return null;
  const learned=db.discoveries.some(d=>d.campaignId===c.id&&d.ownerId===user.id&&d.speciesId===p.id);
  // Espécie oculta não ocupa um espaço na Pokédex de quem não a descobriu.
  if(p.visibleToPlayers===false&&!learned)return null;
  // Não enviar nome, tipos, descrições nem URLs de imagens de espécies desconhecidas.
  if(!learned)return {id:p.id,campaignId:p.campaignId,number:p.number,unknown:true,visibleToPlayers:true};
  return p;
}
function safeCaptured(item) {
  return {id:item.id,campaignId:item.campaignId,ownerId:item.ownerId,speciesId:item.speciesId,nickname:item.nickname,level:item.level,currentHp:item.currentHp,maxHp:item.maxHp,experience:item.experience,shiny:item.shiny,gender:item.gender,ability:item.ability,moves:item.moves,notes:item.notes,inTeam:item.inTeam,createdAt:item.createdAt,updatedAt:item.updatedAt};
}
function numberInt(value, min, max, name) {
  const n=Number(value);
  if(!Number.isInteger(n)||n<min||n>max)fail(400,`${name}: use um número inteiro entre ${min} e ${max}.`);
  return n;
}
function ownedCapture(user,campaign,cap) {
  if(!cap||cap.campaignId!==campaign.id)fail(404,'Pokémon capturado não encontrado.');
  if(user.id!==campaign.masterId && cap.ownerId!==user.id)fail(403,'Este Pokémon pertence a outro treinador.');
}
function applyCaptureValues(cap,data,campaign,creating=false){
  if(creating || data.speciesId!==undefined){
    const species=db.species.find(sp=>sp.id===data.speciesId && sp.campaignId===campaign.id);
    if(!species)fail(404,'Espécie não cadastrada nesta campanha.');
    cap.speciesId=species.id;
  }
  const level=numberInt(data.level??cap.level??1,1,100,'Nível');
  const maxHp=numberInt(data.maxHp??cap.maxHp??10,1,9999,'HP máximo');
  const currentHp=numberInt(data.currentHp??cap.currentHp??maxHp,0,maxHp,'HP atual');
  const experience=numberInt(data.experience??cap.experience??0,0,999999999,'Experiência');
  const gender=clean(data.gender??cap.gender??'Desconhecido',20);
  if(!['Macho','Fêmea','Sem gênero','Desconhecido'].includes(gender))fail(400,'Gênero inválido.');
  const moves = data.moves===undefined ? (cap.moves||[]) : data.moves;
  if(!Array.isArray(moves)||moves.length>4||moves.some(x=>typeof x!=='string'||x.length>60))fail(400,'Adicione no máximo quatro golpes com até 60 caracteres.');
  Object.assign(cap,{level,maxHp,currentHp,experience,gender,moves:moves.map(x=>clean(x,60)).filter(Boolean),shiny:data.shiny===undefined?!!cap.shiny:data.shiny===true,ability:clean(data.ability??cap.ability??'',60),nickname:clean(data.nickname??cap.nickname??'',45),notes:clean(data.notes??cap.notes??'',350)});
  cap.updatedAt=new Date().toISOString();
  return cap;
}
async function api(req,res,url) {
  const pathname=url.pathname;
  if(req.method==='GET' && pathname==='/api/health')return response(res,200,{ok:true,product:'EvoLink',version:'0.6.0'});
  // Convites podem ser validados sem login para evitar criar conta com código expirado.
  const inviteRoute=pathname.match(/^\/api\/invites\/([A-Za-z0-9-]{6,20})$/);
  if(req.method==='GET' && inviteRoute) {
    const code=inviteRoute[1].toUpperCase().replace(/-/g,'');
    const campaign=db.campaigns.find(c=>c.code===code);
    if(!campaign)fail(404,'Convite inválido ou substituído. Peça um novo link ao Mestre.');
    const gm=db.users.find(u=>u.id===campaign.masterId);
    return response(res,200,{valid:true,campaign:{name:campaign.name,masterName:gm?.name||'Mestre'}});
  }
  if(req.method==='GET'&&pathname.startsWith('/api/species-media/'))return serveMedia(req,res,pathname);
  if(req.method==='GET' && pathname==='/api/me') {
    const user=currentUser(req);return response(res,200,{user:user?safeUser(user):null,campaigns:user?db.campaigns.filter(c=>c.masterId===user.id||c.memberIds.includes(user.id)).map(c=>campaignInfo(c,user)):[],species:user?db.species.map(p=>publicSpeciesFor(user,p)).filter(Boolean):[],discoveries:user?db.discoveries.filter(d=>db.campaigns.some(c=>c.id===d.campaignId&&(c.masterId===user.id||(c.memberIds.includes(user.id)&&d.ownerId===user.id)))):[],captured:user?db.captured.filter(p=>db.campaigns.some(c=>c.id===p.campaignId&&(c.masterId===user.id||(c.memberIds.includes(user.id)&&p.ownerId===user.id)))).map(safeCaptured):[],items:user?db.items.filter(x=>db.campaigns.some(c=>c.id===x.campaignId&&(c.masterId===user.id||c.memberIds.includes(user.id)))):[],inventory:user?db.inventory.filter(x=>db.campaigns.some(c=>c.id===x.campaignId&&(c.masterId===user.id||(c.memberIds.includes(user.id)&&x.ownerId===user.id)))):[],wallets:user?db.wallets.filter(x=>db.campaigns.some(c=>c.id===x.campaignId&&(c.masterId===user.id||(c.memberIds.includes(user.id)&&x.ownerId===user.id)))):[],itemHistory:user?db.itemHistory.filter(x=>db.campaigns.some(c=>c.id===x.campaignId&&(c.masterId===user.id||(c.memberIds.includes(user.id)&&x.ownerId===user.id)))).slice(-150):[]});
  }
  if (req.method!=='POST' && req.method!=='DELETE') fail(405,'Método não permitido.');
  // Rejeita requisições cross-site quando o navegador informa a origem.
  const origin=req.headers.origin;
  const acceptedOrigin=process.env.APP_ORIGIN || `${req.socket.encrypted?'https':'http'}://${req.headers.host}`;
  if(origin && origin!==acceptedOrigin && !(process.env.TRUST_PROXY==='1' && origin===`https://${req.headers.host}`)) fail(403,'Origem não autorizada.');
  if(req.method==='POST' && pathname==='/api/logout') {
    const token=cookie(req,'evolink_session'); if(token){db.sessions=db.sessions.filter(s=>s.hash!==sessionHash(token));save();}
    res.setHeader('Set-Cookie','evolink_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');return response(res,200,{ok:true});
  }
  const data=req.method==='POST'?await readJSON(req,pathname.endsWith('/image')?MAX_IMAGE_BODY_BYTES:pathname.endsWith('/import')?2_500_000:32768):{};
  if(req.method==='POST' && pathname==='/api/register') {
    rateLimit(req);
    const username=clean(data.username,25).toLowerCase();const password=data.password;const name=clean(data.name,40);const role=data.role;
    if(!/^[a-z0-9_.-]{3,24}$/.test(username))fail(400,'Usuário: de 3 a 24 caracteres, sem espaços ou acentos.');
    if(typeof password!=='string'||password.length<8||password.length>128)fail(400,'A senha deve ter de 8 a 128 caracteres.');
    if(name.length<2)fail(400,'Digite seu nome de treinador (mínimo 2 caracteres).');
    if(!['mestre','jogador'].includes(role))fail(400,'Selecione Mestre ou Jogador.');
    if(db.users.some(u=>u.username===username))fail(409,'Este nome de usuário já está em uso.');
    const user={id:id(),username,name,role,passwordHash:hashPassword(password),trainer:{name,hometown:'',bio:''},createdAt:new Date().toISOString()};
    db.users.push(user);save();createSession(res,req,user);return response(res,201,{user:safeUser(user)});
  }
  if(req.method==='POST' && pathname==='/api/login') {
    rateLimit(req);
    const username=clean(data.username,25).toLowerCase();const password=data.password;
    const user=db.users.find(u=>u.username===username);
    if(!user||typeof password!=='string'||!verifyPassword(password,user.passwordHash))fail(401,'Usuário ou senha incorretos.');
    if(data.role && user.role!==data.role)fail(403,`Esta conta é do tipo ${user.role==='mestre'?'Mestre':'Jogador'}. Selecione o perfil correto.`);
    createSession(res,req,user);return response(res,200,{user:safeUser(user)});
  }
  if(req.method==='POST' && pathname==='/api/campaigns') {
    const user=master(req);const name=clean(data.name,60);
    if(name.length<3)fail(400,'O nome da campanha precisa ter pelo menos 3 caracteres.');
    if(db.campaigns.filter(c=>c.masterId===user.id).length>=20)fail(400,'Limite de 20 campanhas por Mestre.');
    const c={id:id(),name,masterId:user.id,memberIds:[],code:newCode(),createdAt:new Date().toISOString()};db.campaigns.push(c);for(const [itemName,category,description,healHp,icon] of DEFAULT_ITEMS){db.items.push({id:id(),campaignId:c.id,name:itemName,category,description,healHp,icon,createdAt:new Date().toISOString()});}save();return response(res,201,{campaign:campaignInfo(c)});
  }
  if(req.method==='POST' && pathname==='/api/campaigns/join') {
    const user=auth(req);if(user.role!=='jogador')fail(403,'Entre com uma conta de Jogador.');
    const code=clean(data.code,20).toUpperCase().replace(/[-\s]/g,'');const c=db.campaigns.find(c=>c.code===code);
    if(!c)fail(404,'Código não encontrado neste servidor. Abra o mesmo link HTTPS que o Mestre utiliza ou peça um novo código.');
    if(!c.memberIds.includes(user.id)) {if(c.memberIds.length>=100)fail(400,'Esta campanha atingiu o limite de jogadores.');c.memberIds.push(user.id);save();}
    return response(res,200,{campaign:campaignInfo(c)});
  }
  const memberRoute=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/remove-member$/);
  if(req.method==='POST'&&memberRoute){const c=owner(req,memberRoute[1]);const memberId=clean(data.memberId,50);c.memberIds=c.memberIds.filter(x=>x!==memberId);save();return response(res,200,{campaign:campaignInfo(c)});}
  const recodeRoute=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/reissue-code$/);
  if(req.method==='POST'&&recodeRoute){const c=owner(req,recodeRoute[1]);c.code=newCode();save();return response(res,200,{campaign:campaignInfo(c)});}
  if(req.method==='POST'&&pathname==='/api/trainer'){
    const u=auth(req);if(u.role!=='jogador')fail(403,'Esta ficha é destinada aos jogadores.');
    const name=clean(data.name,40);if(name.length<2)fail(400,'Nome de treinador muito curto.');
    u.trainer={name,hometown:clean(data.hometown,60),bio:clean(data.bio,300)};save();return response(res,200,{trainer:u.trainer});
  }
  // O Mestre registra encontros; jogadores não podem marcar Pokémon por conta própria.
  const encounter=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/discoveries$/);
  if(req.method==='POST'&&encounter){
    const c=owner(req,encounter[1]);
    const ownerId=clean(data.ownerId,50),speciesId=clean(data.speciesId,50),status=clean(data.status,20);
    if(!c.memberIds.includes(ownerId))fail(400,'Treinador não participa desta campanha.');
    if(!db.species.some(p=>p.id===speciesId&&p.campaignId===c.id))fail(404,'Espécie não encontrada.');
    if(!['seen','unseen'].includes(status))fail(400,'Estado inválido: use visto ou não visto.');
    if(status==='unseen'){
      if(db.captured.some(p=>p.campaignId===c.id&&p.ownerId===ownerId&&p.speciesId===speciesId))fail(409,'Não é possível ocultar uma espécie que este treinador possui.');
      db.discoveries=db.discoveries.filter(d=>!(d.campaignId===c.id&&d.ownerId===ownerId&&d.speciesId===speciesId));
    }else recordDiscovery(c.id,ownerId,speciesId,'seen');
    save();return response(res,200,{ok:true,status});
  }
  // Inventário e dinheiro: operações validadas e com registro auditável.
  const itemCreate=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/items$/);
  if(req.method==='POST'&&itemCreate){
    const c=owner(req,itemCreate[1]);
    if(db.items.filter(x=>x.campaignId===c.id).length>=MAX_ITEMS_PER_CAMPAIGN)fail(400,'Limite de 150 tipos de itens por campanha.');
    const item=normalItem(data,c);db.items.push(item);save();return response(res,201,{item});
  }
  const itemEdit=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/items\/([a-f\d-]+)\/update$/);
  if(req.method==='POST'&&itemEdit){
    const c=owner(req,itemEdit[1]);const i=db.items.findIndex(x=>x.campaignId===c.id&&x.id===itemEdit[2]);
    if(i<0)fail(404,'Item não encontrado.');const item=normalItem(data,c,db.items[i]);db.items[i]=item;save();return response(res,200,{item});
  }
  const invAdjust=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/inventory\/adjust$/);
  if(req.method==='POST'&&invAdjust){
    const c=owner(req,invAdjust[1]);const ownerId=clean(data.ownerId,50);validateInventoryOwner(c,ownerId);
    const delta=numberInt(data.delta,-9999,9999,'Quantidade');if(delta===0)fail(400,'Informe uma quantidade diferente de zero.');
    const row=changeItemBalance(c,ownerId,clean(data.itemId,50),delta,c.masterId,'adjust');save();return response(res,200,{inventory:row});
  }
  const walletAdjust=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/wallet\/adjust$/);
  if(req.method==='POST'&&walletAdjust){
    const c=owner(req,walletAdjust[1]);const ownerId=clean(data.ownerId,50);validateInventoryOwner(c,ownerId);
    const delta=numberInt(data.delta,-MAX_WALLET,MAX_WALLET,'Valor');if(delta===0)fail(400,'Informe um valor diferente de zero.');
    const balance=getWallet(c.id,ownerId)+delta;
    if(balance<0||balance>MAX_WALLET)fail(409,'Saldo insuficiente ou limite da carteira excedido.');
    let wallet=db.wallets.find(x=>x.campaignId===c.id&&x.ownerId===ownerId);
    if(!wallet){wallet={campaignId:c.id,ownerId,balance:0};db.wallets.push(wallet);}
    wallet.balance=balance;addHistory(c,ownerId,'money',delta,c.masterId,null,clean(data.reason,120));save();return response(res,200,{wallet});
  }
  const useItem=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/items\/([a-f\d-]+)\/use$/);
  if(req.method==='POST'&&useItem){
    const {user,campaign}=campaignAccess(req,useItem[1]);
    if(user.id===campaign.masterId)fail(403,'O Mestre distribui itens pelo painel; o jogador utiliza os próprios itens.');
    const item=db.items.find(x=>x.id===useItem[2]&&x.campaignId===campaign.id);
    if(!item)fail(404,'Item não encontrado.');
    if(getQuantity(campaign.id,user.id,item.id)<1)fail(409,'Você não possui este item.');
    let cap=null,heal=0;
    if(item.healHp>0){
      cap=db.captured.find(x=>x.id===data.capturedId&&x.campaignId===campaign.id&&x.ownerId===user.id);
      if(!cap)fail(400,'Escolha um Pokémon seu para receber a cura.');
      if(cap.currentHp<=0)fail(409,'Este Pokémon está desmaiado e não pode receber esta poção.');
      if(cap.currentHp>=cap.maxHp)fail(409,'Este Pokémon já está com HP cheio.');
      heal=Math.min(item.healHp,cap.maxHp-cap.currentHp);
    }
    changeItemBalance(campaign,user.id,item.id,-1,user.id,'use',cap?`Cura aplicada em ${cap.nickname||cap.speciesId}`:'Uso narrativo');
    if(cap){cap.currentHp+=heal;cap.updatedAt=new Date().toISOString();}
    save();return response(res,200,{ok:true,itemId:item.id,healed:heal,captured:cap?safeCaptured(cap):null});
  }
  // Pokémon individuais: somente o Mestre distribui capturas; cada treinador controla sua equipe.
  const capturedRoute=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/captured$/);
  if(req.method==='POST'&&capturedRoute){
    const c=owner(req,capturedRoute[1]);const ownerId=clean(data.ownerId,50);
    if(!c.memberIds.includes(ownerId))fail(400,'Selecione um jogador que participa desta campanha.');
    if(db.captured.filter(p=>p.campaignId===c.id&&p.ownerId===ownerId).length>=MAX_CAPTURED_PER_PLAYER)fail(400,'Este treinador atingiu o limite de armazenamento.');
    const cap={id:id(),campaignId:c.id,ownerId,inTeam:false,createdAt:new Date().toISOString()};
    applyCaptureValues(cap,data,c,true);
    if(data.inTeam===true){
      if(db.captured.filter(p=>p.campaignId===c.id&&p.ownerId===ownerId&&p.inTeam).length>=6)fail(400,'Equipe cheia: máximo de seis Pokémon.');
      cap.inTeam=true;
    }
    db.captured.push(cap);recordDiscovery(c.id,ownerId,cap.speciesId,'caught');save();return response(res,201,{captured:safeCaptured(cap)});
  }
  const capEdit=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/captured\/([a-f\d-]+)\/update$/);
  if(req.method==='POST'&&capEdit){
    const c=owner(req,capEdit[1]);const cap=db.captured.find(p=>p.id===capEdit[2]&&p.campaignId===c.id);
    if(!cap)fail(404,'Pokémon não encontrado.');
    if(data.ownerId!==undefined&&data.ownerId!==cap.ownerId){
      if(!c.memberIds.includes(data.ownerId))fail(400,'Treinador inválido.');
      if(db.captured.filter(p=>p.campaignId===c.id&&p.ownerId===data.ownerId).length>=MAX_CAPTURED_PER_PLAYER)fail(400,'Armazenamento cheio.');
      if(cap.inTeam&&db.captured.filter(p=>p.campaignId===c.id&&p.ownerId===data.ownerId&&p.inTeam).length>=6)fail(400,'A equipe do novo treinador está cheia.');
      cap.ownerId=data.ownerId;
    }
    applyCaptureValues(cap,data,c);recordDiscovery(c.id,cap.ownerId,cap.speciesId,'caught');save();return response(res,200,{captured:safeCaptured(cap)});
  }
  const capCustomize=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/captured\/([a-f\d-]+)\/customize$/);
  if(req.method==='POST'&&capCustomize){
    const {user,campaign}=campaignAccess(req,capCustomize[1]);const cap=db.captured.find(p=>p.id===capCustomize[2]);ownedCapture(user,campaign,cap);
    // O jogador não pode alterar HP, nível, espécie, experiência ou propriedade.
    cap.nickname=clean(data.nickname,45);cap.notes=clean(data.notes,350);cap.updatedAt=new Date().toISOString();save();
    return response(res,200,{captured:safeCaptured(cap)});
  }
  const capTeam=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/captured\/([a-f\d-]+)\/team$/);
  if(req.method==='POST'&&capTeam){
    const {user,campaign}=campaignAccess(req,capTeam[1]);const cap=db.captured.find(p=>p.id===capTeam[2]);ownedCapture(user,campaign,cap);
    if(typeof data.inTeam!=='boolean')fail(400,'Indique se o Pokémon deve entrar na equipe.');
    if(data.inTeam&&!cap.inTeam&&db.captured.filter(p=>p.campaignId===campaign.id&&p.ownerId===cap.ownerId&&p.inTeam).length>=6)fail(400,'Equipe cheia: máximo de seis Pokémon.');
    cap.inTeam=data.inTeam;cap.updatedAt=new Date().toISOString();save();return response(res,200,{captured:safeCaptured(cap)});
  }
  const capDelete=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/captured\/([a-f\d-]+)$/);
  if(req.method==='DELETE'&&capDelete){
    const c=owner(req,capDelete[1]);const i=db.captured.findIndex(p=>p.id===capDelete[2]&&p.campaignId===c.id);
    if(i<0)fail(404,'Pokémon não encontrado.');db.captured.splice(i,1);save();return response(res,200,{ok:true});
  }
  const speciesRoute=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/species$/);
  if(req.method==='POST' && speciesRoute) {
    const c=owner(req,speciesRoute[1]);
    if(db.species.filter(p=>p.campaignId===c.id).length>=1000)fail(400,'Limite de 1000 espécies por campanha.');
    const p=normalizeSpecies(data,c.id);db.species.push(p);save();return response(res,201,{species:p});
  }
  const importRoute=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/species\/import$/);
  if(req.method==='POST'&&importRoute){
    const c=owner(req,importRoute[1]);
    if(!Array.isArray(data.species)||!data.species.length||data.species.length>200)fail(400,'Envie uma lista de 1 a 200 Pokémon.');
    const incoming=[];const nums=new Set(),names=new Set();
    for(const item of data.species){
      const sp=normalizeSpecies(item,c.id);
      if(nums.has(sp.number)||names.has(sp.name.toLowerCase()))fail(409,'A importação contém números ou nomes repetidos.');
      nums.add(sp.number);names.add(sp.name.toLowerCase());incoming.push(sp);
    }
    if(db.species.filter(p=>p.campaignId===c.id).length+incoming.length>1000)fail(400,'Limite de 1000 espécies por campanha.');
    db.species.push(...incoming);save();return response(res,201,{imported:incoming.length});
  }
  const editRoute=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/species\/([a-f\d-]+)\/update$/);
  if(req.method==='POST'&&editRoute){
    owner(req,editRoute[1]);const i=db.species.findIndex(x=>x.campaignId===editRoute[1]&&x.id===editRoute[2]);if(i<0)fail(404,'Pokémon não encontrado.');
    const sp=normalizeSpecies(data,editRoute[1],db.species[i]);db.species[i]=sp;save();return response(res,200,{species:sp});
  }
  const imageRoute=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/species\/([a-f\d-]+)\/image$/);
  if(req.method==='POST'&&imageRoute){owner(req,imageRoute[1]);const sp=receiveImage(imageRoute[1],imageRoute[2],data);return response(res,200,{species:sp});}
  const deleteRoute=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/species\/([a-f\d-]+)$/);
  if(req.method==='DELETE'&&deleteRoute) {
    owner(req,deleteRoute[1]);if(db.captured.some(x=>x.campaignId===deleteRoute[1]&&x.speciesId===deleteRoute[2]))fail(409,'Este Pokémon pertence a uma equipe ou armazenamento. Remova as capturas antes de excluir a espécie.');const old=db.species.length;db.species=db.species.filter(s=>!(s.campaignId===deleteRoute[1]&&s.id===deleteRoute[2]));if(old===db.species.length)fail(404,'Pokémon não encontrado.');db.discoveries=db.discoveries.filter(d=>!(d.campaignId===deleteRoute[1]&&d.speciesId===deleteRoute[2]));save();return response(res,200,{ok:true});
  }
  fail(404,'Função não encontrada.');
}
function serveStatic(req,res,url) {
  if(req.method!=='GET'&&req.method!=='HEAD')return response(res,405,{error:'Método não permitido.'});
  const p=url.pathname==='/'?'/index.html':url.pathname;
  const files={
    '/index.html':['index.html','text/html; charset=utf-8'],
    '/demo.html':['demo.html','text/html; charset=utf-8'],
    '/app.js':['app.js','text/javascript; charset=utf-8'],
    '/style.css':['style.css','text/css; charset=utf-8'],
    '/pokedex-template.json':['pokedex-template.json','application/json; charset=utf-8'],
    '/pokedex-schema.json':['pokedex-schema.json','application/json; charset=utf-8'],
    '/landscape.svg':['landscape.svg','image/svg+xml'],
    '/manifest.webmanifest':['manifest.webmanifest','application/manifest+json'],
    '/sw.js':['sw.js','text/javascript; charset=utf-8'],
    '/icons/icon-192.png':['icons/icon-192.png','image/png'],
    '/icons/icon-512.png':['icons/icon-512.png','image/png']
  };
  if(!files[p])return response(res,404,{error:'Página não encontrada.'});
  const [file,type]=files[p];const data=fs.readFileSync(path.join(PUBLIC,file));
  res.writeHead(200,{'Content-Type':type,'Content-Length':data.length,'X-Content-Type-Options':'nosniff','Cache-Control':p==='/sw.js'?'no-cache':'public, max-age=1800','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none';"});
  res.end(req.method==='HEAD'?undefined:data);
}
function createServer() {
  return http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
      if(url.pathname.startsWith('/api/'))await api(req,res,url);
      else serveStatic(req,res,url);
    } catch(err) {
      if(!res.headersSent)response(res,err.status||500,{error:err.status?err.message:'Erro interno. Tente novamente.'});
      if(!err.status)console.error(err);
    }
  });
}
if(require.main===module){createServer().listen(PORT,'0.0.0.0',()=>console.log(`EvoLink pronto em http://localhost:${PORT}`));}
module.exports={createServer};
