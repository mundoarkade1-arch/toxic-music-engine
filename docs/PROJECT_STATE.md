# Estado do projeto — Toxic Music Engine
Atualizado: 2026-11-16 (etapa 3, código). Legenda: [E] escrito e testado em testes automáticos · [P] planejado · [?] não comprovado.

## Verificação (leia primeiro)
- Etapa 2 (28 testes): Actions VERDE no GitHub, com Node 20 (usuário confirmou).
- Etapa 3 (código novo): 49 testes passam no ambiente de desenvolvimento (Node 22). Actions da etapa 3: ainda NÃO confirmado.
- Testado de ponta a ponta com o `charts.js` real do site e uma pasta de teste com 39 arquivos falsos. NÃO testado com a pasta de músicas real do usuário.
- A ligação com o Google Drive foi testada SÓ com um Drive de mentira e um Google de mentira. Nunca falou com o Google de verdade: falta configurar o cliente (`docs/GOOGLE_SETUP.md`) e testar no PC do usuário.
- Site e app ainda não leem nada do motor.

## Feito
- [E] `src/normalize.js`: chave artista|título (sem acento, sem maiúscula, "&" = "e", tira "feat/with" mas mantém "Ao Vivo/Remix").
- [E] `src/queue.js`: fila, sem tarefa repetida, recuperação depois de queda, espera de 1/5/15/60/240 min, para na 5ª falha.
- [E] `src/library.js`: lê pasta do PC (só nomes), acha repetidas.
- [E] `src/charts.js`, `src/pendentes.js`: compara Top 200 com a biblioteca.
- [E] `src/playlists.js`: playlists por cantor, formato `toxic-playlists` v2, arquivo `playlists-motor.json`.
- [E] `src/status.js`, `src/runner.js`, `src/cli.js`: status, execução e comandos.

## Etapa 3 — Google Drive (código escrito, NÃO validado com o Google real)
- [E, só com mock] `src/google-auth.js`: login por porta local + PKCE, token de renovação em `dados/google-token.json` (só neste PC, fora do GitHub), renovação automática, revogar/desconectar. Mensagens de erro nunca repetem token nem segredo.
- [E, só com mock] `src/drive.js`: lista com páginas, espera e repete em 429/5xx, lê biblioteca (pastas + só áudio), acha/cria pasta, cria ou atualiza JSON pelo nome sem duplicar.
- [E] `src/enviar.js`: envia `engine-status.json`, `fila.json`, `pendentes.json`, `playlists-motor.json` para a pasta `Toxic Engine`.
- [E] `baixar-charts`: baixa o `charts.js` do site (raw.githubusercontent.com; só funciona se o repositório do site for público) e confere antes de gravar.
- [E] Arquivos `.bat` para o Windows (dois cliques), porque o usuário não quer usar terminal.
- Decisão: `playlists-motor.json` fica na pasta `Toxic Engine`, não em `Toxic Playlists`: com o escopo `drive.file` o motor só escreve em pastas que ele mesmo criou.
- Risco aceito e registrado: o token de renovação fica em arquivo no PC do usuário (necessário para rodar sem pedir login toda vez). Com a tela de consentimento em modo "Teste" o Google costuma cancelá-lo em 7 dias.

## Arquivos locais do motor que NÃO estão no contrato (só no PC, dentro de `dados/`)
`biblioteca.json`, `duplicadas.json`, `pendentes-por-lista.json`. Se um dia forem para o Drive, o contrato (`CONTRATO_MOTOR.md` no repositório do Toxic Player) precisa ser atualizado antes.

## Limites conhecidos
- A biblioteca vem só do NOME do arquivo ("Artista - Título.mp3"). Arquivos sem esse padrão ficam sem artista.
- Sem gênero nem capa (isso vem das tags, que o motor ainda não lê).
- Duas músicas só são "repetidas" se artista principal e título (sem participação) forem iguais.

## Decisões em aberto
1. Usuário aceita instalar o Node.js no PC? (necessário para rodar o motor)
2. Criar o cliente do Google tipo "App para computador" (`docs/GOOGLE_SETUP.md`).

## Próxima etapa recomendada
Validar a etapa 3 no PC do usuário: instalar o Node, criar o cliente do Google, rodar `1-entrar-google.bat` e `2-atualizar-tudo.bat`, conferir a pasta `Toxic Engine` no Drive. Depois: etapa 4 (aba do site que mostra o status).

## Registro
- 2026-11-16: criado o núcleo (etapa 2). Corrigidos durante os testes: caminhos padrão ignoravam `--dados`; a fila crescia a cada "planejar" (agora tira as tarefas feitas).
- 2026-11-16: etapa 3 escrita (login Google, cliente Drive, envio, .bat). Teste que falhou durante o desenvolvimento era erro do próprio teste (espaço como "+" na busca), corrigido.
