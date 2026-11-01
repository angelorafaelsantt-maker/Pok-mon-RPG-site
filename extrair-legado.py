#!/usr/bin/env python3
"""Recupera o codigo legado do comando Railway sem executar o codigo."""
import base64, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent
source = pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root/'railway-start-command.txt'
if not source.exists():
    sys.exit('Arquivo nao encontrado: '+str(source))
raw=source.read_text(encoding='utf-8')
m=re.search(r'Buffer\.from\(\\?"([A-Za-z0-9+/=]{100,})\\?",\\?"base64\\?"\)',raw)
if not m:
    sys.exit('Nao foi encontrado o payload Base64 esperado. Nenhum arquivo alterado.')
code=base64.b64decode(m.group(1),validate=True)
if b'evolink-cloud-adapter.js' not in code or b'createServer' not in code:
    sys.exit('O codigo nao parece ser o inicializador legado esperado.')
out=root/'evolink-legacy-start.js'
out.write_bytes(code)
print('Codigo recuperado:',out,'(',len(code),'bytes)')
print('ATENCAO: revisar o codigo antes de publicar. Nao inclui variaveis secretas do Railway.')
