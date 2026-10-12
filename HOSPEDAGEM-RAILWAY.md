# EvoLink v0.6 — acesso online e convites entre celulares

## Por que o código anterior falhava?
A demonstração HTML salva as campanhas em um navegador apenas. Ela não tem servidor compartilhado e não consegue convidar celulares diferentes. O arquivo `public/index.html` é a interface real que usa o servidor Node.js incluído aqui.

## Preparar no celular ou computador
1. Baixe o ZIP v0.6 e extraia a pasta `evolink-pokemon-rpg`.
2. Crie uma conta em [GitHub](https://github.com). Em **New repository**, escolha **Private**. Faça upload dos arquivos **dentro** da pasta `evolink-pokemon-rpg`, para que `server.js` e `Dockerfile` apareçam na raiz do repositório. Não envie a pasta `data` com suas contas reais.
3. Entre em [Railway](https://railway.com) e escolha **New Project → Deploy from GitHub repo**, conecte o GitHub e selecione o repositório. Railway detectará o `Dockerfile`.
4. No serviço criado, antes de distribuir convites, abra **Volumes → Add Volume**, com **Mount Path = `/app/data`**. Assim as contas, campanhas e imagens persistem após reinicializações.
5. Em **Variables**, inclua `DATA_DIR=/app/data` e `TRUST_PROXY=1`. Não é preciso `APP_ORIGIN` para o domínio Railway padrão (quando o navegador e a API usam o mesmo domínio). **Se usar domínio próprio** e precisar de `APP_ORIGIN`, defina exatamente `https://seu-dominio` sem barra final. Não configure várias réplicas (este app usa arquivo JSON compartilhado por um único processo).
6. Em **Settings → Networking → Public Networking → Generate Domain**, gere o endereço HTTPS. O endereço será semelhante a `https://seu-app.up.railway.app` (exemplo, não é link existente).
7. Abra `https://seu-app.up.railway.app/api/health` (substitua pelo seu domínio). Deve aparecer JSON `ok: true` e `version: 0.6.0`.
8. Abra a página inicial nesse endereço HTTPS. Crie sua conta Mestre NOVA (se você só usava a demonstração). Crie campanha → **Compartilhar convite**. Envie o link ao jogador pelo WhatsApp/Discord. O link contém `?convite=CÓDIGO` e valida a campanha antes do login.
9. O jogador abre **esse mesmo endereço**, cria uma conta de **Jogador** e entra automaticamente na campanha. Se ele já tinha conta no mesmo servidor, o link também funciona.
10. Mestre e jogador usam **exatamente o mesmo domínio** do EvoLink, e não os arquivos `EvoLink-Demonstracao...html` ou endereços `file://`. Não compartilhe o link do ZIP com os jogadores.

### Importante para não perder nada
- Contas/códigos criados em páginas de demonstração HTML **não migram** para o servidor automaticamente. Será preciso criar uma campanha verdadeira no site online.
- Se você **já usou o servidor real**, preserve toda a pasta `data` (incluindo `evolink.json` e `species-images`). Copie-a para o novo volume se for migrar de um servidor antigo. Faça backup primeiro.
- O EvoLink usa arquivo JSON e imagens locais. **É obrigatório** ter volume persistente e backups regulares; sem volume não servirá como hospedagem confiável. O projeto foi preparado para um processo por vez e grupos pequenos.
- O código de convite permite entrar na campanha, não autentica no site sozinho; não envie dados de login a ninguém. O Mestre pode trocar o código para invalidar convites antigos.
- O Railway tem custos/créditos sujeitos ao plano e consumo, e pode exigir método de pagamento. Verifique os preços antes de publicar: https://railway.com/pricing.
- O servidor **ainda não foi publicado por esta entrega**. Você precisa conectar GitHub/Railway para obter o link real.

## Diagnóstico rápido
- **Código não encontrado neste servidor:** algum celular está usando a demonstração, outro domínio, ou um código antigo. Abra o link compartilhado pelo Mestre no mesmo site HTTPS.
- **Erro ao criar conta/entrar:** confira se o site `/api/health` funciona e se o servidor está em execução.
- **EACCES/permissão de volume:** use o Dockerfile e `docker-entrypoint.sh` desta versão, que ajustam o proprietário do volume antes de iniciar como usuário Node.
- **Início falha com mensagem de volume:** crie o volume em `/app/data`; essa proteção evita perda de contas e capturas num disco temporário.
- **Compartilhar mostra alerta de demo:** você ainda abriu o HTML local; use o link HTTPS público do domínio Railway.

Documentação oficial: https://docs.railway.com/quick-start · https://docs.railway.com/volumes · https://docs.railway.com/networking/public-networking
