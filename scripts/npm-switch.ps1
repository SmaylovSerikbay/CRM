# Скрипт для автоматического переключения портов в Nginx Proxy Manager через API

param(
    [Parameter(Mandatory=$true)]
    [int]$BackendPort,
    
    [Parameter(Mandatory=$true)]
    [int]$FrontendPort
)

# Конфигурация NPM API
$NPM_HOST = if ($env:NPM_HOST) { $env:NPM_HOST } else { "http://localhost:81" }
$NPM_EMAIL = if ($env:NPM_EMAIL) { $env:NPM_EMAIL } else { "admin@example.com" }
$NPM_PASSWORD = if ($env:NPM_PASSWORD) { $env:NPM_PASSWORD } else { "changeme" }

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  Автоматическое переключение NPM                         ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

# Авторизация
Write-Host "Авторизация в NPM..." -ForegroundColor Yellow

$authBody = @{
    identity = $NPM_EMAIL
    secret = $NPM_PASSWORD
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "$NPM_HOST/api/tokens" `
        -Method Post `
        -ContentType "application/json" `
        -Body $authBody
    
    $token = $authResponse.token
    
    if (-not $token) {
        Write-Host "✗ Ошибка авторизации в NPM" -ForegroundColor Red
        Write-Host "Проверьте переменные NPM_EMAIL и NPM_PASSWORD" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✓ Авторизация успешна" -ForegroundColor Green
} catch {
    Write-Host "✗ Ошибка подключения к NPM: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Получаем список proxy hosts
Write-Host "Поиск proxy hosts..." -ForegroundColor Yellow

$headers = @{
    Authorization = "Bearer $token"
}

try {
    $proxyHosts = Invoke-RestMethod -Uri "$NPM_HOST/api/nginx/proxy-hosts" `
        -Method Get `
        -Headers $headers
    
    # Ищем нужные hosts
    $backendHost = $null
    $frontendHost = $null
    
    foreach ($host in $proxyHosts) {
        $domain = $host.domain_names[0]
        
        if ($domain -like "*crm.archeo.kz*") {
            # Проверяем locations для определения backend/frontend
            if ($host.locations) {
                $hasApiLocation = $host.locations | Where-Object { $_.path -eq "/api" }
                if ($hasApiLocation) {
                    $backendHost = $host
                    Write-Host "Найден Backend API: $domain (ID: $($host.id))" -ForegroundColor Green
                } else {
                    $frontendHost = $host
                    Write-Host "Найден Frontend: $domain (ID: $($host.id))" -ForegroundColor Green
                }
            } else {
                # Если нет locations, считаем что это frontend
                $frontendHost = $host
                Write-Host "Найден Frontend: $domain (ID: $($host.id))" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
    
    # Обновляем порты
    $success = $true
    
    if ($backendHost) {
        Write-Host "Обновление Backend API → порт $BackendPort..." -ForegroundColor Yellow
        
        $backendHost.forward_port = $BackendPort
        $updateBody = $backendHost | ConvertTo-Json -Depth 10
        
        try {
            $result = Invoke-RestMethod -Uri "$NPM_HOST/api/nginx/proxy-hosts/$($backendHost.id)" `
                -Method Put `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $updateBody
            
            Write-Host "✓ Backend API обновлен на порт $BackendPort" -ForegroundColor Green
        } catch {
            Write-Host "✗ Ошибка обновления Backend API: $_" -ForegroundColor Red
            $success = $false
        }
    } else {
        Write-Host "⚠ Backend proxy host не найден" -ForegroundColor Yellow
    }
    
    if ($frontendHost) {
        Write-Host "Обновление Frontend → порт $FrontendPort..." -ForegroundColor Yellow
        
        $frontendHost.forward_port = $FrontendPort
        $updateBody = $frontendHost | ConvertTo-Json -Depth 10
        
        try {
            $result = Invoke-RestMethod -Uri "$NPM_HOST/api/nginx/proxy-hosts/$($frontendHost.id)" `
                -Method Put `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $updateBody
            
            Write-Host "✓ Frontend обновлен на порт $FrontendPort" -ForegroundColor Green
        } catch {
            Write-Host "✗ Ошибка обновления Frontend: $_" -ForegroundColor Red
            $success = $false
        }
    } else {
        Write-Host "⚠ Frontend proxy host не найден" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    if ($success) {
        Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║  ✓ Переключение завершено успешно!                       ║" -ForegroundColor Green
        Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Red
        Write-Host "║  ✗ Ошибка при переключении                               ║" -ForegroundColor Red
        Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "✗ Ошибка получения proxy hosts: $_" -ForegroundColor Red
    exit 1
}
