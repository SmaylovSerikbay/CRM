@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Blue-Green Deployment для Windows с Nginx Proxy Manager
REM Использование: deploy-blue-green.bat [deploy|switch|rollback|cleanup|status]

set COMPOSE_FILE=docker-compose.blue-green.yml
set STATE_FILE=.deployment-state

REM Порты для blue/green окружений
set BACKEND_BLUE_PORT=8001
set BACKEND_GREEN_PORT=8002
set FRONTEND_BLUE_PORT=3001
set FRONTEND_GREEN_PORT=3002

if "%1"=="" goto :usage
if "%1"=="auto" goto :auto_deploy
if "%1"=="deploy" goto :deploy
if "%1"=="switch" goto :switch
if "%1"=="rollback" goto :rollback
if "%1"=="cleanup" goto :cleanup
if "%1"=="status" goto :status
goto :usage

:get_active_color
    if exist "%STATE_FILE%" (
        set /p ACTIVE_COLOR=<"%STATE_FILE%"
    ) else (
        set ACTIVE_COLOR=blue
    )
    exit /b

:get_inactive_color
    call :get_active_color
    if "%ACTIVE_COLOR%"=="blue" (
        set INACTIVE_COLOR=green
    ) else (
        set INACTIVE_COLOR=blue
    )
    exit /b

:check_health
    set SERVICE=%1
    set MAX_ATTEMPTS=30
    set ATTEMPT=0
    
    echo Проверка здоровья %SERVICE%...
    
    :health_loop
    if %ATTEMPT% geq %MAX_ATTEMPTS% (
        echo [ОШИБКА] %SERVICE% не прошел проверку здоровья
        exit /b 1
    )
    
    docker compose -f %COMPOSE_FILE% ps %SERVICE% | findstr /C:"healthy" >nul
    if %ERRORLEVEL%==0 (
        echo [OK] %SERVICE% здоров
        exit /b 0
    )
    
    set /a ATTEMPT+=1
    timeout /t 2 /nobreak >nul
    goto :health_loop

:deploy
    call :get_active_color
    call :get_inactive_color
    
    echo.
    echo === Blue-Green Deployment ===
    echo Активный: %ACTIVE_COLOR%
    echo Деплой в: %INACTIVE_COLOR%
    echo.
    
    echo Шаг 1: Сборка %INACTIVE_COLOR% окружения...
    if "%INACTIVE_COLOR%"=="green" (
        docker compose -f %COMPOSE_FILE% --profile green build --no-cache
    ) else (
        docker compose -f %COMPOSE_FILE% build --no-cache
    )
    
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Сборка провалена
        exit /b 1
    )
    
    echo Шаг 2: Запуск %INACTIVE_COLOR% окружения...
    if "%INACTIVE_COLOR%"=="green" (
        docker compose -f %COMPOSE_FILE% --profile green up -d
    ) else (
        docker compose -f %COMPOSE_FILE% up -d
    )
    
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Запуск провален
        exit /b 1
    )
    
    echo Шаг 3: Проверка здоровья сервисов...
    call :check_health backend-%INACTIVE_COLOR%
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Деплой провален: backend-%INACTIVE_COLOR% не здоров
        if "%INACTIVE_COLOR%"=="green" (
            docker compose -f %COMPOSE_FILE% --profile green down
        ) else (
            docker compose -f %COMPOSE_FILE% down
        )
        exit /b 1
    )
    
    call :check_health frontend-%INACTIVE_COLOR%
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Деплой провален: frontend-%INACTIVE_COLOR% не здоров
        if "%INACTIVE_COLOR%"=="green" (
            docker compose -f %COMPOSE_FILE% --profile green down
        ) else (
            docker compose -f %COMPOSE_FILE% down
        )
        exit /b 1
    )
    
    echo.
    echo [OK] Деплой успешен! %INACTIVE_COLOR% окружение готово.
    echo.
    echo Тестирование:
    if "%INACTIVE_COLOR%"=="green" (
        echo   Backend:  http://localhost:%BACKEND_GREEN_PORT%/api/health/
        echo   Frontend: http://localhost:%FRONTEND_GREEN_PORT%/
    ) else (
        echo   Backend:  http://localhost:%BACKEND_BLUE_PORT%/api/health/
        echo   Frontend: http://localhost:%FRONTEND_BLUE_PORT%/
    )
    echo.
    echo Используйте 'deploy-blue-green.bat switch' для переключения трафика
    exit /b 0

:switch
    call :get_active_color
    call :get_inactive_color
    
    echo.
    echo === Переключение трафика ===
    echo С %ACTIVE_COLOR% на %INACTIVE_COLOR%
    echo.
    
    REM Проверяем, что новое окружение запущено
    docker compose -f %COMPOSE_FILE% ps backend-%INACTIVE_COLOR% | findstr /C:"Up" >nul
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] %INACTIVE_COLOR% окружение не запущено
        echo Сначала выполните: deploy-blue-green.bat deploy
        exit /b 1
    )
    
    REM Определяем порты для переключения
    if "%INACTIVE_COLOR%"=="green" (
        set BACKEND_PORT=%BACKEND_GREEN_PORT%
        set FRONTEND_PORT=%FRONTEND_GREEN_PORT%
    ) else (
        set BACKEND_PORT=%BACKEND_BLUE_PORT%
        set FRONTEND_PORT=%FRONTEND_BLUE_PORT%
    )
    
    echo.
    echo === ИНСТРУКЦИЯ ПО ПЕРЕКЛЮЧЕНИЮ В NGINX PROXY MANAGER ===
    echo.
    echo 1. Backend API:
    echo    Откройте Proxy Host для: crm.archeo.kz/api
    echo    Измените Forward Port на: %BACKEND_PORT%
    echo.
    echo 2. Frontend:
    echo    Откройте Proxy Host для: crm.archeo.kz
    echo    Измените Forward Port на: %FRONTEND_PORT%
    echo.
    echo После переключения в Nginx Proxy Manager:
    echo   - Проверьте работу сайта
    echo   - Если все ОК, подтвердите ниже
    echo   - Для отката выполните: deploy-blue-green.bat rollback
    echo.
    
    REM Сохраняем информацию о переключении для отката
    echo %ACTIVE_COLOR%>.deployment-state.backup
    
    set /p CONFIRM="Переключили в Nginx Proxy Manager? Подтвердить? (y/n): "
    if /i "%CONFIRM%"=="y" (
        echo %INACTIVE_COLOR%>%STATE_FILE%
        echo.
        echo [OK] Активное окружение изменено на %INACTIVE_COLOR%
        echo Старое окружение ^(%ACTIVE_COLOR%^) все еще работает для отката
        echo Используйте 'deploy-blue-green.bat cleanup' для остановки старого окружения
    ) else (
        echo Переключение отменено
    )
    exit /b 0

:rollback
    call :get_active_color
    
    if not exist ".deployment-state.backup" (
        echo [ОШИБКА] Информация для отката не найдена
        exit /b 1
    )
    
    set /p PREVIOUS_COLOR=<.deployment-state.backup
    
    echo.
    echo === Откат к предыдущей версии ===
    echo Откат с %ACTIVE_COLOR% на %PREVIOUS_COLOR%
    echo.
    
    REM Определяем порты для отката
    if "%PREVIOUS_COLOR%"=="blue" (
        set BACKEND_PORT=%BACKEND_BLUE_PORT%
        set FRONTEND_PORT=%FRONTEND_BLUE_PORT%
    ) else (
        set BACKEND_PORT=%BACKEND_GREEN_PORT%
        set FRONTEND_PORT=%FRONTEND_GREEN_PORT%
    )
    
    echo === ИНСТРУКЦИЯ ПО ОТКАТУ В NGINX PROXY MANAGER ===
    echo.
    echo 1. Backend API:
    echo    Откройте Proxy Host для: crm.archeo.kz/api
    echo    Верните Forward Port на: %BACKEND_PORT%
    echo.
    echo 2. Frontend:
    echo    Откройте Proxy Host для: crm.archeo.kz
    echo    Верните Forward Port на: %FRONTEND_PORT%
    echo.
    
    set /p CONFIRM="Откатили в Nginx Proxy Manager? Подтвердить? (y/n): "
    if /i "%CONFIRM%"=="y" (
        echo %PREVIOUS_COLOR%>%STATE_FILE%
        del .deployment-state.backup
        echo.
        echo [OK] Откат выполнен успешно
    ) else (
        echo Откат отменен
    )
    exit /b 0

:cleanup
    call :get_active_color
    call :get_inactive_color
    
    echo.
    echo === Очистка неактивного окружения ===
    echo Остановка %INACTIVE_COLOR% окружения
    echo.
    
    set /p CONFIRM="Вы уверены? (y/n): "
    if /i "%CONFIRM%"=="y" (
        if "%INACTIVE_COLOR%"=="green" (
            docker compose -f %COMPOSE_FILE% --profile green down
        ) else (
            docker compose -f %COMPOSE_FILE% down
        )
        echo [OK] %INACTIVE_COLOR% окружение остановлено
    )
    exit /b 0

:status
    call :get_active_color
    
    echo.
    echo === Статус Blue-Green Deployment ===
    echo Активное окружение: %ACTIVE_COLOR%
    echo.
    
    echo Blue окружение:
    docker compose -f %COMPOSE_FILE% ps backend-blue frontend-blue 2>nul
    if %ERRORLEVEL% neq 0 echo Не запущено
    echo.
    
    echo Green окружение:
    docker compose -f %COMPOSE_FILE% --profile green ps backend-green frontend-green 2>nul
    if %ERRORLEVEL% neq 0 echo Не запущено
    echo.
    
    echo Порты:
    echo   Blue:  Backend=%BACKEND_BLUE_PORT%, Frontend=%FRONTEND_BLUE_PORT%
    echo   Green: Backend=%BACKEND_GREEN_PORT%, Frontend=%FRONTEND_GREEN_PORT%
    exit /b 0

:auto_deploy
    call :get_active_color
    call :get_inactive_color
    
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║  АВТОМАТИЧЕСКИЙ BLUE-GREEN DEPLOYMENT                     ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo Активный: %ACTIVE_COLOR% -^> Деплой в: %INACTIVE_COLOR%
    echo.
    
    REM Шаг 0: Git pull
    echo [0/5] Обновление кода из Git...
    if exist ".git" (
        echo Выполняется git pull...
        git pull
        
        if !ERRORLEVEL! neq 0 (
            echo [ОШИБКА] Ошибка при git pull
            set /p CONFIRM="Продолжить деплой? (y/n): "
            if /i not "!CONFIRM!"=="y" (
                echo Деплой отменен
                exit /b 1
            )
        ) else (
            echo [OK] Код обновлен
        )
    ) else (
        echo [ВНИМАНИЕ] Git репозиторий не найден, пропускаем git pull
    )
    echo.
    
    REM Шаг 1: Деплой
    echo [1/5] Деплой новой версии...
    echo Шаг 1.1: Сборка %INACTIVE_COLOR% окружения...
    
    if "%INACTIVE_COLOR%"=="green" (
        docker compose -f %COMPOSE_FILE% --profile green build --no-cache
    ) else (
        docker compose -f %COMPOSE_FILE% build --no-cache
    )
    
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Сборка провалена. Деплой отменен.
        exit /b 1
    )
    
    echo Шаг 1.2: Запуск %INACTIVE_COLOR% окружения...
    if "%INACTIVE_COLOR%"=="green" (
        docker compose -f %COMPOSE_FILE% --profile green up -d
    ) else (
        docker compose -f %COMPOSE_FILE% up -d
    )
    
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Запуск провален. Деплой отменен.
        exit /b 1
    )
    
    echo Шаг 1.3: Проверка здоровья сервисов...
    call :check_health backend-%INACTIVE_COLOR%
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Backend не здоров. Откат...
        if "%INACTIVE_COLOR%"=="green" (
            docker compose -f %COMPOSE_FILE% --profile green down
        ) else (
            docker compose -f %COMPOSE_FILE% down
        )
        exit /b 1
    )
    
    call :check_health frontend-%INACTIVE_COLOR%
    if %ERRORLEVEL% neq 0 (
        echo [ОШИБКА] Frontend не здоров. Откат...
        if "%INACTIVE_COLOR%"=="green" (
            docker compose -f %COMPOSE_FILE% --profile green down
        ) else (
            docker compose -f %COMPOSE_FILE% down
        )
        exit /b 1
    )
    
    echo [OK] Деплой успешен!
    echo.
    
    REM Шаг 2: Переключение трафика
    echo [2/5] Переключение трафика...
    
    if "%INACTIVE_COLOR%"=="green" (
        set BACKEND_PORT=%BACKEND_GREEN_PORT%
        set FRONTEND_PORT=%FRONTEND_GREEN_PORT%
    ) else (
        set BACKEND_PORT=%BACKEND_BLUE_PORT%
        set FRONTEND_PORT=%FRONTEND_BLUE_PORT%
    )
    
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║  ПЕРЕКЛЮЧИТЕ ТРАФИК В NGINX PROXY MANAGER                 ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo Backend API ^(crm.archeo.kz/api^):
    echo   Forward Port: старый -^> %BACKEND_PORT%
    echo.
    echo Frontend ^(crm.archeo.kz^):
    echo   Forward Port: старый -^> %FRONTEND_PORT%
    echo.
    echo Тестирование ^(до переключения^):
    echo   Backend:  http://localhost:%BACKEND_PORT%/api/health/
    echo   Frontend: http://localhost:%FRONTEND_PORT%/
    echo.
    
    REM Сохраняем для отката
    echo %ACTIVE_COLOR%>.deployment-state.backup
    
    set /p CONFIRM="Переключили трафик в NPM? (y/n): "
    if /i not "%CONFIRM%"=="y" (
        echo.
        echo Деплой приостановлен. Новое окружение работает на портах %BACKEND_PORT%/%FRONTEND_PORT%
        echo Для продолжения: deploy-blue-green.bat switch
        exit /b 0
    )
    
    REM Шаг 3: Проверка
    echo.
    echo [3/5] Проверка работы сайта...
    echo Откройте https://crm.archeo.kz и проверьте работу
    echo.
    
    set /p CONFIRM="Сайт работает нормально? (y/n): "
    if /i not "%CONFIRM%"=="y" (
        echo.
        echo [ОШИБКА] Обнаружены проблемы. Выполняется откат...
        
        if "%ACTIVE_COLOR%"=="blue" (
            set ROLLBACK_BACKEND_PORT=%BACKEND_BLUE_PORT%
            set ROLLBACK_FRONTEND_PORT=%FRONTEND_BLUE_PORT%
        ) else (
            set ROLLBACK_BACKEND_PORT=%BACKEND_GREEN_PORT%
            set ROLLBACK_FRONTEND_PORT=%FRONTEND_GREEN_PORT%
        )
        
        echo.
        echo ╔═══════════════════════════════════════════════════════════╗
        echo ║  ВЕРНИТЕ ПОРТЫ В NGINX PROXY MANAGER                      ║
        echo ╚═══════════════════════════════════════════════════════════╝
        echo.
        echo Backend API: Forward Port -^> !ROLLBACK_BACKEND_PORT!
        echo Frontend:    Forward Port -^> !ROLLBACK_FRONTEND_PORT!
        echo.
        
        set /p CONFIRM="Вернули порты? (y/n): "
        if /i "%CONFIRM%"=="y" (
            del .deployment-state.backup
            echo [OK] Откат выполнен
            echo Новое окружение все еще запущено для отладки
        )
        exit /b 1
    )
    
    REM Шаг 4: Очистка
    echo.
    echo [4/5] Очистка старого окружения...
    echo %INACTIVE_COLOR%>%STATE_FILE%
    del .deployment-state.backup
    
    echo Ожидание 30 секунд перед остановкой старого окружения...
    echo ^(для возможности быстрого отката^)
    timeout /t 30 /nobreak
    
    echo Остановка %ACTIVE_COLOR% окружения...
    if "%ACTIVE_COLOR%"=="green" (
        docker compose -f %COMPOSE_FILE% --profile green down
    ) else (
        docker compose -f %COMPOSE_FILE% down
    )
    
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║  ✓ ДЕПЛОЙ ЗАВЕРШЕН УСПЕШНО!                              ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo Активное окружение: %INACTIVE_COLOR%
    echo Порты: Backend %BACKEND_PORT%, Frontend %FRONTEND_PORT%
    echo.
    exit /b 0

:usage
    echo Использование: %0 {auto^|deploy^|switch^|rollback^|cleanup^|status}
    echo.
    echo Команды:
    echo   auto     - 🚀 АВТОМАТИЧЕСКИЙ полный деплой ^(deploy + switch + cleanup^)
    echo   deploy   - Деплой новой версии в неактивное окружение
    echo   switch   - Переключить трафик на новое окружение (инструкция для NPM)
    echo   rollback - Откатить к предыдущей версии (инструкция для NPM)
    echo   cleanup  - Остановить неактивное окружение
    echo   status   - Показать статус окружений
    echo.
    echo Порты окружений:
    echo   Blue:  Backend=%BACKEND_BLUE_PORT%, Frontend=%FRONTEND_BLUE_PORT%
    echo   Green: Backend=%BACKEND_GREEN_PORT%, Frontend=%FRONTEND_GREEN_PORT%
    exit /b 1
