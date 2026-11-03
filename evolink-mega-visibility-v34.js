'use strict';
// Executar DEPOIS do instalador v33. Modifica apenas arquivos de interface no build.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.EVOLINK_BUILD_ROOT||'/app';
const appFile=path.join(root,'public','app.js');
const swFile=path.join(root,'public','sw.js');
let app=fs.readFileSync(appFile,'utf8');
if(!app.includes('/* EVOLINK_FORMS_V33 */'))throw new Error('v34: instalador v33 nao executado');
if(!app.includes('/* EVOLINK_FORMS_VISIBLE_V34 */')){
  const old=`<div class="spec-form-two">\${numberInput}`;
  const count=app.split(old).length-1;
  if(count!==1)throw new Error('v34: formulario inesperado: '+count+' ocorrencias');
  // O cadastro e a edicao usam speciesForm; inserir logo no inicio, em lugar visivel.
  const marker=`<div class="spec-form-two">\${numberInput}`;
  const insert=`<div class="note" style="border-left:4px solid #e22;padding:10px;margin:12px 0"><strong>✨ Formas especiais — Mega Evolução e Gigantamax</strong><div>Configure as formas abaixo para este Pokémon.</div></div>
    \${specialForm('mega',p)}
    \${specialForm('gigantamax',p)}
    <div class="spec-form-two">\${numberInput}`;
  app=app.replace(marker,insert);
  // Remover as duas copias anteriores perto das imagens, evitando duplicar nomes de inputs.
  const oldForms=`\${specialForm('mega',p)}\n    \${specialForm('gigantamax',p)}\n    <strong class="spec-form-title">🖼️ Imagens do Pokémon</strong>`;
  if(!app.includes(oldForms))throw new Error('v34: campos originais nao encontrados');
  app=app.replace(oldForms,'<strong class="spec-form-title">🖼️ Imagens do Pokémon</strong>');
  app='/* EVOLINK_FORMS_VISIBLE_V34 */\n'+app;
}
new vm.Script(app,{filename:'app.js'});
fs.writeFileSync(appFile,app);
if(fs.existsSync(swFile)){
 let sw=fs.readFileSync(swFile,'utf8');
 sw=sw.replace(/evolink-shell-v\d+/g,'evolink-shell-v34');
 new vm.Script(sw,{filename:'sw.js'});
 fs.writeFileSync(swFile,sw);
}
console.log('EvoLink v34: campos Mega e Gigantamax visiveis no cadastro e na edicao');
