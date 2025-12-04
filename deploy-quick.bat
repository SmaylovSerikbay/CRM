@echo off
REM Быстрый деплой без rebuild для Windows
REM Использование: deploy-quick.bat "сообщение коммита"

echo ================================
echo CRM Medical - Быстрый деплой
echo ================================
echo.

REM Настройки
set PROD_HOST=89.207.255.13
set PROD_USER=root
set PROD_PATH=/root/crm-medical
set SSH_KEY=%USERPROFILE%\.ssh\id_rsa

REM Проверка аргументов
if "%~1"=="" (
    set /p COMMIT_MSG="Введите сообщение коммита: "
) else (
    set COMMIT_MSG=%~1
)

echo [1/4] Добавление изменений в git...
git add .

echo [2/4] Создание коммита...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo Нет изменений для коммита или ошибка
)

echo [3/4] Отправка в репозиторий...
git push origin main
if errorlevel 1 (
    git push origin master
)

echo [4/4] Быстрое обновление на сервере...
ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && git pull origin main || git pull origin master && docker compose -f docker-compose.yml restart"

echo.
echo ================================
echo Быстрый деплой завершен!
echo ================================
pause
