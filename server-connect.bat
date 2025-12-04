@echo off
chcp 65001 >nul
REM Быстрое подключение к серверу

set PROD_HOST=82.115.48.40
set PROD_USER=ubuntu
set SSH_KEY=%USERPROFILE%\.ssh\id_rsa

echo Connecting to server %PROD_HOST%...
ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST%
