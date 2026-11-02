'use strict';
// Executar: node extrair-evolink-legado.js comando-railway.txt
// Cole em comando-railway.txt o Custom Start Command completo do Railway.
const fs = require('fs');
const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error('Uso: node extrair-evolink-legado.js comando-railway.txt');
  process.exit(1);
}
const cmd = fs.readFileSync(input, 'utf8');
const matches = [...cmd.matchAll(/Buffer\.from\(\\?"([A-Za-z0-9+/=]{100,})\\?",\\?"base64\\?"\)/g)];
if (!matches.length) { console.error('Nao foi encontrado o payload Base64 no comando.'); process.exit(2); }
const largest = matches.sort((a,b)=>b[1].length-a[1].length)[0][1];
const decoded = Buffer.from(largest, 'base64').toString('utf8');
if (!decoded.trim()) { console.error('Payload vazio'); process.exit(3); }
fs.writeFileSync('evolink-legacy-start.js', decoded, 'utf8');
console.log('Arquivo evolink-legacy-start.js criado (' + Buffer.byteLength(decoded) + ' bytes).');
console.log('ATENCAO: revise o arquivo antes de executar e nao publique segredos.');
