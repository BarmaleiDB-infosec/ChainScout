1. Я хочу чтобы ты убрал одную юрл строку, так как их 2. Оставь вищзуал верхней строки и объедени с категориями, упрости интерфейс

2. Проблема с регистрацией не ушла

3. Нет интеграции с гитхаб, почему у меня не обновляются там данные, а также проверь наличие интеграции с супабейс#!/bin/bash
# Setup script for Chain Scout Web project
# Этот скрипт установит все зависимости и запустит проект в режиме разработки

echo "╔═════════════════════════════════════════════════════╗"
echo "║   Chain Scout Web - Setup & Start Script            ║"
echo "╚═════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${BLUE}📝 Проверка Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен! Пожалуйста, установите Node.js с https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js найден: $(node -v)${NC}"

# Check if npm is installed
echo -e "${BLUE}📝 Проверка npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm не установлен!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm найден: $(npm -v)${NC}"
echo ""

# Install frontend dependencies
echo -e "${BLUE}📦 Установка фронтенд-зависимостей...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Фронтенд-зависимости установлены${NC}"
else
    echo -e "${YELLOW}⚠️  Некоторые ошибки при установке (может быть сетевая проблема)${NC}"
fi
echo ""

# Install backend dependencies
echo -e "${BLUE}📦 Установка бэкенд-зависимостей...${NC}"
cd server
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Бэкенд-зависимости установлены${NC}"
else
    echo -e "${YELLOW}⚠️  Некоторые ошибки при установке (может быть сетевая проблема)${NC}"
fi
cd ..
echo ""

# Check .env files
echo -e "${BLUE}📋 Проверка файлов окружения...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env файл не найден, копирую из примера...${NC}"
    cp .env.example .env
fi
echo -e "${GREEN}✅ .env файл готов${NC}"

if [ ! -f server/.env ]; then
    echo -e "${YELLOW}⚠️  server/.env файл не найден, копирую из примера...${NC}"
    cp server/.env.example server/.env
fi
echo -e "${GREEN}✅ server/.env файл готов${NC}"
echo ""

# Display next steps
echo -e "${GREEN}╔═════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Установка завершена!                           ║${NC}"
echo -e "${GREEN}╚═════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🚀 Для запуска проекта выполните в разных терминалах:${NC}"
echo ""
echo -e "${YELLOW}Терминал 1 - Фронтенд:${NC}"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
echo -e "${YELLOW}Терминал 2 - Бэкенд:${NC}"
echo -e "  ${BLUE}cd server${NC}"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
echo -e "${GREEN}Фронтенд откроется на: ${BLUE}http://localhost:5173${NC}"
echo -e "${GREEN}Бэкенд запустится на: ${BLUE}http://localhost:4000${NC}"
echo ""
echo -e "${YELLOW}📧 После регистрации проверьте почту на письмо от Supabase!${NC}"
echo -e "${YELLOW}💡 Не забудьте проверить папку спама!${NC}"
echo ""
