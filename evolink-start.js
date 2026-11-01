'use strict';
// Inicializador de diagnostico. Nao substitui o payload legado completo.
const fs = require('node:fs');
const dir = process.env.DATA_DIR || '/app/data';
fs.mkdirSync(dir, {recursive:true});
const adapter='/app/evolink-cloud-adapter.js';
if (!fs.existsSync(adapter) || fs.statSync(adapter).size===0) {
  console.error('[EVOLINK] Adaptador da nuvem ausente. Nao publicar este inicializador antes de migrar o payload legado.');
  process.exit(1);
}
function patch(name) {
  const code=process.env[name];
  if (code) (0,eval)(code);
}
patch('EV98_SEED');
patch('EV74_PATCH');
patch('EV100_CLOUD_MIGRATE');
patch('EV99_POST_PATCH');
const port=Number(process.env.PORT || 3000);
require('/app/server.js').createServer().listen(port,'0.0.0.0',()=>console.log('[EVOLINK] Online: '+port));
