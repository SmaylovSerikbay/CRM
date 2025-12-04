@echo off
chcp 65001 >nul
REM Скрипт автоматического деплоя для Windows
REM Использование: deploy.bat "сообщение коммита"

echo ================================
echo CRM Medical - Autodeploy
echo ================================
echo.

REM Настройки
set PROD_HOST=82.115.48.40
set PROD_USER=ubuntu
set PROD_PATH=/home/ubuntu/projects/CRM
set SSH_KEY=%USERPROFILE%\.ssh\id_rsa

REM Проверка аргументов
if "%~1"=="" (
    set /p COMMIT_MSG="Введите сообщение коммита: "
) else (
    set COMMIT_MSG=%~1
)

echo [1/5] Adding changes to git...
git add .

echo [2/5] Creating commit...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo No changes to commit or error
)

echo [3/5] Pushing to repository...
git push upstream main
if errorlevel 1 (
    git push upstream master
    if errorlevel 1 (
        git push origin main
        if errorlevel 1 (
            git push origin master
        )
    )
)

echo [4/5] Connecting to server...
echo [5/5] Updating on server...

ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && git pull origin main || git pull origin master && docker compose -f docker-compose.yml build && docker compose -f docker-compose.yml up -d"

echo.
echo ================================
echo Deploy completed successfully!
echo ================================
pause
