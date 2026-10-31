'use strict';
// Additive build-time installer. Does not access /app/data or persistent images.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.EVOLINK_BUILD_ROOT||'/app';
const serverPath=path.join(root,'server.js'),appPath=path.join(root,'public','app.js');
let server=fs.readFileSync(serverPath,'utf8'),app=fs.readFileSync(appPath,'utf8');
function replaceOnce(src,needle,replacement,label){
 const n=src.split(needle).length-1;
 if(n!==1)throw new Error(`Mega/Gmax v33: ${label}: expected 1 match, found ${n}`);
 return src.replace(needle,replacement);
}
if(!server.includes('/* EVOLINK_FORMS_V33 */')){
 const helper=`/* EVOLINK_FORMS_V33 */
function normalizeSpecialForm(input,previous,kind){
 const v=input&&typeof input==='object'?input:{};
 const old=previous&&typeof previous==='object'?previous:{};
 const enabled=v.enabled===true||v.enabled==='true';
 const name=clean(v.name,65),type1=clean(v.type1,20),type2=clean(v.type2,20);
 if(type1&&!TYPES.has(type1)||type2&&!TYPES.has(type2)||type1&&type1===type2)fail(400,'Tipos especiais inválidos.');
 const stats={};
 for(const key of ['hp','attack','defense','spAttack','spDefense','speed']){
  stats[key]=nullableNumber(v.stats?.[key],1,255);
  if(stats[key]!==null&&!Number.isInteger(stats[key]))fail(400,'Status da forma especial inválido.');
 }
 return {enabled,name,type1,type2,ability:clean(v.ability,60),gmaxMove:kind==='gigantamax'?clean(v.gmaxMove,80):'',stats,images:{normal:old.images?.normal||'',shiny:old.images?.shiny||''}};
}
`;
 server=replaceOnce(server,'function normalizeSpecies(data, campaignId, existing=null) {',helper+'function normalizeSpecies(data, campaignId, existing=null) {','normalization');
 server=replaceOnce(server,'stats,evolvesFrom:from,evolvesTo:to,evolutionMethod:clean(data.evolutionMethod,150),',`stats,evolvesFrom:from,evolvesTo:to,evolutionMethod:clean(data.evolutionMethod,150),
    mega:normalizeSpecialForm(data.mega??existing?.mega,existing?.mega,'mega'),
    gigantamax:normalizeSpecialForm(data.gigantamax??existing?.gigantamax,existing?.gigantamax,'gigantamax'),`,'persist forms');
 server=replaceOnce(server,"if(!['normal','shiny'].includes(data.variant))fail(400,'Escolha imagem normal ou shiny.');", "if(!['normal','shiny','mega-normal','mega-shiny','gigantamax-normal','gigantamax-shiny'].includes(data.variant))fail(400,'Variante de imagem inválida.');",'image validation');
 server=replaceOnce(server,'const old=sp.images?.[data.variant];sp.images||={normal:\'\',shiny:\'\'};sp.images[data.variant]=`/api/species-media/${campaignId}/${file}`;',`const form=data.variant.startsWith('mega-')?'mega':data.variant.startsWith('gigantamax-')?'gigantamax':null;
  const key=form?data.variant.slice(form.length+1):data.variant;
  const target=form?(sp[form]||(sp[form]={enabled:true,images:{normal:'',shiny:''}})):sp;
  target.images||={normal:'',shiny:''};
  const old=target.images[key];target.images[key]=\`/api/species-media/\${campaignId}/\${file}\`;`,'save images');
 server=replaceOnce(server,'(?:normal|shiny)-[a-f\\d-]{36}', '(?:normal|shiny|mega-normal|mega-shiny|gigantamax-normal|gigantamax-shiny)-[a-f\\d-]{36}','media path');
 server=replaceOnce(server,'(x.images?.normal===uri||x.images?.shiny===uri)', '(x.images?.normal===uri||x.images?.shiny===uri||x.mega?.images?.normal===uri||x.mega?.images?.shiny===uri||x.gigantamax?.images?.normal===uri||x.gigantamax?.images?.shiny===uri)','media access');
}
if(!app.includes('/* EVOLINK_FORMS_V33 */')){
 const helper=`/* EVOLINK_FORMS_V33 */
function specialForm(kind,p){
 const f=p?.[kind]||{},st=f.stats||{},label=kind==='mega'?'Mega Evolução':'Gigantamax';
 return \`<fieldset class="special-form"><legend>\${label}</legend>
 <label class="field"><span>Possui esta forma?</span><select name="\${kind}Enabled"><option value="false" \${!f.enabled?'selected':''}>Não</option><option value="true" \${f.enabled?'selected':''}>Sim</option></select></label>
 \${miniInput(kind+'Name','Nome da forma',f.name,'text','maxlength="65"')}
 <div class="spec-form-two"><label class="field"><span>Tipo principal (opcional)</span><select name="\${kind}Type1"><option value="">Igual à forma base</option>\${options(f.type1)}</select></label><label class="field"><span>Tipo secundário (opcional)</span><select name="\${kind}Type2"><option value="">Nenhum</option>\${options(f.type2)}</select></label></div>
 \${miniInput(kind+'Ability','Habilidade especial',f.ability,'text','maxlength="60"')}
 \${kind==='gigantamax'?miniInput(kind+'Move','Golpe G-Max',f.gmaxMove,'text','maxlength="80"'):''}
 <strong class="spec-form-title">Base Status da forma</strong>
 <div class="spec-stats-grid">\${[['hp','HP'],['attack','Attack'],['defense','Defense'],['spAttack','Sp. Attack'],['spDefense','Sp. Defense'],['speed','Speed']].map(([k,l])=>miniInput(kind+k,l,st[k],'number','min="1" max="255"')).join('')}</div>
 <label class="field"><span>Arte normal</span><input type="file" name="\${kind}NormalImage" accept="image/png,image/jpeg,image/webp"></label>
 <label class="field"><span>Arte shiny</span><input type="file" name="\${kind}ShinyImage" accept="image/png,image/jpeg,image/webp"></label>
 </fieldset>\`;
}
function specialDetails(p){
 return ['mega','gigantamax'].filter(k=>p[k]?.enabled).map(k=>{
 const f=p[k],label=k==='mega'?'Mega Evolução':'Gigantamax',st=f.stats||{};
 return \`<details class="special-form"><summary>\${label}: \${esc(f.name||p.name)}</summary>
 \${f.images?.normal?\`<img loading="lazy" style="max-width:170px;max-height:170px;object-fit:contain" src="\${esc(f.images.normal)}" alt="\${label}">\`:''}
 \${f.images?.shiny?\`<img loading="lazy" style="max-width:170px;max-height:170px;object-fit:contain" src="\${esc(f.images.shiny)}" alt="\${label} shiny">\`:''}
 <p>Tipos: \${esc(f.type1||p.type1)}\${f.type2?' / '+esc(f.type2):''} • Habilidade: \${esc(f.ability||'Não cadastrada')}</p>
 \${f.gmaxMove?\`<p>G-Max: \${esc(f.gmaxMove)}</p>\`:''}
 <div class="spec-status">\${[['hp','HP'],['attack','Atk'],['defense','Def'],['spAttack','SpA'],['spDefense','SpD'],['speed','Vel']].map(([key,title])=>\`<span>\${title}<strong>\${st[key]??'—'}</strong></span>\`).join('')}</div>
 </details>\`;
 }).join('');
}
`;
 app=replaceOnce(app,'function speciesForm(p=null){',helper+'function speciesForm(p=null){','form helpers');
 app=replaceOnce(app,'<strong class="spec-form-title">🖼️ Imagens do Pokémon</strong>', "${specialForm('mega',p)}\n    ${specialForm('gigantamax',p)}\n    <strong class=\"spec-form-title\">🖼️ Imagens do Pokémon</strong>",'form insertion');
 app=replaceOnce(app,'   </details>`}',"   </details>${specialDetails(p)}`}\n",'pokedex display');
 app=replaceOnce(app,'const fileNormal=data.normalImage,fileShiny=data.shinyImage;',`const fileNormal=data.normalImage,fileShiny=data.shinyImage;
    const specialFiles=[],forms={};
    for(const kind of ['mega','gigantamax']){
      forms[kind]={enabled:data[kind+'Enabled']==='true',name:data[kind+'Name'],type1:data[kind+'Type1'],type2:data[kind+'Type2'],ability:data[kind+'Ability'],gmaxMove:data[kind+'Move'],stats:Object.fromEntries(['hp','attack','defense','spAttack','spDefense','speed'].map(k=>[k,data[kind+k]||null]))};
      for(const variant of ['Normal','Shiny'])specialFiles.push([kind+'-'+variant.toLowerCase(),data[kind+variant+'Image']]);
    }`,'form submit');
 app=replaceOnce(app,'const payload={...data,stats,abilities:', 'const payload={...data,mega:forms.mega,gigantamax:forms.gigantamax,stats,abilities:','form payload');
 app=replaceOnce(app,'for(const file of [fileNormal,fileShiny])', 'for(const file of [fileNormal,fileShiny,...specialFiles.map(x=>x[1])])','file limit');
 app=replaceOnce(app,"[['normal',fileNormal],['shiny',fileShiny]]", "[['normal',fileNormal],['shiny',fileShiny],...specialFiles]",'image upload');
}
new vm.Script(server,{filename:'server.js'});
new vm.Script(app,{filename:'app.js'});
fs.writeFileSync(serverPath,server);
fs.writeFileSync(appPath,app);
console.log('EvoLink v33: Mega e Gigantamax instalados; dados persistentes preservados.');
