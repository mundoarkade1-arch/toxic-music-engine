# Toxic Music Engine

Motor de automação do ecossistema Toxic. Roda no PC do usuário (Windows), sem servidor e sem custo.

Ele conversa com o Gerenciador de Músicas (site) e com o Toxic Player (app) pelo Google Drive.
O contrato dos arquivos fica no repositório do Toxic Player: `docs/ecossistema/CONTRATO_MOTOR.md`.

## O que ele faz hoje (versão 0.1.0)
- Lê os NOMES dos arquivos de uma pasta de músicas do PC (só leitura).
- Compara com as listas Top 200 (`charts.js` do site) e diz o que falta. Só lista. Não baixa nada.
- Acha músicas repetidas. Só avisa. Não apaga nada.
- Gera playlists por cantor (5 músicas ou mais) no formato `toxic-playlists` v2.
- Entra no Google (Drive) e lê a biblioteca de lá; grava os resultados na pasta `Toxic Engine` do Drive. (código pronto e testado com Drive de mentira; ainda NÃO testado no seu Drive de verdade)
- Mantém uma fila de tarefas com progresso salvo, tentativas e espera crescente em caso de erro.
- Grava um resumo (`engine-status.json`) para o site mostrar.

## O que ele AINDA NÃO faz
- A leitura do Drive real ainda não foi validada (falta a configuração do Google: veja `docs/GOOGLE_SETUP.md`).
- Não consulta o Deezer por conta própria. Usa o `charts.js` que o site já atualiza.
- Não baixa músicas. Não existe ligação com o Media Downloader.
- Site e app ainda não leem os arquivos do motor (etapas 4 e 5).

## Windows: dois cliques
- `1-entrar-google.bat`: conecta o motor à sua conta Google (uma vez; de novo se o acesso expirar).
- `2-atualizar-tudo.bat`: baixa as listas, lê o Drive, monta e roda as tarefas e envia o resultado ao Drive.
- `3-desconectar-google.bat`: cancela o acesso.

## Comandos
Precisa do Node.js 20 ou mais novo (https://nodejs.org, versão LTS). Todos os arquivos do motor ficam na pasta `dados/` (não vai para o GitHub).

- `node src/cli.js baixar-charts` baixa as listas Top 200 publicadas pelo site
- `node src/cli.js entrar-google` / `desconectar-google` / `ler-drive` / `enviar-drive`
- `node src/cli.js ler-pasta "C:\Musicas"` lê a pasta e cria `dados/biblioteca.json`
- `node src/cli.js planejar` cria as tarefas (precisa de `dados/charts.js`)
- `node src/cli.js executar` roda a fila
- `node src/cli.js tentar-de-novo` devolve à fila as tarefas que deram erro

Mudar a pasta de dados: acrescente `--dados <pasta>`.

## Testes
`npm test` roda os testes automáticos. O GitHub Actions roda os mesmos testes a cada envio.

## Segurança
Senhas, tokens e chaves nunca entram neste repositório (veja `.gitignore`).
