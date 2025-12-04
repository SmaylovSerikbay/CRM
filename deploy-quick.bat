@echo off
chcp 65001 >nul
REM Быстрый деплой без rebuild для Windows
REM Использование: deploy-quick.bat "сообщение коммита"

echo ================================
echo CRM Medical - Quick Deploy
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

echo [1/4] Adding changes to git...
git add .

echo [2/4] Creating commit...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo No changes to commit or error
)

echo [3/4] Pushing to repository...
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

echo [4/4] Quick update on server...
ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && git pull origin main || git pull origin master && docker compose -f docker-compose.yml restart"

echo.
echo ================================
echo Quick deploy completed!
echo ================================
pause
