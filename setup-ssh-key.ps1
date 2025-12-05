# Скрипт для настройки SSH подключения без пароля к продакшн серверу
# Использование: .\setup-ssh-key.ps1

$ErrorActionPreference = "Stop"

# Настройки
$SERVER_HOST = "82.115.48.40"
$SERVER_USER = "ubuntu"
$SERVER_PASSWORD = "q+I/U9UzOPuXexTC8jbyHgs="
$SSH_KEY_PATH = "$env:USERPROFILE\.ssh\id_rsa.pub"

Write-Host "================================" -ForegroundColor Green
Write-Host "Настройка SSH ключа для сервера" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Проверка наличия SSH ключа
if (-not (Test-Path $SSH_KEY_PATH)) {
    Write-Host "Ошибка: SSH ключ не найден по пути: $SSH_KEY_PATH" -ForegroundColor Red
    Write-Host "Создайте ключ командой: ssh-keygen -t rsa -b 4096" -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-Host "[1/4] Публичный ключ найден: $SSH_KEY_PATH" -ForegroundColor Green

# Читаем публичный ключ
$publicKey = Get-Content $SSH_KEY_PATH -Raw
$publicKey = $publicKey.Trim()

Write-Host ""
Write-Host "[2/4] Копирование ключа на сервер..." -ForegroundColor Green
Write-Host ""

# Функция для выполнения SSH команды с паролем
function Invoke-SSHWithPassword {
    param(
        [string]$Host,
        [string]$User,
        [string]$Password,
        [string]$Command
    )
    
    # Используем sshpass или plink если доступен, иначе используем ожидание ввода
    $sshCommand = "ssh"
    
    # Пробуем использовать plink (PuTTY) если установлен
    $plinkPath = Get-Command plink -ErrorAction SilentlyContinue
    if ($plinkPath) {
        Write-Host "Используется plink (PuTTY)" -ForegroundColor Yellow
        $commandString = "echo y | plink -ssh -pw `"$Password`" -batch $User@$Host `"$Command`""
        cmd /c $commandString
        return
    }
    
    # Пробуем использовать sshpass если доступен (через WSL)
    $wslCommand = wsl which sshpass 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Используется sshpass через WSL" -ForegroundColor Yellow
        wsl sshpass -p "$Password" ssh -o StrictHostKeyChecking=no "$User@$Host" "$Command"
        return
    }
    
    # Если ничего не доступно, используем ручной способ
    Write-Host "Автоматическое копирование недоступно." -ForegroundColor Yellow
    Write-Host "Используйте ручной способ из файла setup-ssh-key-manual.md" -ForegroundColor Yellow
    return $false
}

# Создаем команду для добавления ключа
$setupCommand = @"
mkdir -p ~/.ssh && 
chmod 700 ~/.ssh && 
echo '$publicKey' >> ~/.ssh/authorized_keys && 
chmod 600 ~/.ssh/authorized_keys && 
echo 'Ключ успешно добавлен!'
"@

Write-Host "Попытка автоматического копирования ключа..." -ForegroundColor Yellow
Write-Host "Если не сработает, используйте ручной способ (см. setup-ssh-key-manual.md)" -ForegroundColor Yellow
Write-Host ""

# Пробуем автоматическое копирование
try {
    # Создаем временный файл с командой
    $tempScript = [System.IO.Path]::GetTempFileName()
    $setupCommand | Out-File -FilePath $tempScript -Encoding ASCII -NoNewline
    
    # Пробуем через WSL sshpass если доступно
    $hasWSL = wsl echo test 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Обнаружен WSL, попытка установить sshpass..." -ForegroundColor Yellow
        wsl sudo apt-get update -qq >$null 2>&1
        wsl sudo apt-get install -y sshpass >$null 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Копирование ключа через WSL..." -ForegroundColor Green
            $publicKey | wsl sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Ключ успешно скопирован!" -ForegroundColor Green
                $success = $true
            }
        }
    }
    
    if (-not $success) {
        Write-Host ""
        Write-Host "Автоматическое копирование не удалось." -ForegroundColor Yellow
        Write-Host "Используйте РУЧНОЙ способ:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Скопируйте ваш публичный ключ:" -ForegroundColor Cyan
        Write-Host "   notepad $SSH_KEY_PATH" -ForegroundColor White
        Write-Host ""
        Write-Host "2. Подключитесь к серверу:" -ForegroundColor Cyan
        Write-Host "   ssh $SERVER_USER@$SERVER_HOST" -ForegroundColor White
        Write-Host ""
        Write-Host "3. Выполните команды на сервере:" -ForegroundColor Cyan
        Write-Host "   mkdir -p ~/.ssh" -ForegroundColor White
        Write-Host "   chmod 700 ~/.ssh" -ForegroundColor White
        Write-Host "   nano ~/.ssh/authorized_keys" -ForegroundColor White
        Write-Host "   (вставьте ключ, сохраните: Ctrl+O, Enter, Ctrl+X)" -ForegroundColor White
        Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
        Write-Host ""
        Read-Host "Нажмите Enter после завершения ручной настройки"
    }
    
} catch {
    Write-Host "Ошибка: $_" -ForegroundColor Red
    $success = $false
} finally {
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
}

# Проверка подключения
Write-Host ""
Write-Host "[3/4] Проверка подключения без пароля..." -ForegroundColor Green

try {
    $result = ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "echo 'OK'" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host "Настройка завершена успешно!" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Теперь можно подключаться без пароля:" -ForegroundColor Cyan
        Write-Host "  ssh $SERVER_USER@$SERVER_HOST" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ВНИМАНИЕ: Автоматическая проверка не прошла." -ForegroundColor Yellow
        Write-Host "Попробуйте подключиться вручную: ssh $SERVER_USER@$SERVER_HOST" -ForegroundColor Cyan
        Write-Host ""
    }
} catch {
    Write-Host "Ошибка при проверке: $_" -ForegroundColor Yellow
}

Write-Host "[4/4] Готово!" -ForegroundColor Green
Write-Host ""
Read-Host "Нажмите Enter для выхода"


