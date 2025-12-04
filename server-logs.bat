@echo off
chcp 65001 >nul
REM Просмотр логов на сервере

set PROD_HOST=82.115.48.40
set PROD_USER=ubuntu
set PROD_PATH=/home/ubuntu/projects/CRM
set SSH_KEY=%USERPROFILE%\.ssh\id_rsa

echo Getting logs from server...
ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.yml logs -f"
