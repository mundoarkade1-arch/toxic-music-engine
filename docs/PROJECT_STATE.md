# Estado do projeto — Toxic Music Engine
Atualizado: 2026-11-18 (sessão 3: primeira execução real no PC do usuário). Legenda: [E] escrito e testado em testes automáticos · [V] validado no PC do usuário · [P] planejado · [?] não comprovado.

## Verificação (leia primeiro)
- Testes automáticos: 52 passam no ambiente de desenvolvimento (Node 22). Actions (Node 20) das etapas 3 e da sessão 3: NÃO confirmado.
- [V] Primeira execução real no PC do usuário (2026-11-18): login do Google OK, 1132 músicas lidas do Drive real, 54 tarefas feitas e 0 com erro, 4 arquivos enviados para a pasta `Toxic Engine` do Drive (`engine-status.json`, `fila.json`, `pendentes.json`, `playlists-motor.json`; usuário viu os 4 no Drive).
- [V] `playlists-motor.json` saiu com conteúdo: 4 playlists (Linkin Park 26 faixas, Henrique & Juliano 17, David Guetta 12, Nickelback 10). Artista e título estão nos campos certos nos dois formatos de nome. Resultado da rodada: 3266 músicas do Top 200 faltam na biblioteca, 12 repetidas.
- [?] Site e app ainda não leem nada do motor (etapas 4 e 5).
- [?] O "tentar de novo" ao salvar arquivos (`src/store.js`) foi testado por mim num script de desenvolvimento, mas NÃO tem teste automático no repositório e NÃO foi comprovado no PC (a última rodada passou sem precisar dele).

## Feito
- [E] `src/normalize.js`: chave artista|título (sem acento, sem maiúscula, "&" = "e", tira "feat/with" mas mantém "Ao Vivo/Remix").
- [E] `src/queue.js`: fila, sem tarefa repetida, recuperação depois de queda, espera de 1/5/15/60/240 min, para na 5ª falha.
- [E] `src/library.js`: lê pasta do PC (só nomes), acha repetidas.
- [E] `src/charts.js`, `src/pendentes.js`: compara Top 200 com a biblioteca.
- [E] `src/playlists.js`: playlists por cantor, formato `toxic-playlists` v2, arquivo `playlists-motor.json`.
- [E] `src/status.js`, `src/runner.js`, `src/cli.js`: status, execução e comandos.
- [E+V] `src/google-auth.js`: login por porta local + PKCE, token de renovação em `dados/google-token.json` (só neste PC, fora do GitHub), renovação automática, revogar/desconectar. Login real funcionou.
- [E+V] `src/drive.js`: lê a biblioteca do Drive real (1132 músicas), acha/cria pasta, cria ou atualiza JSON sem duplicar.
- [E+V] `src/enviar.js`: envia os 4 arquivos para a pasta `Toxic Engine`.
- [E+V] `baixar-charts`: baixa o `charts.js` do site (repositório do site é público; funcionou).
- [V] Arquivos `.bat` (dois cliques): `1-entrar-google.bat` e `2-atualizar-tudo.bat` funcionaram no Windows do usuário.
- [E] `src/store.js` (sessão 3): ao salvar, se o Windows responder EPERM/EBUSY/EACCES ("arquivo ocupado"), espera e tenta de novo até 8 vezes (cerca de 7 s no total); erro de outro tipo não repete; se não conseguir, apaga o `.tmp` e mostra mensagem clara. Commit feito pelo usuário no GitHub e arquivo copiado para o PC; falta confirmar que o Actions está verde.
- [V] `.gitignore` criado na sessão 3 (não existia, apesar do README dizer que sim). Ignora `dados/`, `node_modules/`, `*.log`, `*.tmp`. O repositório é PÚBLICO.

## Decisões tomadas
- `playlists-motor.json` fica na pasta `Toxic Engine`, não em `Toxic Playlists`: com o escopo `drive.file` o motor só escreve em pastas que ele mesmo criou.
- A pasta do motor no PC do usuário agora fica FORA do OneDrive: `C:\Motores do toxic\toxic-music-engine-main`. Motivos: (1) o OneDrive segurava arquivos e causou `EPERM ... rename` em `pendentes.json.tmp` (1 tarefa em 54, nas duas primeiras rodadas, tarefas diferentes: rock-2010 e eletronica-2010); (2) o OneDrive sincronizaria `dados/google-cliente.json` e `dados/google-token.json` (segredos) para a nuvem da Microsoft; (3) a execução automática (etapa 5) fica mais frágil
