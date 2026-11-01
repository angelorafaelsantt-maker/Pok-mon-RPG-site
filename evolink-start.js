'use strict';
// EvoLink startup, without Railway's oversized inline Node argument.
// Keep the existing Railway environment variables and persistent volume.
const fs = require('node:fs');
const path = require('node:path');
const dataDir = process.env.DATA_DIR || '/app/data';
fs.mkdirSync(dataDir, { recursive: true });

// These existing patches are applied in the same order as the old command.
function runEnvPatch(name) {
  const source = process.env[name];
  if (source) (0, eval)(source);
}
runEnvPatch('EV98_SEED');

// IMPORTANT: The former Railway start command also contained a large inline
// cloud-adapter payload. This file cannot reconstruct that payload from the
// repository alone. Do not replace the old start command until that payload
// is extracted into /app/evolink-cloud-adapter.js during the Docker build.
if (!fs.existsSync('/app/evolink-cloud-adapter.js') ||
    fs.statSync('/app/evolink-cloud-adapter.js').size === 0) {
  throw new Error('EvoLink: cloud adapter ausente ou vazio; preserve o payload original antes de trocar o startCommand.');
}

runEnvPatch('EV74_PATCH');
runEnvPatch('EV100_CLOUD_MIGRATE');
runEnvPatch('EV99_POST_PATCH');

const server = require('/app/server.js').createServer();
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`EvoLink online na porta ${port}`));
