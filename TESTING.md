# ChainScout: Тестирование и валидация

## 🧪 Чек-лист функциональности

Используйте этот файл для проверки того, что все компоненты работают корректно.

---

## Часть 1: Frontend (React)

### 1.1 Запуск и загрузка

```bash
cd e:\chain-scout-web
npm install

```

**✅ Ожидается:**
- Приложение загружается на http://localhost:5173
- Видна главная страница с логотипом ChainScout (без мигания)
- Кнопки "Войти" и "Начать" видны в шапке

**🔍 Проверка:**
- Откройте DevTools (F12) → Console → нет ошибок (только warnings допусти)

---

### 1.2 Навигация

**🔍 Действия:**

1. Нажмите **"О нас"** (если есть ссылка в меню):
   - ✅ Должны увидеть раздел "About Us" с описанием
   - ✅ Должны увидеть раздел "Our Mission"

2. Нажмите **"Войти"** → откроется страница Auth.tsx:
   - ✅ Видны вкладки "Sign In" и "Sign Up"
   - ✅ Видны кнопки **GitHub** и **Google**
   - ✅ Логотип на странице Auth статичный (без анимации)

3. Нажмите **"Начать"** (на главной):
   - ✅ Перенаправляет на страницу Auth (так как вы не вошли)

---

### 1.3 OAuth аутентификация

**⚠️ Требуется:** Предварительная настройка в Supabase Dashboard (см. SETUP.md)

**🔍 Действия:**

1. На странице Auth нажмите кнопку **GitHub**:
   - ✅ Открывается окно авторизации GitHub (или редирект)
   - ✅ После授权 вы возвращаетесь на сайт
   - ✅ В хэдере видно ваше имя/email вместо кнопок входа

2. На странице Auth нажмите кнопку **Google**:
   - ✅ Открывается окно авторизации Google
   - ✅ После授权 вы возвращаетесь на сайт

**Проверка:** 
```javascript
// В консоли браузера (DevTools > Console):
localStorage.getItem('sb-access-token')  // должно существовать
```

---

### 1.4 Главная страница (Index.tsx)

**🔍 Действия (после входа):**

1. Откройте http://localhost:5173
2. Вы видите:
   - ✅ Hero секция с кнопкой "Start Analysis"
   - ✅ Раздел "About Us" (с информацией о платформе)
   - ✅ Раздел "Our Mission" (с миссией)
   - ✅ Footer с ссылками

3. В поле ввода введите URL и нажмите "Start Analysis":
   - ✅ Появляется сообщение "Анализ запущен"
   - ✅ После некоторого ожидания перенаправляет на Dashboard

---

### 1.5 Dashboard

**🔍 Действия:**

1. На Dashboard видны блоки:
   - ✅ "Total Scans" (счётчик сканирований)
   - ✅ "Vulnerabilities Found" (счётчик уязвимостей)
   - ✅ "Projects Analyzed" (счётчик проектов)

2. История сканирований отображается (если есть):
   - ✅ Таблица с колонками: URL, тип, дата, статус

---

## Часть 2: Backend (Express.js)

### 2.1 Запуск сервера

```bash
cd e:\chain-scout-web\server
npm install
npm run start
```

**✅ Ожидается:**
```
ChainScout server listening on 4000
```

---

### 2.2 Health Check

**🔍 Команда:**
```bash
curl http://localhost:4000/health
```

**✅ Ожидаемый ответ:**
```json
{"status":"ok"}
```

---

### 2.3 Анализ (без MSSQL)

**🔍 Команда:**
```bash
curl -X POST http://localhost:4000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "smart-contract",
    "targetUrl": "0x742d35Cc6634C0532925a3b8d36f97F2144Ea4C5",
    "level": "standard"
  }'
```

**✅ Ожидаемый ответ:**
```json
{
  "ok": true,
  "analysis": {
    "id": "ANL-1732686000000",
    "targetType": "smart-contract",
    "targetUrl": "0x742d35Cc6634C0532925a3b8d36f97F2144Ea4C5",
    "level": "standard",
    "vulnerabilities": 7,
    "severity": "High",
    "aiSummary": "This is a simulated AI summary..."
  }
}
```

---

## Часть 3: MSSQL подключение

### 3.1 Подготовка

**🔍 Создайте БД в SQL Server Management Studio (SSMS):**

```sql
-- Подключитесь к localhost\SQLEXPRESS
-- Выполните:
CREATE DATABASE chain_scout_db;
GO
```

---

### 3.2 Конфигурация сервера

**Создайте `server/.env`:**
```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=chain_scout_db
DB_USER=sa
DB_PASSWORD=YourPassword123
TRUST_SERVER_CERT=true
PORT=4000
```

**Перезапустите сервер:**
```bash
cd server
npm run start
```

---

### 3.3 Проверка подключения БД

**🔍 Команда:**
```bash
curl http://localhost:4000/api/db-test
```

**✅ Ожидаемый ответ:**
```json
{
  "ok": true,
  "result": [{"test": 1}]
}
```

**❌ Если ошибка:**
- Убедитесь, что SQL Server запущен
- Проверьте учётные данные в `.env`
- Попробуйте подключиться через SSMS перед запуском сервера

---

## Часть 4: Интеграция Frontend ↔ Backend

### 4.1 Проверка API вызовов

**В консоли браузера (DevTools > Network):**

1. Откройте http://localhost:5173 (должен быть запущен frontend)
2. Откройте DevTools → вкладка "Network"
3. Введите URL в поле на главной странице
4. Нажмите "Start Analysis"

**✅ Ожидается:**
- В Network видна запрос `POST http://localhost:4000/api/analyze`
- Статус: 200 OK
- Response: объект с анализом

**❌ Если CORS ошибка:**
```
Access to XMLHttpRequest at 'http://localhost:4000/api/analyze' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Решение:**
- Убедитесь, что в `server/index.js` строка `app.use(cors());` присутствует
- Перезапустите сервер

---

### 4.2 End-to-End тест

**🔍 Полный workflow:**

1. **Фронтенд запущен:** http://localhost:5173 ✅
2. **Бэкенд запущен:** http://localhost:4000/health → `{"status":"ok"}` ✅
3. **Вошли через OAuth:** видно имя пользователя ✅
4. **Запустили анализ:** 
   - Введите URL (например, `https://github.com/ethereum/go-ethereum`)
   - Нажмите "Start Analysis"
   - ✅ Перенаправляет на Dashboard
   - ✅ Dashboard показывает результаты

---

## Часть 5: Типизация и типы ошибок

### 5.1 Проверка критических ошибок

**🔍 Команда:**
```bash
npm run lint
```

**✅ Ожидается:**
- Ошибок (errors): 0 или только в UI компонентах (не критично)
- Warnings: допускаются (fast-refresh, empty types и т.д.)
- **Важно:** Нет `Unexpected any` в src/pages, src/lib, src/components

**Пример приемлемого вывода:**
```
✖ 14 problems (0 errors, 14 warnings)
```

---

### 5.2 Проверка типов

**🔍 Команда (если настроен):**
```bash
npx tsc --noEmit
```

**✅ Ожидается:** Нет критических ошибок типов

---

## Часть 6: Production Build

### 6.1 Сборка фронтенда

**🔍 Команда:**
```bash
npm run build
```

**✅ Ожидается:**
```
✓ built in 8.26s
```

**Проверка размера бандла:**
```
dist/assets/index-*.js           569.66 kB │ gzip: 171.37 kB
```

---

### 6.2 Preview production build

**🔍 Команды:**
```bash
npm run build
npm run preview
```

**✅ Ожидается:**
- Приложение загружается на новом хосте (обычно http://localhost:4173)
- Функциональность та же, что и в dev mode

---

## Часть 7: Переменные окружения

### 7.1 Проверка конфигурации

**Frontend (`.env`):**
```bash
cat .env
# или в Windows PowerShell:
Get-Content .env
```

**✅ Должны быть:**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_API_URL=http://localhost:4000
```

**Backend (`server/.env`):**
```bash
cd server
Get-Content .env
```

**✅ Должны быть:**
```
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=chain_scout_db
DB_USER=...
DB_PASSWORD=...
PORT=4000
```

---

## Таблица тестирования

| # | Компонент | Тест | Статус | Примечания |
|---|-----------|------|--------|-----------|
| 1 | Frontend | npm run dev | ✅ | Должен запуститься без ошибок |
| 2 | Backend | npm run start | ✅ | Должен запуститься на порту 4000 |
| 3 | Health Check | curl health | ✅ | Ответ: {"status":"ok"} |
| 4 | Logo | Нет мигания | ✅ | Эмблема статична |
| 5 | OAuth GitHub | Кнопка GitHub | ✅ | Требует конфигурации Supabase |
| 6 | OAuth Google | Кнопка Google | ✅ | Требует конфигурации Supabase |
| 7 | О нас | About Us блок | ✅ | Видим на главной |
| 8 | Наша миссия | Mission блок | ✅ | Видим на главной |
| 9 | Анализ | /api/analyze | ✅ | Возвращает результаты |
| 10 | MSSQL | /api/db-test | ✅ | Требует MSSQL setup |
| 11 | Типы | npm run lint | ✅ | Нет critical errors |
| 12 | Сборка | npm run build | ✅ | Production готов |

---

## Рекомендации по устранению предупреждений редактора (Tailwind / CSS)

Если вы видите в VSCode предупреждения типа "Unknown at rule @tailwind" или "Unknown at rule @apply":

1. Установите расширение "Tailwind CSS IntelliSense" — оно распознаёт директивы Tailwind и часто убирает такие сообщения.
2. Убедитесь, что VSCode использует файлы конфигурации проекта: откройте `settings.json` и добавьте (глобально или в папку .vscode):

```json
{
   "tailwindCSS.includeLanguages": {
      "javascript": "javascript",
      "typescript": "typescript",
      "typescriptreact": "typescriptreact",
      "html": "html",
      "css": "css"
   },
   "css.validate": true
}
```

3. В некоторых случаях встроенный CSS language server всё ещё ругается; тогда можно отключить его проверку и полагаться на Tailwind IntelliSense:

```json
{
   "css.validate": false,
   "less.validate": false,
   "scss.validate": false
}
```

4. (Опционально) Перенесите директивы Tailwind (`@tailwind base; @tailwind components; @tailwind utilities;`) в отдельный файл `src/styles/tailwind.css` и импортируйте его из `main.tsx` — это часто помогает конфигурации плагинов.

Если хотите, я могу автоматически создать `src/styles/tailwind.css`, переместить директивы туда и обновить `main.tsx` — скажите, нужно ли это сделать.

## 🚨 Типичные ошибки и решения

### Ошибка: "Cannot find module 'express'"
```bash
cd server
npm install
```

### Ошибка: "CORS error"
Убедитесь, что в `server/index.js`:
```javascript
const cors = require('cors');
app.use(cors());
```

### Ошибка: "Cannot connect to database"
1. SQL Server запущен?
2. Правильные credentials в `.env`?
3. Протестировать в SSMS?

### Ошибка: "OAuth redirect mismatch"
Проверьте Redirect URLs в Supabase Dashboard → Auth → URL Configuration

### Ошибка: "localhost:5173 is not responding"
```bash
cd e:\chain-scout-web
npm run dev
# Если вторая попытка, очистите кэш:
rm -r node_modules
npm install
npm run dev
```

---

## ✅ Финальный чек-лист

Перед production deployment:

- [ ] Frontend собирается без ошибок (`npm run build` ✅)
- [ ] Backend запускается (`npm run start` ✅)
- [ ] Health check проходит (`curl health` ✅)
- [ ] OAuth провайдеры настроены в Supabase
- [ ] MSSQL подключение работает (если используется)
- [ ] Нет критических lint errors (`npm run lint` ✅)
- [ ] Все routes доступны (Auth, Dashboard, Index)
- [ ] Анализ запускается и возвращает результаты
- [ ] Логотип не мигает
- [ ] Блоки "О нас" и "Наша миссия" видны

---

## 📝 Логирование и debug

### Frontend debug
```javascript
// В консоли браузера
localStorage.getItem('sb-access-token')  // проверить токен
JSON.parse(localStorage.getItem('sb-access-token'))  // распарсить
```

### Backend debug
```javascript
// В server/index.js добавьте:
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

### Network debug
DevTools → Network tab → фильтр по `analyze` → смотрить Request/Response

---

**Успешного тестирования! 🚀**
