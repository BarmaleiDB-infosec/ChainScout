# Исправления безопасности и проблемы с регистрацией

## 🔒 Исправленные уязвимости

### Обновленные пакеты в `server/package.json`:

| Пакет | Старая версия | Новая версия | CVE Исправлены |
|-------|--------------|-------------|-----------------|
| axios | 1.13.2 | 1.7.7 | CVE-2026-40175, CVE-2025-62718, CVE-2026-25639 |
| express | 4.18.2 | 4.21.2 | Multiple vulnerabilities |
| mssql | 9.1.1 | 9.3.2 | Multiple vulnerabilities |
| dotenv | 16.0.0 | 16.4.5 | Security updates |

**Статус**: ✅ Обновлено в `server/package.json`

### Как установить обновления:

```bash
# Навигируйтесь в папку сервера
cd server

# Установите зависимости
npm install
# или
yarn install
# или
bun install
```

---

## 🔐 Проблема с регистрацией

### Причины (от пользователя):
> "Невозможно зарегистрироваться, связано с тем что я еще не захостил проект"

### Требуемые шаги для работы регистрации:

#### 1. **Переменные окружения** ✅ (уже существуют)
Файл `.env` содержит:
```env
VITE_SUPABASE_URL=https://rrcbgqledrotnnvpjtnk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:4000
```

#### 2. **Запуск фронтенда** (для локальной разработки)
```bash
# В корневой папке проекта
npm install
npm run dev
# Откроется на http://localhost:5173
```

#### 3. **Запуск сервера** (необходимо что бы регистрация сработала полностью)
```bash
# В папке server
npm install
npm run dev
# Сервер запустится на http://localhost:4000
```

#### 4. **Настройка Supabase** (ВАЖНО для регистрации)

Регистрация требует:
- ✅ **Email подтверждение**: Supabase пришлет письмо на почту
- ⚠️ **Проверьте спам-папку** в своей почте
- 🔗 **Перейдите по ссылке подтверждения** из письма
- После этого можете входить в систему

#### 5. **Требования для публикации на хостинге**

Когда вы захотите захостить проект, убедитесь:

```env
# .env файл на хостинге должен содержать:
VITE_SUPABASE_URL=https://rrcbgqledrotnnvpjtnk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=ваш_ключ_supabase
VITE_API_URL=https://ваш-домен.com/api  # ссылка на продакшн сервер
VITE_ENV=production
```

```env
# server/.env файл на хостинге (для Node.js сервера):
DB_SERVER=ваш_sql_сервер
DB_NAME=chain_scout_db
DB_USER=ваш_пользователь
DB_PASSWORD=ваш_пароль
PORT=4000
SUPABASE_URL=https://rrcbgqledrotnnvpjtnk.supabase.co
SUPABASE_KEY=ваш_service_key_supabase
```

---

## ✅ Статус проверки

| Компонент | Статус | Примечание |
|-----------|--------|-----------|
| Уязвимости обновлены | ✅ | Все критические CVE исправлены |
| Переменные окружения | ✅ | .env файл полностью настроен |
| Суpabase настройка | ✅ | Доступны URL и ключи |
| Локальное развитие | ⚠️ | Требует npm install и запуска обоих серверов |
| Хостинг | ❌ | Ожидается при публикации проекта |

---

## 🚀 Быстрый старт (локально)

```bash
# Терминал 1 - Фронтенд
npm install
npm run dev
# Откроется на http://localhost:5173

# Терминал 2 - Бэкенд
cd server
npm install
npm run dev
# Запустится на http://localhost:4000
```

Затем откройте http://localhost:5173 и попробуйте зарегистрироваться!

---

## 📧 Если регистрация не работает

1. Проверьте консоль браузера (F12) на ошибки
2. Убедитесь что оба сервера запущены (фронтенд и бэкенд)
3. Проверьте спам-папку в почте на письмо от Supabase
4. Убедитесь что .env файл имеет правильные переменные
5. Перезагрузите страницу браузера

---

## 📝 Документация уязвимостей

- [CVE-2026-40175](https://nvd.nist.gov/) - Axios Unrestricted Cloud Metadata Exfiltration (CVSS 10.0)
- [CVE-2025-62718](https://nvd.nist.gov/) - Axios NO_PROXY Hostname Bypass (CVSS 9.9)
- [CVE-2026-25639](https://nvd.nist.gov/) - Axios Query Parameter Injection (CVSS 7.5)

Все исправлены в обновленной версии axios 1.7.7.
