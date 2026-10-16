'use strict';
/* Instala a Pokédex dos jogadores v14 depois da v13. Sem acesso ou escrita ao /app/data. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.EVOLINK_BUILD_ROOT || '/app';
const publicPath = path.join(root,'public');
const paths = {
  server: path.join(root,'server.js'),
  html: path.join(publicPath,'index.html'),
  js: path.join(publicPath,'evolink-pokedex-jogadores-v14.js'),
  css: path.join(publicPath,'evolink-pokedex-jogadores-v14.css')
};
const frontend = {
  js: fs.readFileSync(path.join(__dirname, 'evolink-pokedex-jogadores-v14.js'),'utf8'),
  css: fs.readFileSync(path.join(__dirname, 'evolink-pokedex-jogadores-v14.css'),'utf8')
};
let server=fs.readFileSync(paths.server,'utf8');
let html=fs.readFileSync(paths.html,'utf8');
const jsRoute="'/evolink-pokedex-jogadores-v14.js':['evolink-pokedex-jogadores-v14.js','text/javascript; charset=utf-8'],";
const cssRoute="'/evolink-pokedex-jogadores-v14.css':['evolink-pokedex-jogadores-v14.css','text/css; charset=utf-8'],";
const unique=(source,needle,value,label)=>{
  const count=source.split(needle).length-1;
  if(count!==1)throw new Error(`EvoLink v14: não foi possível instalar ${label} (${count} ocorrências).`);
  return source.replace(needle,value);
};
if(!server.includes(jsRoute)){
  const anchor="'/evolink-pokedex-detail-fix-v13.js':['evolink-pokedex-detail-fix-v13.js','text/javascript; charset=utf-8'],";
  server=unique(server,anchor,anchor+'\n    '+jsRoute+'\n    '+cssRoute,'arquivos estáticos');
}
if(!html.includes('/evolink-pokedex-jogadores-v14.css')){
  const anchor='<link rel="stylesheet" href="/evolink-pokedex-detail-fix-v13.css?v13">';
  html=unique(html,anchor,anchor+'\n  <link rel="stylesheet" href="/evolink-pokedex-jogadores-v14.css?v14">','folha de estilos');
}
if(!html.includes('/evolink-pokedex-jogadores-v14.js')){
  const anchor='<script src="/evolink-pokedex-detail-fix-v13.js?v13" defer></script>';
  html=unique(html,anchor,anchor+'\n  <script src="/evolink-pokedex-jogadores-v14.js?v14" defer></script>','script dos jogadores');
}
new vm.Script(server,{filename:'server.js'});
new vm.Script(frontend.js,{filename:'evolink-pokedex-jogadores-v14.js'});
if(!html.includes('src="/app.js"'))throw new Error('EvoLink v14: app.js não encontrado no HTML.');
fs.writeFileSync(paths.server,server);
fs.writeFileSync(paths.html,html);
fs.writeFileSync(paths.js,frontend.js);
fs.writeFileSync(paths.css,frontend.css);
console.log('EvoLink v14: Pokédex dos jogadores instalada. Dados persistentes preservados.');
