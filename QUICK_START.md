# ChainScout — Быстрый старт

## 🚀 За 5 минут в боевое состояние

### Требования
- Node.js 14+ (проверка: `node --version`)
- npm или yarn
- SQL Server Express (если используете MSSQL; опционально для разработки)

---

## Часть 1: Фронтенд (React + TypeScript)

```bash
# Перейти в корень проекта
cd e:\chain-scout-web

# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev
```

✅ Откроется на **http://localhost:5173**

Вы должны увидеть лэндинг ChainScout с кнопками "Войти" и "Начать".

---

## Часть 2: Бэкенд (Express.js + MSSQL)

### Вариант A: Без MSSQL (быстро)

Если MSSQL не установлен, сервер всё равно запустится и вернёт ошибку при `/api/db-test`, но `/api/analyze` будет работать:

```bash
# В отдельном терминале, перейти в папку сервера
cd e:\chain-scout-web\server

# Установить зависимости
npm install

# Запустить сервер
npm run start
```

✅ Откроется на **http://localhost:4000**

Проверка здоровья:
```bash
curl http://localhost:4000/health
# Ответ: {"status":"ok"}
```

### Вариант B: С MSSQL (полный функционал)

1. **Создайте БД в SSMS:**
   ```sql
   CREATE DATABASE chain_scout_db;
   GO
   ```

2. **Создайте `.env` в папке `server/`:**
   ```env
   DB_SERVER=localhost\SQLEXPRESS
   DB_NAME=chain_scout_db
   DB_USER=sa
   DB_PASSWORD=your_password
   TRUST_SERVER_CERT=true
   PORT=4000
   ```
   
   (Замените `sa` и пароль на ваши реальные учётные данные)

3. **Запустите сервер:**
   ```bash
   cd e:\chain-scout-web\server
   npm run start
   ```

4. **Проверьте подключение БД:**
   ```bash
   curl http://localhost:4000/api/db-test
   # Ответ: {"ok":true,"result":[{"test":1}]}
   ```

---

## Часть 3: Аутентификация (GitHub & Google)

### Автоматический способ (для разработки)

1. Откройте **http://localhost:5173/auth**
2. Нажмите **"GitHub"** или **"Google"**
3. Вас перенаправит на сайт GitHub/Google для входа

> ⚠️ Если вы впервые используете OAuth, Supabase спросит вас разрешение. Это нормально.

### Ручная настройка (для production)

См. подробно: **[SETUP.md](./SETUP.md)** → секция "Настройка OAuth"

Коротко:
1. [Supabase Dashboard](https://app.supabase.com) → Authentication → Providers
2. Включить GitHub (добавить Client ID & Secret)
3. Включить Google (добавить Client ID & Secret)
4. Добавить Redirect URLs: `http://localhost:5173/`, `http://localhost:5173/auth`

---

## Часть 4: Первый анализ

### На фронтенде:

1. Откройте **http://localhost:5173**
2. Нажмите **"Войти"** → выберите GitHub или Google
3. После входа вернётесь на главную
4. В поле ввода введите URL (например, `https://github.com/user/repo`)
5. Нажмите **"Запустить анализ"**

### Что происходит:

```
Фронтенд → /api/analyze → Бэкенд → Симуляция анализа → Ответ с результатами
```

Результаты отображаются на странице Dashboard.

---

## Проверка каждой части

| Компонент | URL/Команда | Ожидаемый результат |
|-----------|-----------|-------------------|
| Фронтенд | http://localhost:5173 | Лэндинг загружается |
| Бэкенд (health) | `curl http://localhost:4000/health` | `{"status":"ok"}` |
| БД (если MSSQL) | `curl http://localhost:4000/api/db-test` | `{"ok":true,...}` |
| Анализ | POST `/api/analyze` | `{"ok":true,"analysis":{...}}` |
| OAuth | Кнопка GitHub/Google | Редирект на GitHub/Google |

---

## Проблемы и решения

### Фронтенд не загружается
```bash
# Убедитесь, что dev-сервер запущен
npm run dev

# Очистите кэш браузера (Ctrl+Shift+Delete)
# Или откройте в приватном режиме (Ctrl+Shift+P)
```

### Бэкенд не подключается
```bash
# Проверьте, что сервер запущен на порту 4000
netstat -an | findstr :4000

# Если нужен другой порт, установите в .env
PORT=5000
```

### Ошибка CORS
Убедитесь, что в `server/index.js` включен CORS:
```javascript
const cors = require('cors');
app.use(cors());
```

### MSSQL не подключается
```bash
# 1. Убедитесь, что SQL Server запущен
# 2. Проверьте учётные данные в .env
# 3. Тестируйте подключение через SSMS перед бэкенд-сервером
```

### OAuth кнопки не работают
1. Убедитесь, что Supabase провайдеры включены
2. Проверьте Redirect URLs в Supabase Dashboard
3. Очистите localStorage в браузере (DevTools → Application → Clear)

---

## Быстрые команды

```bash
# Полный рестарт
cd e:\chain-scout-web
npm run dev                    # Терминал 1

cd e:\chain-scout-web\server
npm run start                  # Терминал 2

# Сборка для production
npm run build                  # из корня проекта
npm run build:dev             # mode development

# Проверка типов
npm run lint

# Проверить MSSQL
curl http://localhost:4000/api/db-test
```

---

## 📚 Дополнительно

- **Полная документация:** [SETUP.md](./SETUP.md)
- **Backend README:** [server/README.md](./server/README.md)
- **API тестирование:** Используйте Postman или `curl`

---

## ✅ Чек-лист готовности

- [ ] Node.js установлен (`node --version`)
- [ ] npm зависимости установлены (`npm install`)
- [ ] Фронтенд запущен (`npm run dev` в корне)
- [ ] Бэкенд запущен (`npm run start` в `server/`)
- [ ] Хелс-чек пройден (`curl http://localhost:4000/health`)
- [ ] Вошли через GitHub или Google
- [ ] Успешно запустили первый анализ

**Поздравляем! 🎉 ChainScout готов к использованию.**

---

## Следующие шаги

1. **Интеграция MSSQL** → Создайте БД и настройте подключение
2. **OpenAI интеграция** → Добавьте API ключ для AI-отчётов
3. **Deployment** → Разверните на production (Vercel, Heroku, VPS)
4. **Собственные анализаторы** → Подключите Slither, Foundry и т.д.
