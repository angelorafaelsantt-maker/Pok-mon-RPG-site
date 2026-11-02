'use strict';
// Inicialização compacta de contingência. Não reproduz o comando legado
// de 131 KB; preserva a base da aplicação e o volume de dados.
const fs = require('node:fs');
const path = require('node:path');
const appDir = '/app';
const dataDir = process.env.DATA_DIR || '/app/data';
fs.mkdirSync(dataDir, {recursive:true});
process.env.DATA_DIR = dataDir;
process.env.PORT = process.env.PORT || '3000';
const serverFile = path.join(appDir,'server.js');
if (!fs.existsSync(serverFile)) throw new Error('server.js não encontrado');
const app = require(serverFile);
if (!app || typeof app.createServer !== 'function') {
  throw new Error('server.js não exporta createServer; não foi possível iniciar com segurança');
}
app.createServer().listen(Number(process.env.PORT),'0.0.0.0',()=>console.log('EvoLink online'));
