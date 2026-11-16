@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo O Node.js nao esta instalado. & pause & exit /b 1)
node src/cli.js desconectar-google
pause
