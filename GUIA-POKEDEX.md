# Pokédex Evolution — Guia de cadastro (EvoLink v0.2)

## Registro da espécie

| Campo | O que colocar | Exemplo |
|---|---|---|
| `number` | Número único na Pokédex da campanha | `1` |
| `name` | Nome do Pokémon | `Cedarbi` |
| `category` | Categoria de Pokédex (opcional) | `Pokémon Floresta` |
| `inspirationCountry` | País de inspiração (opcional) | `Marrocos` |
| `type1`, `type2` | Tipos; segundo opcional | `Grama`, `Psíquico` |
| `heightM`, `weightKg` | Altura em metros, peso em quilogramas | `0.48`, `4.2` |
| `description` | Texto da Pokédex | Descrição livre |
| `abilities.primary`, `.secondary`, `.hidden` | Habilidades oficiais ou originais | `Overgrow` |
| `stats.hp`, `.attack`, `.defense`, `.spAttack`, `.spDefense`, `.speed` | Base Stats inteiros (1–255) | `45` |
| `evolvesFrom`, `evolvesTo` | Números da linha evolutiva | `1`, `3` |
| `evolutionMethod` | Método de evolução | `Ao atingir nível 16` |
| `images.normal`, `images.shiny` | Caminhos atribuídos pelo upload dentro do app | Preenchidos automaticamente |
| `visibleToPlayers` | Mostra ou oculta essa espécie na campanha | `true` ou `false` |

Se um dado ainda não foi definido, deixe texto como string vazia (`""`) e números como `null`. O app calcula o total dos seis status automaticamente quando todos estão informados.

## Cadastro individual pelo celular

1. Entre como **Mestre** e crie/abra a campanha.
2. Acesse **Pokédex** > **Cadastrar Pokémon**.
3. Preencha identificação, tipos, peso, altura, descrição, habilidades, status e evolução.
4. Selecione duas imagens do seu celular, uma normal e uma shiny (opcionais).
5. Toque em **Cadastrar Pokémon**. Para alterar depois, use **Editar / imagens**.

Na versão hospedada, as imagens são guardadas separadamente do banco de contas em `data/species-images`. Cada imagem PNG, JPG ou WEBP deve ter até **20 MB**. Na demonstração local imagens selecionadas de até **20 MB** são redimensionadas/comprimidas automaticamente; o espaço local do navegador ainda pode acabar.

## Importação de vários Pokémon

- Abra `Pokedex-Evolution-Modelo.json` no editor de texto do celular e altere os exemplos.
- Crie/copiei entradas adicionais no array `species`; cada número e nome precisa ser exclusivo na campanha.
- Na Pokédex do Mestre, use **Importar Pokémon** e selecione o arquivo JSON.
- A importação aceita até **200 espécies por lote** e não sobrescreve espécies existentes.
- Para imagens, depois da importação abra cada Pokémon em **Editar / imagens** e envie os arquivos.

**Atenção:** os quatro Pokémon do modelo são exemplos parcialmente preenchidos, com dados ainda não definidos deixados em branco. As artes do protótipo visual da tela da Pokédex NÃO são imagens oficiais cadastradas nem as artes definitivas desses Pokémon.

## Segurança, jogadores e progresso

O cadastro de espécie é compartilhado com os jogadores daquela campanha, exceto se `visibleToPlayers = false`. Somente o Mestre pode criar, modificar, importar, excluir ou enviar imagens. Dados privados de uma campanha não são mostrados a outras campanhas.

A seção de espécies é diferente das fichas dos Pokémon capturados. Nível, IV/EV, natureza, golpes, HP atual, amizade, dono, experiência e condição de batalha serão atributos das instâncias capturadas em uma etapa futura. Descobertas individuais (visto/capturado), equipe, progressão e batalhas ainda não estão implementadas nesta versão.

Ao exportar a Pokédex você recebe **somente os dados JSON**, não os arquivos de imagens. Para backup completo, preserve também a pasta `data/` do servidor.
