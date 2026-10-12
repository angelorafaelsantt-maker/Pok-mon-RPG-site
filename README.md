# Correção de convites / preparação online v0.6

**Agora:** envie o **link do convite** criado pelo Mestre na versão real hospedada (botão "📨 Compartilhar convite"). Ao abrir, o Jogador recebe o código automaticamente, pode criar conta/login e participa da campanha. A versão demo HTML continua isolada por navegador; **não** é um serviço compartilhado. Consulte [HOSPEDAGEM-RAILWAY.md](HOSPEDAGEM-RAILWAY.md) para publicar com dados persistentes e evitar códigos inválidos entre celulares. O servidor não foi hospedado automaticamente.

# EvoLink — Pokémon Evolution RPG

**Versão 0.6.0** — Aplicativo web instalável (PWA) para Mestre e Jogadores, em português e com visual inspirado nos menus clássicos de Pokémon. Projeto independente feito para uso em um RPG de fãs; não é um aplicativo oficial Pokémon.

## O que já funciona

- Criar contas distintas de **Mestre** e **Jogador** e entrar com usuário e senha.
- Senhas armazenadas como hashes `scrypt` com sal aleatório; sessão por cookie `HttpOnly` (válida por 14 dias).
- Mestre cria campanhas e recebe códigos exclusivos de convite.
- Jogador participa de uma campanha usando um código do Mestre; pode entrar em várias campanhas.
- Mestre consulta participantes, remove jogadores e pode invalidar e trocar o código de convite.
- Mestre cadastra e edita espécies da Pokédex com número, nome, tipos, categoria, país de inspiração, descrição, altura, peso, três habilidades, seis Base Stats, evolução e visibilidade.
- Mestre envia imagens normal e shiny diretamente do celular (PNG/JPG/WEBP, até 20 MB por imagem).
- Mestre importa até 200 espécies por vez de um arquivo JSON e exporta os dados das espécies para backup (imagens devem ser copiadas separadamente).
- **Pokédex pessoal por jogador**: espécies não vistas surgem como entradas de número conhecido e silhueta genérica, sem revelar nome, imagem, tipos ou descrição.
- Mestre pode selecionar um jogador e marcar uma espécie como **Vista** ou remover o registro de encontro.
- Pokémon recebidos do Mestre passam automaticamente a **Capturados** na Pokédex pessoal; o registro histórico permanece mesmo após retirada de um Pokémon da equipe.
- **Vistos**, **Capturados** e **Não vistos** possuem contadores e filtros; **Normal/Shiny** alterna a imagem disponível das espécies descobertas.
- O servidor restringe a entrega das imagens e dos detalhes de Pokémon não descobertos. Espécies ocultas pelo Mestre só aparecem para treinadores que as descobriram.
- Participantes visualizam a Pokédex da própria campanha. O progresso dos jogadores permanece separado mesmo na mesma campanha.
- Jogador preenche nome de treinador, cidade de origem e história; Mestre vê o nome no painel.
- **Mestre entrega Pokémon capturados** aos jogadores, definindo espécie, apelido, nível, HP atual e máximo, experiência, habilidade, até quatro golpes, gênero, forma normal ou shiny e anotações.
- **Equipe de até 6 Pokémon por jogador**, com armazenamento para os demais. Mestre e dono do Pokémon podem transferir entre equipe e armazenamento.
- Cada captura mostra a **imagem normal ou shiny cadastrada na Pokédex**, quando disponível; caso contrário aparece um ícone de espaço reservado. Imagens originais não estão incluídas automaticamente.
- Jogador pode personalizar apelido e anotações do próprio Pokémon, mas não mudar níveis, HP ou experiência.
- Painel do Mestre permite editar fichas individuais e remover Pokémon entregues. Capturas ficam associadas à campanha e ao treinador.
- Mestre pode cadastrar até 250 Pokémon individuais por jogador na mesma campanha; limite de 6 na equipe ativa.
- **Mochila individual**: categorias de itens, quantidade e histórico de movimentações separados por campanha e treinador.
- O **Mestre** cria/edita itens personalizados, entrega/retira itens e altera a carteira de Pokédólares de cada jogador.
- **Itens de cura** restauram HP dos Pokémon próprios não desmaiados, sem exceder HP máximo; o item é consumido ao ser utilizado.
- Outros itens podem ser utilizados narrativamente; seus efeitos fora de HP devem ser resolvidos pelo Mestre durante a sessão.
- Cada campanha começa com modelos de Poké Ball, Great Ball, Potion, Super Potion e Antidote; os jogadores não recebem itens automaticamente no servidor real.
- **Upload ampliado para 20 MB por imagem normal ou shiny** no servidor online, em PNG/JPG/WEBP. O modelo JSON aceita até 2 MB no formulário (máximo 200 espécies por importação).
- Menu para celular e ícone de instalação como PWA; inclui modo de demonstração local.

**Ainda não disponível:** batalhas com turnos e rolagens, cálculo automático de dano, captura automática, comércio, sincronização offline de dados, notificações e recuperação de senha. São etapas futuras, não funcionalidades prometidas nesta versão.

## Conhecer o visual sem servidor (no celular)

Abra `EvoLink-Demonstracao-Mochila-v0.5.html` (incluído no ZIP ou entregue separadamente). É uma página HTML independente que não exige internet nem instalação. Use os botões **Mestre demo** e **Jogador demo**. O conteúdo demonstra menus, criação de campanhas, fichas e Pokédex **apenas neste navegador**, incluindo seleção de imagens de até 20 MB, redimensionadas e comprimidas automaticamente na demonstração; o espaço disponível no navegador é limitado. **Demonstração não tem autenticação real e não conecta aparelhos. Não use senhas verdadeiras nela.** No modo demo existe um Cedarbi de exemplo já atribuído ao Jogador demo, três itens na mochila (com múltiplas unidades) e ₽ 1.500 iniciais, um Zellion marcado como visto e outros exemplos não vistos. O Mestre demo pode marcar encontros e entregar outros Pokémon. Os exemplos são fichas provisórias, **não substituem as suas artes originais**.

Dentro da pasta `public`, `demo.html` oferece a mesma experiência, mas depende dos arquivos `app.js`, `style.css` e imagens na pasta.

## Executar a versão verdadeira

Requisitos: **Node.js 20 ou superior**. Não exige `npm install` nem pacotes de terceiros.

1. Extraia `evolink-pokemon-rpg.zip` no computador ou no seu ambiente Node.js.
2. Abra um terminal dentro da pasta `evolink-pokemon-rpg`.
3. Execute `npm start` (ou `node server.js`).
4. No navegador, visite `http://localhost:3000`.
5. Registre primeiro uma conta de **Mestre**, crie a campanha e copie o código.
6. Registre uma conta de **Jogador** em outro navegador/aba privada ou outro aparelho, faça login, abra Campanhas e insira o código.

O sistema grava os dados em `data/evolink.json` e as imagens em `data/species-images/`. **Faça backups da pasta `data/` inteira.** Para mudar de máquina, copie o arquivo. **Não publique esse arquivo**, pois contém dados de contas e hash de senhas. Para rodar os testes automatizados: `npm test`.

## Instalar no Android

Para o Chrome oferecer a opção de instalar o app na tela inicial, **publique o servidor em um domínio HTTPS** (ou use `localhost` no próprio dispositivo). Depois abra o site no Chrome e use **⋮ → Adicionar à tela inicial / Instalar aplicativo**.

No Galaxy A07, é possível testar localmente com um ambiente Node.js para Android, como Termux, executando `node server.js`, abrindo `http://localhost:3000` no Chrome. A instalação de componentes externos e permissões deve ser feita com cuidado. Se o servidor rodar em um computador da mesma rede Wi-Fi, os outros dispositivos podem acessar o endereço IP local e porta 3000, mas HTTP sem HTTPS pode impedir a instalação de PWA e não é apropriado para uso aberto na internet.

**Para Mestre e Jogadores entrarem de redes diferentes, é obrigatório hospedar o servidor online** em um serviço compatível com Node.js, HTTPS e **armazenamento persistente**. Hospedagem não está incluída neste arquivo. Plataformas gratuitas que apagam o sistema de arquivos ao reiniciar **não são adequadas para guardar campanhas** sem um banco externo; escolha serviço com volume persistente e backups ou migre para um banco gerenciado.

## Opção Docker

Use `docker compose up -d --build`. O volume `evolink_data` mantém os dados mesmo ao recriar o contêiner. Você ainda precisa configurar HTTPS se o aplicativo for acessado fora do seu computador.

## Configurações

- `PORT=3000` — Porta HTTP.
- `DATA_DIR=/caminho/dados` — Pasta persistente dos dados; padrão `./data`.
- `TRUST_PROXY=1` — Ative somente se o servidor estiver protegido por um proxy confiável que encaminhe HTTPS.
- `APP_ORIGIN=https://seu-dominio.exemplo` — Origem pública para a verificação de requisições.

## Segurança e limites desta versão

Este é um projeto inicial para grupos pequenos, não um serviço profissional auditado. Sempre use HTTPS em produção. Há proteção básica contra tentativas excessivas, controle de acesso por campanha, hashes de senha e cookies seguros ao usar HTTPS. **Ainda faltam** recuperação de senha, verificação por e-mail, métricas, moderação e um banco transacional para grandes grupos. Como cada conta decide seu tipo no cadastro, qualquer pessoa pode criar a própria campanha como Mestre, mas **não pode administrar campanhas de outros Mestres**. Não compartilhe sua pasta `data/` ou credenciais.

## Cadastros e modelos JSON

Abra `GUIA-POKEDEX.md` para ver o significado de todos os campos, instruções de cadastro, importação e imagens. Use `public/pokedex-template.json` como base para importação de várias espécies. O Mestre também pode baixar o modelo dentro da própria Pokédex. As imagens **não entram no JSON importado**: envie no formulário após cadastrar.

## Estrutura da pasta

```
evolink-pokemon-rpg/
├── server.js                 # Autenticação + campanhas + Pokédex
├── public/
│   ├── index.html            # Aplicativo online
│   ├── pokedex-template.json # Modelo de importação
│   ├── pokedex-schema.json   # Estrutura formal dos campos
│   ├── demo.html             # Demonstração local (exige outros arquivos)
│   ├── app.js                # Interface e interações
│   ├── style.css             # Visual Pokémon clássico
│   ├── landscape.svg         # Arte de fundo original
│   ├── manifest.webmanifest  # Manifesto PWA
│   ├── sw.js                 # Cache da interface
│   └── icons/                # Ícones do aplicativo
├── data/                     # Dados + imagens enviados quando usar o servidor
├── GUIA-POKEDEX.md           # Como cadastrar todas as espécies
├── tests/                    # Teste integrado de contas e permissões
├── Dockerfile
└── docker-compose.yml
```

### Como experimentar a Equipe

1. Abra a demonstração em HTML e toque em **Jogador demo**.
2. No menu inferior, abra **Equipe**: você verá o exemplo Cedarbi, sua barra de HP e um golpe.
3. Toque em **Guardar** ou **Na equipe** para alterar os seis espaços.
4. Saia e entre em **Mestre demo** para entregar novos Pokémon. Selecione um jogador da campanha, escolha uma espécie da Pokédex e preencha a ficha.
5. Para adicionar **artes reais**, use o Painel do Mestre → Pokédex → Editar / imagens e selecione arquivos PNG/JPG/WEBP. Assim, a arte passa a aparecer tanto na Pokédex quanto na Equipe.

### Próximas etapas planejadas

1. Batalhas com turnos, dados e regras personalizadas do RPG.
2. Captura, lojas e regras de uso de itens mais avançadas.
3. Hospedagem online em HTTPS com armazenamento persistente e backups.

## Novidade da v0.4 — Pokédex pessoal

1. Entre como Mestre, crie uma campanha e cadastre espécies na Pokédex, enviando suas imagens normais e shiny.
2. Convide jogadores para a campanha.
3. Abra **Pokédex**, selecione o treinador e use **Marcar visto** na espécie encontrada.
4. O Jogador verá a entrada completa em sua Pokédex; Pokémon ainda não encontrados ficam como silhuetas.
5. Entregar uma espécie em **Equipe** registra sua captura automaticamente, inclusive se estiver no armazenamento.
6. **Resetar visto** é permitido para corrigir registros, mas não enquanto o treinador possuir um exemplar daquela espécie.

**Atualização de instalações anteriores:** substitua os arquivos da pasta do app pelo novo ZIP, mas **preserve integralmente a pasta `data/`**. Ao iniciar, espécies dos Pokémon já entregues aos jogadores são marcadas como capturadas automaticamente. Faça um backup antes da migração.

**Privacidade:** uma espécie marcada como oculta não é divulgada a jogadores sem a descoberta correspondente. Espécies normais ainda aparecem no catálogo em forma de entrada anônima para indicar o progresso. Imagens enviadas podem ser fotografias/ilustrações próprias do Mestre e não estão incluídas neste pacote.


## Novidade da v0.5 — Mochila, itens personalizados e upload de até 20 MB

1. Entre como **Mestre**, selecione uma campanha e abra a nova aba **Mochila** na barra inferior.
2. Escolha um treinador no seletor. No **Catálogo do Mestre**, crie ou edite itens com nome, categoria, descrição, emoji e, opcionalmente, quantidade de HP restaurada (somente na categoria **Cura**).
3. Em **Distribuir itens**, escolha item, entregar/retirar e quantidade. Em **Ajustar dinheiro**, escolha adicionar/retirar Pokédólares, inclusive registrando o motivo.
4. Entre como **Jogador**, abra **Mochila**: ela exibirá seus itens e saldo nessa campanha. Para usar uma Potion ou Super Potion, selecione um Pokémon com HP abaixo do máximo e acima de zero, depois confirme. O item é retirado e o HP atualizado no servidor.
5. Para qualquer item sem restauração automática, **Usar item** desconta uma unidade, porém não simula efeitos complexos: converse com o Mestre durante a sessão.
6. No **Painel do Mestre → Pokédex**, o limite de imagem passou a ser **20 MB para cada arte normal ou shiny**, em PNG, JPEG ou WEBP. O servidor armazena a imagem original na pasta `data/species-images`, aumentando o consumo de disco. É recomendado enviar imagens WEBP otimizadas sempre que possível.

**Demonstração vs. servidor:** a demonstração é HTML independente com dados locais e **não oferece compartilhamento em tempo real**; para não lotar o armazenamento do navegador, redimensiona imagens grandes automaticamente. No aplicativo com servidor, o arquivo de origem (até 20 MB) é armazenado como imagem separada e protegido pelas permissões da Pokédex. Não é uma hospedagem pronta nem APK.

**Atualizando a v0.4:** faça backup de `data/` inteira, substitua os arquivos de código pela v0.5 e **preserve a pasta `data/`**. O servidor cria os itens básicos para campanhas antigas, sem alterar os Pokémon cadastrados ou os itens que você já possuía; dinheiro e inventário dos jogadores começam zerados no servidor verdadeiro. Não copie a pasta `data/` de uma demonstração no navegador: ela utiliza armazenamento separado.
