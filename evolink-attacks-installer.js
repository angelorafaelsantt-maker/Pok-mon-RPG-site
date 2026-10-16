'use strict';
// Add-on de ataques para EvoLink. Executar ao construir a imagem Docker, depois de copiar app/server/public.
// Preserva todos os dados: NAO altera nem limpa /app/data.
const fs=require('node:fs');
const path=require('node:path');
const root=process.env.EVOLINK_BUILD_ROOT||'/app';
const sourceDir=__dirname;
const serverFile=path.join(root,'server.js');
const appFile=path.join(root,'public','app.js');
const indexFile=path.join(root,'public','index.html');
const addonFile=path.join(root,'public','attacks-addon.js');
const marker='EVO_ATTACKS_V7';
function patch(content,oldValue,newValue,label){
  const count=content.split(oldValue).length-1;
  if(count!==1)throw new Error('Nao foi possivel aplicar '+label+': ocorrencias '+count);
  return content.replace(oldValue,newValue);
}
let server=fs.readFileSync(serverFile,'utf8');
let app=fs.readFileSync(appFile,'utf8');
let html=fs.readFileSync(indexFile,'utf8');
if(server.includes(marker)||html.includes('attacks-addon.js')){
  console.log('EvoLink Ataques: add-on ja instalado.');process.exit(0);
}
server=patch(server,'db.itemHistory ||= [];','db.itemHistory ||= [];\ndb.moves ||= []; // '+marker+' - ataques adaptados por campanha','db');
const normalize=String.raw`
function evoAttackNormalize(data,campaignId,old=null){
  const name=clean(data.name,80),type=clean(data.type,20),category=clean(data.category,20);
  const officialId=data.officialId==null||data.officialId===''?null:numberInt(data.officialId,1,10018,'ID do ataque');
  if(name.length<2||!TYPES.has(type)||!['Físico','Especial','Status'].includes(category))fail(400,'Nome, tipo ou categoria inválidos.');
  const pp=nullableNumber(data.pp,0,99),accuracy=nullableNumber(data.accuracy,0,100);
  if((pp!=null&&!Number.isInteger(pp))||(accuracy!=null&&!Number.isInteger(accuracy)))fail(400,'PP e precisão precisam ser números inteiros.');
  if(db.moves.some(m=>m.campaignId===campaignId&&m.id!==old?.id&&(officialId!=null?m.officialId===officialId:(m.officialId==null&&m.name.toLowerCase()===name.toLowerCase()))))fail(409,'Este ataque já existe na campanha.');
  return {id:old?.id||id(),campaignId,officialId,name,type,category,pp,accuracy,
    damage:clean(data.damage,120),effect:clean(data.effect,650),notes:clean(data.notes,650),
    createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
}
`;
server=patch(server,'async function api(req,res,url) {',normalize+'\nasync function api(req,res,url) {','normalização');
const catalogRoute=String.raw`
  if(req.method==='GET'&&pathname==='/api/moves/catalog'){
    auth(req);
    const count=Number(process.env.EVOLINK_MOVES_CATALOG_COUNT||0);
    if(count<1||count>10)fail(503,'Catálogo oficial não configurado neste Railway.');
    let raw='';for(let i=1;i<=count;i++)raw+=process.env['EVOLINK_MOVES_CATALOG_'+i]||'';
    let moves;try{moves=JSON.parse(raw);}catch{fail(503,'Catálogo oficial temporariamente indisponível.');}
    return response(res,200,{moves});
  }
`;
server=patch(server,"  if(req.method==='GET' && pathname==='/api/health')",catalogRoute+"  if(req.method==='GET' && pathname==='/api/health')",'catálogo oficial');
server=patch(server,'itemHistory:user?db.itemHistory.filter(',"moves:user?db.moves.filter(m=>db.campaigns.some(c=>c.id===m.campaignId&&(c.masterId===user.id||c.memberIds.includes(user.id)))).map(m=>user.role==='mestre'?m:{...m,notes:''}):[],itemHistory:user?db.itemHistory.filter(",'consulta por campanha');
const routes=String.raw`
  const attackCreate=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/moves$/);
  if(req.method==='POST'&&attackCreate){
    const c=owner(req,attackCreate[1]);
    if(db.moves.filter(m=>m.campaignId===c.id).length>=1500)fail(400,'Limite de ataques personalizados atingido.');
    const item=evoAttackNormalize(data,c.id);db.moves.push(item);save();return response(res,201,{move:item});
  }
  const attackUpdate=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/moves\/([a-f\d-]+)\/update$/);
  if(req.method==='POST'&&attackUpdate){
    const c=owner(req,attackUpdate[1]);
    const i=db.moves.findIndex(m=>m.id===attackUpdate[2]&&m.campaignId===c.id);
    if(i<0)fail(404,'Ataque não encontrado.');
    const item=evoAttackNormalize(data,c.id,db.moves[i]);
    if(item.officialId!==db.moves[i].officialId)fail(400,'A origem do ataque não pode mudar.');
    db.moves[i]=item;save();return response(res,200,{move:item});
  }
  const attackDelete=pathname.match(/^\/api\/campaigns\/([a-f\d-]+)\/moves\/([a-f\d-]+)$/);
  if(req.method==='DELETE'&&attackDelete){
    const c=owner(req,attackDelete[1]);
    const i=db.moves.findIndex(m=>m.id===attackDelete[2]&&m.campaignId===c.id);
    if(i<0)fail(404,'Ataque não encontrado.');
    db.moves.splice(i,1);save();return response(res,200,{ok:true});
  }
`;
server=patch(server,"  fail(404,'Função não encontrada.');\n}\nfunction serveStatic",routes+"  fail(404,'Função não encontrada.');\n}\nfunction serveStatic",'rotas do Mestre');
server=patch(server,"'/app.js':['app.js','text/javascript; charset=utf-8'],","'/app.js':['app.js','text/javascript; charset=utf-8'],\n    '/attacks-addon.js':['attacks-addon.js','text/javascript; charset=utf-8'],",'arquivo frontend');
app=patch(app,'state.items=r.items||[];state.inventory=r.inventory||[];',"state.items=r.items||[];state.moves=r.moves||[];state.inventory=r.inventory||[];",'lista de ataques no refresh');
html=patch(html,'<script src="/app.js" defer></script>', '<script src="/app.js" defer></script>\n  <script src="/attacks-addon.js?v7" defer></script>','script do catálogo');
const addon=fs.readFileSync(path.join(sourceDir,'attacks-addon.js'),'utf8');
const vm=require('node:vm');
new vm.Script(server,{filename:'server.js'});
new vm.Script(app,{filename:'app.js'});
new vm.Script(addon,{filename:'attacks-addon.js'});
// Só grava depois de validar os três arquivos.
fs.writeFileSync(serverFile,server);
fs.writeFileSync(appFile,app);
fs.writeFileSync(indexFile,html);
fs.writeFileSync(addonFile,addon);
console.log('EvoLink Ataques v7 instalado sem alterar dados existentes.');
