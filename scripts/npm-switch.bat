@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Скрипт для автоматического переключения портов в Nginx Proxy Manager через API

REM Загружаем переменные из .env.prod если не установлены
if "%NPM_HOST%"=="" (
    if exist ".env.prod" (
        for /f "tokens=1,2 delims==" %%a in ('findstr /B "NPM_" .env.prod') do (
            set %%a=%%b
        )
    )
)

REM Конфигурация NPM API (с дефолтными значениями)
if "%NPM_HOST%"=="" set NPM_HOST=http://localhost:81
if "%NPM_EMAIL%"=="" set NPM_EMAIL=admin@example.com
if "%NPM_PASSWORD%"=="" set NPM_PASSWORD=changeme

set BACKEND_PORT=%1
set FRONTEND_PORT=%2

if "%BACKEND_PORT%"=="" (
    echo Использование: %0 ^<backend_port^> ^<frontend_port^>
    echo Пример: %0 8002 3002
    exit /b 1
)

if "%FRONTEND_PORT%"=="" (
    echo Использование: %0 ^<backend_port^> ^<frontend_port^>
    echo Пример: %0 8002 3002
    exit /b 1
)

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  Автоматическое переключение NPM                         ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Проверяем наличие curl и jq
where curl >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ОШИБКА] curl не найден. Установите curl.
    exit /b 1
)

where jq >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ОШИБКА] jq не найден. Установите jq: https://stedolan.github.io/jq/download/
    exit /b 1
)

REM Авторизация
echo Авторизация в NPM...
curl -s -X POST "%NPM_HOST%/api/tokens" ^
    -H "Content-Type: application/json" ^
    -d "{\"identity\":\"%NPM_EMAIL%\",\"secret\":\"%NPM_PASSWORD%\"}" ^
    > npm_token.json

for /f "delims=" %%i in ('jq -r .token npm_token.json') do set TOKEN=%%i

if "%TOKEN%"=="null" (
    echo [ОШИБКА] Не удалось авторизоваться в NPM
    echo Проверьте переменные NPM_EMAIL и NPM_PASSWORD
    del npm_token.json
    exit /b 1
)

echo [OK] Авторизация успешна
echo.

REM Получаем список proxy hosts
echo Поиск proxy hosts...
curl -s -X GET "%NPM_HOST%/api/nginx/proxy-hosts" ^
    -H "Authorization: Bearer %TOKEN%" ^
    > npm_hosts.json

REM Ищем нужные hosts (упрощенная версия)
echo Обновление портов...
echo.

REM Здесь нужно вручную указать ID ваших proxy hosts
REM Или использовать PowerShell версию для автоматического поиска

echo [ВНИМАНИЕ] Для Windows рекомендуется использовать PowerShell версию
echo Запустите: powershell -ExecutionPolicy Bypass -File scripts\npm-switch.ps1 %BACKEND_PORT% %FRONTEND_PORT%
echo.

REM Очистка
del npm_token.json npm_hosts.json 2>nul

exit /b 0
