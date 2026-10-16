'use strict';
/* Instalador da interface Pokédex v12.
 * Roda somente DURANTE O BUILD do Docker, apos evolink-attacks-installer.js.
 * Adiciona assets de interface ao diretorio publico, sem tocar em /app/data. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.EVOLINK_BUILD_ROOT || '/app';
const frontendDir = path.join(root,'public');
const files = {
  server: path.join(root,'server.js'),
  html: path.join(frontendDir,'index.html'),
  js: path.join(frontendDir,'evolink-pokedex-editor-v12.js'),
  css: path.join(frontendDir,'evolink-pokedex-editor-v12.css')
};
const assets = {
  js: fs.readFileSync(path.join(__dirname,'evolink-pokedex-editor-v12.js'),'utf8'),
  css: fs.readFileSync(path.join(__dirname,'evolink-pokedex-editor-v12.css'),'utf8')
};
let server = fs.readFileSync(files.server,'utf8');
let html = fs.readFileSync(files.html,'utf8');

const jsRoute="'/evolink-pokedex-editor-v12.js':['evolink-pokedex-editor-v12.js','text/javascript; charset=utf-8'],";
const cssRoute="'/evolink-pokedex-editor-v12.css':['evolink-pokedex-editor-v12.css','text/css; charset=utf-8'],";

function replaceUnique(original,needle,replacement,label) {
  const occurrences = original.split(needle).length - 1;
  if (occurrences !== 1) throw new Error(`EvoLink v12: nao foi possivel instalar ${label}. Ocorrencias: ${occurrences}`);
  return original.replace(needle,replacement);
}

if (!server.includes(jsRoute)) {
  const anchor = "'/attacks-addon.js':['attacks-addon.js','text/javascript; charset=utf-8'],";
  server = replaceUnique(server,anchor,anchor+'\n    '+jsRoute+'\n    '+cssRoute,'rotas estaticas');
}
if (!html.includes('/evolink-pokedex-editor-v12.css')) {
  html = replaceUnique(html,'<link rel="stylesheet" href="/style.css">',
    '<link rel="stylesheet" href="/style.css">\n  <link rel="stylesheet" href="/evolink-pokedex-editor-v12.css?v12">','arquivo CSS');
}
if (!html.includes('/evolink-pokedex-editor-v12.js')) {
  html = replaceUnique(html,'<script src="/attacks-addon.js?v7" defer></script>',
    '<script src="/attacks-addon.js?v7" defer></script>\n  <script src="/evolink-pokedex-editor-v12.js?v12" defer></script>', 'script da lista');
}
// Rejeita build com erros antes de gravar arquivos.
new vm.Script(server,{filename:'server.js'});
new vm.Script(assets.js,{filename:'evolink-pokedex-editor-v12.js'});
if (!html.includes('src="/app.js"') || !server.includes(jsRoute) || !server.includes(cssRoute))
  throw new Error('EvoLink v12: requisitos do site nao encontrados.');
fs.writeFileSync(files.server,server);
fs.writeFileSync(files.html,html);
fs.writeFileSync(files.js,assets.js);
fs.writeFileSync(files.css,assets.css);
console.log('EvoLink v12: interface Pokédex em cards instalada. /app/data preservado.');
