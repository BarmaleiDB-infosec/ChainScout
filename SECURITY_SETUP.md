# 🔐 SECURITY SETUP - Защита чувствительных данных

**Дата создания**: 16 апреля 2026  
**Статус**: ✅ Настроено безопасно

---

## ✅ Что защищено

### 🔒 Исключены из гита (.gitignore)

```
❌ .env                    - НЕ будет мигрировать
❌ .env.local              - НЕ будет мигрировать  
❌ server/.env             - НЕ будет мигрировать
❌ *.mdf, *.ldf            - БД файлы MSSQL не будут мигрировать
❌ server/uploads/         - Загруженные файлы не будут мигрировать
❌ server/data/            - Чувствительные данные не будут мигрировать
```

### ✅ Включены в гит (как примеры)

```
✅ .env.example            - Шаблон для фронтенда (БЕЗ реальных ключей)
✅ .env.local.example      - Шаблон локальных переменных (БЕЗ реальных ключей)
✅ server/.env.example     - Шаблон для бэкенда (с placeholder значениями)
```

---

## 📋 Как работать с переменными окружения

### Для нового разработчика

```bash
# 1. Клонирование проекта
git clone <repo>

# 2. Создание локального .env файла из примера
cp .env.example .env

# 3. Редактирование .env с реальными значениями
# Откройте .env в editor и запишите:
#   - VITE_SUPABASE_URL
#   - VITE_SUPABASE_PUBLISHABLE_KEY
#   - Все остальные переменные

# 4. Для бэкенда
cd server
cp .env.example .env
# Отредактируйте с реальными значениями базы данных
```

### ⚠️ ЧТО НЕ ДЕЛАТЬ

```bash
❌ НЕ коммитьте .env файл
   git add .env              # НЕПРАВИЛЬНО!

❌ НЕ коммитьте реальные ключи
   git add .env.example      # НЕПРАВИЛЬНО (если там реальные ключи)

❌ НЕ толкайте чувствительные данные в гит
   git push                  # ОПАСНО!
```

### ✅ ЧТО ДЕЛАЙТЕ

```bash
✅ Редактируйте только локальный .env
   nano .env                 # ПРАВИЛЬНО

✅ Коммитьте только примеры (без реальных данных)
   git add .env.example      # ПРАВИЛЬНО (только placeholder)

✅ Используйте .gitignore для защиты
   git add .gitignore        # ПРАВИЛЬНО
```

---

## 🔑 Структура переменных

### Frontend (.env)

```env
# 🔐 РЕАЛЬНЫЕ ЗНАЧЕНИЯ - не коммитьте!
VITE_SUPABASE_URL=https://wdrbhwyvvrvbiewujseq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_actual_publishable_key_here
VITE_API_URL=http://localhost:4000
VITE_ENV=development
```

### Frontend (.env.example)

```env
# 🔍 ТОЛЬКО ШАБЛОНЫ - безопасно коммитить!
VITE_SUPABASE_URL=https://your_project_id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
VITE_API_URL=http://localhost:4000
VITE_ENV=development
```

### Backend (server/.env)

```env
# 🔐 РЕАЛЬНЫЕ ЗНАЧЕНИЯ - не коммитьте!
DB_SERVER=localhost\\SQLEXPRESS
DB_NAME=chain_scout_db
DB_USER=sa
DB_PASSWORD=YourRealPassword123!
PORT=4000
```

### Backend (server/.env.example)

```env
# 🔍 ТОЛЬКО ШАБЛОНЫ - безопасно коммитить!
DB_SERVER=localhost\\SQLEXPRESS
DB_NAME=chain_scout_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
PORT=4000
```

---

## 📝 Проверка перед коммитом

### ✅ Безопасная проверка

```bash
# Посмотреть что будет добавлено
git status

# Проверить что .env не в списке
git diff --cached

# Если вы случайно добавили .env
git reset HEAD .env
rm -f .env
git checkout .env
```

### 🚨 Если вы случайно запушили ключи

```bash
# 1. Удалите из истории (СРОЧНО!)
git rm --cached .env
git commit -m "Remove .env with secrets"
git push

# 2. РЕГЕНЕРИРУЙТЕ ВСЕ КЛЮЧИ В SUPABASE!
#    Старые ключи больше не безопасны!

# 3. Обновите новые ключи в .env
vim .env
```

---

## 🛡️ Лучшие практики

### ✅ ДЕЛАЙТЕ

- [x] Используйте .env.example как шаблон
- [x] Коммитьте только placeholder значения
- [x] Используйте .gitignore для защиты
- [x] Регулярно проверяйте что .env не в гите
- [x] Используйте сильные пароли
- [x] Хранитесь в Supabase / Database провайдер

### ❌ НЕ ДЕЛАЙТЕ

- [ ] Не коммитьте .env файл
- [ ] Не писчите реальные ключи в примерах
- [ ] Не используйте простые пароли
- [ ] Не хранитесь ключи в комментариях
- [ ] Не делитесь ключами через chat/email
- [ ] Не оставляйте ключи в консоли

---

## 🔍 Проверка текущего состояния

```bash
# Посмотреть что в .gitignore
cat .gitignore

# Проверить что .env НЕ трекируется
git status

# Проверить историю (нет ли случайных ключей)
git log -p -- .env | head -20

# Список traked файлов (для проверки)
git ls-files | grep -E '(\.env|\.db|uploads)'
```

---

## 📋 Файлы в проекте

### Защищенные (не будут мигрировать)

```
✅ .env                              ← Реальные ключи фронтенда
✅ server/.env                       ← Реальные ключи бэкенда  
✅ server/uploads/                  ← Загруженные файлы
✅ server/data/                      ← БД файлы
✅ *.mdf, *.ldf, *.db                ← БД
```

### Безопасные (в гите как примеры)

```
✅ .env.example                      ← Шаблон фронтенда
✅ .env.local.example                ← Альтернативный шаблон
✅ server/.env.example               ← Шаблон бэкенда
✅ .gitignore                        ← Список защищенных файлов
```

---

## 🚀 Для production хостинга

### Переменные на хостинге

Установите эти переменные в админ-панели хостинга (например, Vercel, Netlify, Heroku):

```env
# Frontend production
VITE_SUPABASE_URL=https://rrcbgqledrotnnvpjtnk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_production_key
VITE_API_URL=https://api.yourdomain.com
VITE_ENV=production

# Backend production
DB_SERVER=your_production_sql_server
DB_NAME=chain_scout_db_prod
DB_USER=your_prod_user
DB_PASSWORD=your_prod_password
PORT=4000
NODE_ENV=production
```

### ✅ НИКОГДА не указывайте в исходнике!

```bash
❌ НЕПРАВИЛЬНО - закодировано в гите
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

✅ ПРАВИЛЬНО - через переменные окружения хостинга
VITE_SUPABASE_PUBLISHABLE_KEY=${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
```

---

## 📞 Если случилась утечка

1. **СРОЧНО**: Регенерируйте все ключи и пароли
2. **СРОЧНО**: Измените все пароли Supabase, БД, API
3. **НЕМЕДЛЕННО**: Удалите скомпрометированные ключи из гита
4. **СООБЩИТЕ**: Команде о потенциальной утечке
5. **АУДИТ**: Проверьте логи на неправомерный доступ

---

## ✅ Финальный чеклист

- [x] Загрузить .env в .gitignore
- [x] Загрузить .env.* в .gitignore
- [x] Загрузить server/.env в .gitignore
- [x] Загрузить БД файлы в .gitignore
- [x] Загрузить uploads/ в .gitignore
- [x] Создать .env.example с placeholder значениями
- [x] Создать server/.env.example с placeholder значениями
- [x] Проверить что реальные .env НЕ в гите
- [x] Проверить что .gitignore работает правильно

---

**Статус**: ✅ **ПОЛНОСТЬЮ ЗАЩИЩЕНО**

Ваш проект теперь безопасен от утечки чувствительных данных! 🎉

---

**Дата обновления**: 16 апреля 2026  
**Версия**: 1.0.0
