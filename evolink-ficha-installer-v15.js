'use strict';
/** EvoLink v15 — instalação da ficha de treinador, sobre a base v14.
 * O instalador altera somente os arquivos de aplicação do container.
 * Não modifica nem substitui o diretório persistente DATA_DIR (/app/data).
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.EVOLINK_BUILD_ROOT || '/app';
const publicDir = path.join(root, 'public');
const serverFile = path.join(root, 'server.js');
const appFile = path.join(publicDir, 'app.js');
const cssFile = path.join(publicDir, 'style.css');
const ui = fs.readFileSync(path.join(__dirname, 'evolink-ficha-v15-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'evolink-ficha-v15.css'), 'utf8');
function replaceOne(source, oldValue, newValue, what) {
  const count = source.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`EvoLink v15: âncora ${what} mudou (${count} ocorrências).`);
  return source.replace(oldValue, newValue);
}
function replaceSpan(source, begin, end, replacement, what) {
  const start = source.indexOf(begin);
  const finish = start < 0 ? -1 : source.indexOf(end, start + begin.length);
  if (start < 0 || finish < 0 || source.indexOf(begin, start + begin.length) >= 0)
    throw new Error(`EvoLink v15: não foi possível localizar ${what}.`);
  return source.slice(0, start) + replacement + '\n' + source.slice(finish);
}
let server = fs.readFileSync(serverFile, 'utf8');
let app = fs.readFileSync(appFile, 'utf8');
let style = fs.readFileSync(cssFile, 'utf8');
if (app.includes('function coTrainerSheet(')) {
  if (!server.includes('appearance:clean(data.appearance,3000)')) throw new Error('Instalação anterior incompleta.');
  console.log('EvoLink v15: ficha já instalada.');
  process.exit(0);
}
server = replaceOne(server,
  'trainer:u.trainer||{name:u.name}',
  "trainer:(!viewer||viewer.id===c.masterId)?(u.trainer||{name:u.name}):{name:u.trainer?.name||u.name,image:u.trainer?.image||''}",
  'privacidade de campanha');
server = replaceOne(server,
  'u.trainer={...u.trainer,name,hometown:clean(data.hometown,60),bio:clean(data.bio,300)};save();return response(res,200,{trainer:u.trainer});',
  `const ageRaw=data.age;let age=null;
     if(ageRaw!==''&&ageRaw!==null&&ageRaw!==undefined){age=Number(ageRaw);if(!Number.isInteger(age)||age<0||age>120)fail(400,'Informe uma idade entre 0 e 120 anos.');}
     u.trainer={...u.trainer,name,age,dream:clean(data.dream,160),profession:clean(data.profession,100),history:clean(data.history,6000),appearance:clean(data.appearance,3000),hometown:clean(data.hometown,60)||u.trainer?.hometown||'',bio:u.trainer?.bio||''};save();return response(res,200,{trainer:u.trainer});`,
  'salvamento de ficha');
// Sobrescreve apenas a antiga página Perfil, preservando Pokédex, equipe e inventário.
app = replaceSpan(app, 'function dashboardProfile(){', 'const itemCategories=', ui, 'tela de perfil');
app = replaceOne(app, "['perfil','👤','Perfil']", "['perfil','👤',u.role==='mestre'?'Fichas':'Ficha']", 'menu de fichas');
// A demonstração pode visualizar fichas sem revelar todas as informações a outros jogadores.
app = replaceSpan(app, 'function demoC(c){', 'function demoAPI(',
  `function demoC(c){return {id:c.id,name:c.name,code:c.code,masterName:demoDB.users.find(u=>u.id===c.masterId)?.name||'Mestre',members:c.memberIds.map(i=>demoDB.users.find(u=>u.id===i)).filter(Boolean).map(u=>({id:u.id,name:u.name,username:u.username,trainer:c.masterId===demoDB.userId?u.trainer:{name:u.trainer?.name||u.name,image:u.trainer?.image||''}})),speciesCount:demoDB.species.filter(p=>p.campaignId===c.id&&(c.masterId===demoDB.userId||p.visibleToPlayers!==false)).length,createdAt:c.createdAt};}`, 'membros da demo');
app = replaceOne(app,
  "if(url==='/api/trainer'){u.trainer={...u.trainer,name:data.name,hometown:data.hometown,bio:data.bio};storeDemo();return{trainer:u.trainer};}",
  "if(url==='/api/trainer'){u.trainer={...u.trainer,name:data.name,age:data.age===''?null:Number(data.age),dream:data.dream,profession:data.profession,history:data.history,appearance:data.appearance};storeDemo();return{trainer:u.trainer};}",
  'salvamento na demo');
app = replaceOne(app,
  "if(action==='nav'){state.view=value;render();scrollTo({top:0,behavior:'smooth'});return;}",
  "if(action==='nav'){state.view=value;render();scrollTo({top:0,behavior:'smooth'});return;}\n  if(action==='co-view-trainer'){state.coSheetUserId=value;render();return;}",
  'seleção de jogador pelo mestre');
app = replaceOne(app,
  'state.selectedTrainerId=null;state.inventoryTrainerId=null;',
  'state.selectedTrainerId=null;state.coSheetUserId=null;state.inventoryTrainerId=null;',
  'troca de campanha');
style += '\n' + css;
new vm.Script(server, {filename:'server.js'});
new vm.Script(app, {filename:'app.js'});
if (!app.includes('function coTrainerSheet(') || !server.includes('appearance:clean(data.appearance,3000)')) throw new Error('EvoLink v15: verificação falhou.');
fs.writeFileSync(serverFile, server);
fs.writeFileSync(appFile, app);
fs.writeFileSync(cssFile, style);
console.log('EvoLink v15: fichas dos jogadores e acesso do Mestre instalados. /app/data preservado.');
