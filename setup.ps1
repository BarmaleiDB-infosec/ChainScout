# Setup script for Chain Scout Web project (Windows)
# Этот скрипт установит все зависимости и запустит проект в режиме разработки

Write-Host "╔═════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Chain Scout Web - Setup & Start Script (Windows)  ║" -ForegroundColor Green
Write-Host "╚═════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
Write-Host "📝 Проверка Node.js..." -ForegroundColor Blue
$nodeCheck = node -v 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js не установлен! Пожалуйста, установите Node.js с https://nodejs.org" -ForegroundColor Red
    Exit 1
}
Write-Host "✅ Node.js найден: $nodeCheck" -ForegroundColor Green

# Check if npm is installed
Write-Host "📝 Проверка npm..." -ForegroundColor Blue
$npmCheck = npm -v 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm не установлен!" -ForegroundColor Red
    Exit 1
}
Write-Host "✅ npm найден: $npmCheck" -ForegroundColor Green
Write-Host ""

# Install frontend dependencies
Write-Host "📦 Установка фронтенд-зависимостей..." -ForegroundColor Blue
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Фронтенд-зависимости установлены" -ForegroundColor Green
} else {
    Write-Host "⚠️  Некоторые ошибки при установке (может быть сетевая проблема)" -ForegroundColor Yellow
}
Write-Host ""

# Install backend dependencies
Write-Host "📦 Установка бэкенд-зависимостей..." -ForegroundColor Blue
Push-Location server
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Бэкенд-зависимости установлены" -ForegroundColor Green
} else {
    Write-Host "⚠️  Некоторые ошибки при установке (может быть сетевая проблема)" -ForegroundColor Yellow
}
Pop-Location
Write-Host ""

# Check .env files
Write-Host "📋 Проверка файлов окружения..." -ForegroundColor Blue
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env файл не найден, копирую из примера..." -ForegroundColor Yellow
    Copy-Item .env.example .env -ErrorAction SilentlyContinue
}
Write-Host "✅ .env файл готов" -ForegroundColor Green

if (-not (Test-Path server\.env)) {
    Write-Host "⚠️  server\.env файл не найден, копирую из примера..." -ForegroundColor Yellow
    Copy-Item server\.env.example server\.env -ErrorAction SilentlyContinue
}
Write-Host "✅ server\.env файл готов" -ForegroundColor Green
Write-Host ""

# Display next steps
Write-Host "╔═════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Установка завершена!                           ║" -ForegroundColor Green
Write-Host "╚═════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Для запуска проекта выполните в разных PowerShell/CMD окнах:" -ForegroundColor Blue
Write-Host ""

Write-Host "💻 Окно 1 - Фронтенд:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "💻 Окно 2 - Бэкенд:" -ForegroundColor Yellow
Write-Host "  cd server" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "📍 Откройте в браузере: " -ForegroundColor Green
Write-Host "  Фронтенд: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Бэкенд: http://localhost:4000" -ForegroundColor Cyan
Write-Host ""

Write-Host "📧 ВАЖНО: После регистрации проверьте:" -ForegroundColor Yellow
Write-Host "  ✓ Входящие письма на email" -ForegroundColor Cyan
Write-Host "  ✓ Папку спама (Junk/Spam)" -ForegroundColor Cyan
Write-Host "  ✓ Письмо от Supabase с ссылкой подтверждения" -ForegroundColor Cyan
Write-Host ""
