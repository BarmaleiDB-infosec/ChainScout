# ChainScout — Полная инструкция по настройке

## Быстрый старт

### 1. Установка зависимостей

#### Frontend
```bash
cd e:\chain-scout-web
npm install
npm run dev
# Откроется на http://localhost:5173
```

#### Backend
```bash
cd e:\chain-scout-web\server
npm install
npm run start
# Сервер запустится на http://localhost:4000
```

---

## Настройка OAuth (GitHub & Google)

ChainScout использует **Supabase** для аутентификации через GitHub и Google.

### Шаг 1: Включить провайдеры в Supabase Dashboard

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в проект **chain-scout-web** (или ваш проект)
3. Слева выберите **Authentication** → **Providers**
4. Найдите **GitHub** и **Google**, нажмите **Enable**

### Шаг 2: Настроить GitHub OAuth

1. Если у вас ещё нет приложения на GitHub:
   - Откройте https://github.com/settings/developers
   - Нажмите **New OAuth App**
   - Заполните:
     - **Application name:** ChainScout
     - **Homepage URL:** `http://localhost:5173` (для разработки) или ваш домен
     - **Authorization callback URL:** `https://rrcbgqledrotnnvpjtnk.supabase.co/auth/v1/callback` (замените на ваш Supabase URL)

2. Скопируйте **Client ID** и **Client Secret** из GitHub
3. В Supabase Dashboard → Auth → Providers → GitHub:
   - Вставьте **Client ID** и **Client Secret**
   - Нажмите **Save**

### Шаг 3: Настроить Google OAuth

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект (или используйте существующий)
3. Включите Google+ API
4. Перейдите в **Credentials** → **Create OAuth 2.0 Client IDs**
   - Выберите **Web application**
   - Добавьте **Authorized redirect URIs:**
     - `http://localhost:5173/auth` (для разработки)
     - `https://rrcbgqledrotnnvpjtnk.supabase.co/auth/v1/callback` (Supabase callback)

5. Скопируйте **Client ID** и **Client Secret**
6. В Supabase Dashboard → Auth → Providers → Google:
   - Вставьте **Client ID** и **Client Secret**
   - Нажмите **Save**

### Шаг 4: Добавить Redirect URLs в Supabase

1. Supabase Dashboard → Authentication → URL Configuration
2. В разделе **Redirect URLs** добавьте:
   - `http://localhost:5173/` (разработка)
   - `http://localhost:5173/auth` (разработка)
   - Ваш production домен

---

## Настройка MSSQL (MS SQL Server)

ChainScout backend поддерживает подключение к MSSQL.

### Вариант 1: SQL Server Authentication (рекомендуется для Windows)

1. Создайте `.env` в папке `server/`:
```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=chain_scout_db
DB_USER=your_username
DB_PASSWORD=your_password
TRUST_SERVER_CERT=true
PORT=4000
```

2. Создайте БД в SQL Server Management Studio (SSMS):
```sql
CREATE DATABASE chain_scout_db;
GO
```

3. Запустите сервер:
```bash
cd server
npm run start
```

4. Проверьте подключение:
```bash
curl http://localhost:4000/api/db-test
```

Ожидаемый ответ: `{"ok":true,"result":[{"test":1}]}`

### Вариант 2: Windows Authentication (без пароля)

Для использования Windows Authentication вам потребуется установить `msnodesqlv8` драйвер (работает только на Windows с SQL Server Express):

```bash
npm install msnodesqlv8
```

Затем в коде server/index.js нужно переключиться на использование Windows auth (требуется дополнительная конфигурация; см. документацию msnodesqlv8).

---

## Настройка OpenAI (опционально)

Для включения AI-отчётов с использованием OpenAI:

1. Получите API ключ на https://platform.openai.com/api-keys
2. Добавьте в `.env` сервера:
```env
OPENAI_API_KEY=sk-...your-key-here...
```

3. Сервер автоматически будет вызывать OpenAI API при наличии ключа

---

## Тестирование API

### Проверить здоровье сервера
```bash
curl http://localhost:4000/health
# Ответ: {"status":"ok"}
```

### Проверить подключение БД
```bash
curl http://localhost:4000/api/db-test
# Ответ: {"ok":true,"result":[...]}
```

### Запустить анализ
```bash
curl -X POST http://localhost:4000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "smart-contract",
    "targetUrl": "0x742d35Cc6634C0532925a3b8d36f97F2144Ea4C5",
    "level": "standard"
  }'
```

---

## Переменные окружения

### Frontend (`.env` в корне проекта)

```env
VITE_SUPABASE_URL=https://rrcbgqledrotnnvpjtnk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:4000
```

### Backend (`server/.env`)

```env
# MSSQL
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=chain_scout_db
DB_USER=your_username
DB_PASSWORD=your_password
TRUST_SERVER_CERT=true

# Сервер
PORT=4000

# OpenAI (опционально)
OPENAI_API_KEY=sk-...
```

---

## Структура проекта

```
chain-scout-web/
├── src/                      # Frontend (React + TypeScript)
│   ├── pages/               # Страницы (Auth, Dashboard, Index)
│   ├── components/          # Компоненты (Header, Hero, MainContent, etc.)
│   └── integrations/        # Supabase клиент
├── server/                   # Backend (Express)
│   ├── index.js            # Основной сервер
│   ├── analyzer.js         # Модуль анализа
│   ├── package.json        # Зависимости бэкенда
│   └── .env.example        # Пример конфигурации
└── supabase/               # Миграции и функции Supabase
```

---

## Полезные ссылки

- [Supabase Dashboard](https://app.supabase.com)
- [GitHub OAuth Settings](https://github.com/settings/developers)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [MSSQL Documentation](https://learn.microsoft.com/en-us/sql/)

---

## Решение проблем

### "Cannot find module 'mssql'"
```bash
cd server && npm install mssql
```

### "Unexpected token 'export' in package.json"
Убедитесь, что используете Node.js версии 14+:
```bash
node --version
```

### "CORS error при запросе на backend"
Убедитесь, что backend запущен на http://localhost:4000 и фронтенд может к нему подключиться.

### Ошибка подключения MSSQL
- Проверьте, что SQL Server запущен
- Убедитесь, что значения в `.env` корректны
- Протестируйте подключение через SSMS перед запуском сервера

---

## Дополнительная информация

ChainScout — платформа для анализа безопасности Web2 и Web3 проектов:
- 🔒 Поддерживает анализ смарт-контрактов, репозиториев и веб-приложений
- 🤖 Использует ИИ для генерации подробных отчётов
- 🔐 Аутентификация через GitHub/Google + Supabase
- 📊 Хранение результатов в MSSQL

Для вопросов и пожеланий обратитесь к команде разработки.
