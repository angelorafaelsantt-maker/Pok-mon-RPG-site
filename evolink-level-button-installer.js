'use strict';
const fs=require('fs');
const path=require('path');
const root=process.env.EVOLINK_APP_DIR||'/app';
function modify(file,anchor,insert,tag){
 const p=path.join(root,file);
 let s=fs.readFileSync(p,'utf8');
 if(s.includes(tag)){console.log('[nivel] Ja instalado:',file);return;}
 if(!s.includes(anchor))throw new Error('[nivel] Ponto de insercao nao encontrado: '+file);
 s=s.replace(anchor,insert+anchor);
 fs.writeFileSync(p,s);
 console.log('[nivel] Instalado:',file);
}
const backend=`
 // EVOLINK_LEVEL_BUTTON_V1
 const levelRoute=pathname.match(/^\\/api\\/campaigns\\/([a-f\\d-]+)\\/captured\\/([a-f\\d-]+)\\/level-up$/);
 if(req.method==='POST'&&levelRoute){
   const c=owner(req,levelRoute[1]);
   const cap=db.captured.find(p=>p.id===levelRoute[2]&&p.campaignId===c.id);
   if(!cap)fail(404,'Pokémon não encontrado.');
   if(cap.level>=100)fail(400,'Pokémon já está no nível máximo.');
   const species=db.species.find(p=>p.id===cap.speciesId&&p.campaignId===c.id);
   if(!species)fail(404,'Espécie não encontrada.');
   const base=species.stats||{};
   const keys=['hp','attack','defense','spAttack','spDefense','speed'];
   if(keys.some(k=>!Number.isInteger(base[k])||base[k]<1))fail(400,'Cadastre os seis Base Stats da espécie antes de subir o nível.');
   // Valores individuais gerados uma única vez e preservados nos próximos níveis.
   // Para capturas antigas, IVs/EVs não armazenados não podem ser recuperados.
   const crypto=require('node:crypto');
   if(!cap.ivs)cap.ivs=Object.fromEntries(keys.map(k=>[k,crypto.randomInt(0,32)]));
   if(!cap.evs)cap.evs=Object.fromEntries(keys.map(k=>[k,0]));
   if(!cap.nature)cap.nature='Hardy';
   const natures={
    Lonely:['attack','defense'],Brave:['attack','speed'],Adamant:['attack','spAttack'],Naughty:['attack','spDefense'],
    Bold:['defense','attack'],Relaxed:['defense','speed'],Impish:['defense','spAttack'],Lax:['defense','spDefense'],
    Timid:['speed','attack'],Hasty:['speed','defense'],Jolly:['speed','spAttack'],Naive:['speed','spDefense'],
    Modest:['spAttack','attack'],Mild:['spAttack','defense'],Quiet:['spAttack','speed'],Rash:['spAttack','spDefense'],
    Calm:['spDefense','attack'],Gentle:['spDefense','defense'],Sassy:['spDefense','speed'],Careful:['spDefense','spAttack']
   };
   const nature=natures[cap.nature];
   const compute=(lv,k)=>{
     const core=Math.floor((2*base[k]+cap.ivs[k]+Math.floor(cap.evs[k]/4))*lv/100);
     if(k==='hp')return core+lv+10;
     const neutral=core+5;
     return Math.floor(neutral*(nature?.[0]===k?1.1:nature?.[1]===k?0.9:1));
   };
   const oldHp=compute(cap.level,'hp');
   const newLevel=cap.level+1;
   const newHp=compute(newLevel,'hp');
   const previousMax=cap.maxHp;
   cap.level=newLevel;
   cap.maxHp=newHp;
   // Mantém o dano recebido, inclusive se o Pokémon estiver desmaiado.
   cap.currentHp=cap.currentHp===0?0:Math.min(newHp,Math.max(1,cap.currentHp+(newHp-previousMax)));
   cap.calculatedStats=Object.fromEntries(keys.map(k=>[k,compute(newLevel,k)]));
   cap.updatedAt=new Date().toISOString();
   save();
   return response(res,200,{captured:safeCaptured(cap),stats:cap.calculatedStats,oldHp,newHp});
 }
`;
modify('server.js',"  const capEdit=pathname.match(",backend,'EVOLINK_LEVEL_BUTTON_V1');
const button=`${'${master?`'}<button type="button" class="btn primary tiny" data-action="level-up" data-id="${'${esc(c.id)}'}" data-value="${'${esc(cap.id)}'}" ${'${cap.level>=100?\'disabled\':\'\'}'}>⬆️ +1 Nível</button>${'`:``}'}`;
const frontend=`
 // EVOLINK_LEVEL_BUTTON_V1
 if(action==='level-up'){
   const cap=state.captured.find(x=>x.id===value);
   if(!cap||cap.level>=100)return;
   try{
     state.busy=true;
     const result=await request('POST',\`/api/campaigns/\${b.dataset.id}/captured/\${value}/level-up\`,{});
     await refresh();
     notice(\`Nível \${result.captured.level}! HP \${result.captured.currentHp}/\${result.captured.maxHp}\`);
   }catch(err){notice(err.message,true);}finally{state.busy=false;}
   return;
 }
`;
modify('public/app.js'," if(action==='team-toggle')",frontend,'EVOLINK_LEVEL_BUTTON_V1');
const appPath=path.join(root,'public/app.js');
let app=fs.readFileSync(appPath,'utf8');
if(!app.includes('EVOLINK_LEVEL_BUTTON_UI_V1')){
 const needle='${master?`<button class="btn secondary tiny" type="button" data-action="edit-capture"';
 const idx=app.indexOf(needle);
 if(idx<0)throw new Error('[nivel] Botoes de captura nao encontrados');
 app=app.slice(0,idx)+'<!-- EVOLINK_LEVEL_BUTTON_UI_V1 -->'+button+app.slice(idx);
 fs.writeFileSync(appPath,app);
}
console.log('[nivel] Botao e endpoint instalados.');
