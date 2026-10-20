'use strict';
/** Instalador aditivo v32. Não toca em /app/data, campanhas, Pokédex ou imagens. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.EVOLINK_BUILD_ROOT || '/app';
const publicDir = path.join(root, 'public');
const repoDir = __dirname;
const serverPath = path.join(root, 'server.js');
const htmlPath = path.join(publicDir, 'index.html');
const scriptName = 'evolink-localizacoes-v32.js';
const styleName = 'evolink-localizacoes-v32.css';
const script = fs.readFileSync(path.join(repoDir,scriptName),'utf8');
const css = fs.readFileSync(path.join(repoDir,styleName),'utf8');
let server = fs.readFileSync(serverPath,'utf8');
let html = fs.readFileSync(htmlPath,'utf8');
const once = (source,anchor,replacement,label) => {
  const count = source.split(anchor).length-1;
  if(count!==1) throw new Error(`EvoLink v32: âncora ${label} encontrada ${count} vezes.`);
  return source.replace(anchor,replacement);
};
const scriptRoute = `'/evolink-localizacoes-v32.js':['evolink-localizacoes-v32.js','text/javascript; charset=utf-8'],`;
const cssRoute = `'/evolink-localizacoes-v32.css':['evolink-localizacoes-v32.css','text/css; charset=utf-8'],`;
if(!server.includes(scriptRoute)) {
  const anchor="'/style.css':['style.css','text/css; charset=utf-8'],";
  server=once(server,anchor,anchor+'\n    '+scriptRoute+'\n    '+cssRoute,'rotas estáticas');
}
if(!html.includes('href="/evolink-localizacoes-v32.css')) {
  html=once(html,'</head>',`  <link rel="stylesheet" href="/evolink-localizacoes-v32.css?v32">\n</head>`,'CSS');
}
if(!html.includes('src="/evolink-localizacoes-v32.js')) {
  html=once(html,'</body>',`  <script src="/evolink-localizacoes-v32.js?v32" defer></script>\n</body>`,'script');
}
new vm.Script(server,{filename:'server.js'});
new vm.Script(script,{filename:scriptName});
if (!html.includes('src="/app.js"')) throw new Error('EvoLink v32: app.js não encontrado.');
fs.writeFileSync(serverPath,server);
fs.writeFileSync(htmlPath,html);
fs.writeFileSync(path.join(publicDir,scriptName),script);
fs.writeFileSync(path.join(publicDir,styleName),css);
console.log('EvoLink v32: localizações simples instaladas. Dados persistentes preservados.');
