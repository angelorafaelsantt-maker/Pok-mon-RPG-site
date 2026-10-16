'use strict';
/* Instalador da visualização detalhada v13. Injeta CSS/JS sem tocar em /app/data. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.EVOLINK_BUILD_ROOT || '/app';
const frontendDir = path.join(root, 'public');
const files = {
  server: path.join(root, 'server.js'),
  html: path.join(frontendDir, 'index.html'),
  js: path.join(frontendDir, 'evolink-pokedex-detail-fix-v13.js'),
  css: path.join(frontendDir, 'evolink-pokedex-detail-fix-v13.css')
};
const assets = {
  js: fs.readFileSync(path.join(__dirname, 'evolink-pokedex-detail-fix-v13.js'), 'utf8'),
  css: fs.readFileSync(path.join(__dirname, 'evolink-pokedex-detail-fix-v13.css'), 'utf8')
};
let server = fs.readFileSync(files.server, 'utf8');
let html = fs.readFileSync(files.html, 'utf8');

const jsRoute = "'/evolink-pokedex-detail-fix-v13.js':['evolink-pokedex-detail-fix-v13.js','text/javascript; charset=utf-8'],";
const cssRoute = "'/evolink-pokedex-detail-fix-v13.css':['evolink-pokedex-detail-fix-v13.css','text/css; charset=utf-8'],";
function replaceUnique(original, needle, replacement, label) {
  const occurrences = original.split(needle).length - 1;
  if (occurrences !== 1) throw new Error(`EvoLink v13: falha ao instalar ${label}. Ocorrências: ${occurrences}`);
  return original.replace(needle, replacement);
}
if (!server.includes(jsRoute)) {
  const anchor = "'/evolink-pokedex-editor-v12.js':['evolink-pokedex-editor-v12.js','text/javascript; charset=utf-8'],";
  server = replaceUnique(server, anchor, anchor + "\n    " + jsRoute + "\n    " + cssRoute, 'rotas estáticas');
}
if (!html.includes('/evolink-pokedex-detail-fix-v13.css')) {
  html = replaceUnique(html, '<link rel="stylesheet" href="/evolink-pokedex-editor-v12.css?v12">', '<link rel="stylesheet" href="/evolink-pokedex-editor-v12.css?v12">\n  <link rel="stylesheet" href="/evolink-pokedex-detail-fix-v13.css?v13">', 'injeção do CSS');
}
if (!html.includes('/evolink-pokedex-detail-fix-v13.js')) {
  html = replaceUnique(html, '<script src="/evolink-pokedex-editor-v12.js?v12" defer></script>', '<script src="/evolink-pokedex-editor-v12.js?v12" defer></script>\n  <script src="/evolink-pokedex-detail-fix-v13.js?v13" defer></script>', 'injeção do JS');
}
new vm.Script(server, { filename: 'server.js' });
new vm.Script(assets.js, { filename: 'evolink-pokedex-detail-fix-v13.js' });
fs.writeFileSync(files.server, server);
fs.writeFileSync(files.html, html);
fs.writeFileSync(files.js, assets.js);
fs.writeFileSync(files.css, assets.css);
console.log('EvoLink v13: visual da ficha detalhada instalado com sucesso.');
