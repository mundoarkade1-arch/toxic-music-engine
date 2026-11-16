@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist dados mkdir dados
where node >nul 2>nul || (echo O Node.js nao esta instalado. Instale em https://nodejs.org e tente de novo. & pause & exit /b 1)
echo [1/5] Baixando as listas Top 200 do site...
node src/cli.js baixar-charts || goto erro
echo [2/5] Lendo as musicas do seu Drive...
node src/cli.js ler-drive || goto erro
echo [3/5] Montando as tarefas...
node src/cli.js planejar || goto erro
echo [4/5] Executando as tarefas...
node src/cli.js executar || goto erro
echo [5/5] Enviando o resultado para a pasta Toxic Engine do Drive...
node src/cli.js enviar-drive || goto erro
echo.
echo PRONTO. Tudo certo.
pause
exit /b 0
:erro
echo.
echo DEU ERRO no passo acima. Leia a mensagem e me conte o que apareceu.
pause
exit /b 1
