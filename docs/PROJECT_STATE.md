# Estado do projeto — Toxic Music Engine
Atualizado: 2026-11-16. Legenda: [E] escrito e testado em testes automáticos · [P] planejado · [?] não comprovado.

## Verificação (leia primeiro)
- 28 testes automáticos passaram no ambiente de desenvolvimento, com Node 22.
- O GitHub Actions usa Node 20. Ainda NÃO foi confirmado que passa lá.
- Testado de ponta a ponta com o `charts.js` real do site e uma pasta de teste com 39 arquivos falsos. NÃO testado com a pasta de músicas real do usuário.
- Nada disto fala com o Google Drive, o site ou o app.

## Feito
- [E] `src/normalize.js`: chave artista|título (sem acento, sem maiúscula, "&" = "e", tira "feat/with" mas mantém "Ao Vivo/Remix").
- [E] `src/queue.js`: fila, sem tarefa repetida, recuperação depois de queda, espera de 1/5/15/60/240 min, para na 5ª falha.
- [E] `src/library.js`: lê pasta do PC (só nomes), acha repetidas.
- [E] `src/charts.js`, `src/pendentes.js`: compara Top 200 com a biblioteca.
- [E] `src/playlists.js`: playlists por cantor, formato `toxic-playlists` v2, arquivo `playlists-motor.json`.
- [E] `src/status.js`, `src/runner.js`, `src/cli.js`: status, execução e comandos.

## Arquivos locais do motor que NÃO estão no contrato (só no PC, dentro de `dados/`)
`biblioteca.json`, `duplicadas.json`, `pendentes-por-lista.json`. Se um dia forem para o Drive, o contrato (`CONTRATO_MOTOR.md` no repositório do Toxic Player) precisa ser atualizado antes.

## Limites conhecidos
- A biblioteca vem só do NOME do arquivo ("Artista - Título.mp3"). Arquivos sem esse padrão ficam sem artista.
- Sem gênero nem capa (isso vem das tags, que o motor ainda não lê).
- Duas músicas só são "repetidas" se artista principal e título (sem participação) forem iguais.

## Decisões em aberto
1. Usuário aceita instalar o Node.js no PC? (necessário para rodar o motor, etapa 3)
2. Pasta do Drive e acesso do motor ao Google: etapa 3, configuração passo a passo.

## Próxima etapa recomendada
Etapa 3: ligar o motor ao Google Drive (ler a biblioteca de lá e gravar `Toxic Engine/*.json` e `Toxic Playlists/playlists-motor.json`).
Antes: o usuário envia o motor ao GitHub e confirma o Actions verde.

## Registro
- 2026-11-16: criado o núcleo (etapa 2). Corrigidos durante os testes: caminhos padrão ignoravam `--dados`; a fila crescia a cada "planejar" (agora tira as tarefas feitas).
