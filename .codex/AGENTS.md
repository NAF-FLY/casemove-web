# AGENTS.md — правила для AI-ассистента Casemove Web

Ты — AI-ассистент проекта **Casemove Web**.

Твоя задача — помогать писать код и документацию **строго в рамках принятой архитектуры**, не меняя стек и не изобретая новые решения, если от тебя этого явно не попросили.

---

## 1️⃣ Что это за проект

Веб-версия тулзы для управления инвентарём CS2 / Steam Storage Units (аналог Casemove), где:

- UI работает в браузере
- Вся работа со Steam выполняется **только на backend**
- MVP использует **один Steam-аккаунт** (из ENV)
- В будущем — мультиюзерный сервис с безопасным хранением кредов, rate limit, историей операций

---

## 2️⃣ Технологии (фиксированные, менять нельзя без прямого запроса)

**Frontend**
- Next.js (App Router), TypeScript
- Zustand — глобальное состояние
- shadcn/ui + Tailwind CSS — UI слой
- WebSocket-клиент для событий (`bulkMoveProgress`, `bulkMoveDone`, `inventoryUpdated`, `storageUpdated`)
- DTO и типы — **только из `packages/shared-types`**

**Backend**
- Node.js + TypeScript
- Fastify (HTTP + WebSocket)
- `steam-user` + `globaloffensive`
- SteamManager — управляет клиентами Stea
- SteamClient — обёртка над steam-user/globaloffensive
- bulk-queue — фоновые async-задачи

---

## 3️⃣ Структура репозитория (обязательная)

```
root/
  apps/
    web/         # Next.js UI
    api/         # Fastify backend
  packages/
    shared-types/   # DTO, типы
    shared-utils/   # утилиты

  docs/             # документация (читать при необходимости)
  .codex/           # файлы для AI (включая этот AGENTS.md)
```

Создавая новый код — всегда клади его в правильный модуль.

---

## 4️⃣ Где искать документацию

Документация хранится в папке `docs/`:

| Название | Путь |
|----------|------|
| Архитектура (общая) | `docs/ARCHITECTURE.md` |
| Backend | `docs/BACKEND.md` |
| Frontend | `docs/FRONTEND.md` |
| OpenAPI (контракт API) | `docs/OPENAPI.md` |
| DTO и события | `docs/DTOS.md` |
| Безопасность / мультиюзер | `docs/SECURITY.md` |

🧠 **ИИ должен ссылаться на эти файлы, но не менять архитектуру самостоятельно.**

---

## 5️⃣ Контракты (API, DTO, WS) — обязательны к соблюдению

### REST API

Любой код API должен соответствовать OpenAPI:

```
docs/OPENAPI.md
```

Ключевые эндпоинты MVP:

- GET /health
- GET /inventory
- GET /storage
- GET /storage/{id}
- POST /bulk-move
- GET /bulk-move/{taskId}

При расширении API — **ты обязан предложить обновить OpenAPI**.

---

## 6️⃣ DTO и события

TS-типизация обязательна. Типы должны использоваться **только** из:

```
packages/shared-types
docs/DTOS.md   ← контракт, запрещено придумывать новые поля без согласования
```

---

## 7️⃣ Правила разработки кода

1️⃣ Не меняй стек (Next.js, Zustand, shadcn, Fastify, SteamManager).  
2️⃣ Соблюдай слои:
```
Frontend:  components → features → store(zustand) → api-client → backend
Backend:   routes → service → core (SteamManager/SteamClient) → внешние библиотеки
```
3️⃣ Нельзя обращаться к Steam напрямую — всё только через SteamManager → SteamClient.  
4️⃣ Bulk-операции — всегда async, выполняются внутри очереди.  
5️⃣ WebSocket-шина — только по taskId, не широковещательно.

---

## 8️⃣ Безопасность

- Steam креды **не логируются**, **не возвращаются на фронт**
- ENV используется только через config loader
- В будущем при мультиюзере — креды **шифруются и хранятся только на backend**

---

## 9️⃣ Формат промпта к тебе

Разработчик должен писать:

```
Ты — AI-ассистент проекта Casemove Web.
Используй .codex/AGENTS.md как правила.
Архитектура — docs/ARCHITECTURE.md
Backend — docs/BACKEND.md
Frontend — docs/FRONTEND.md
API — docs/OPENAPI.md
DTO — docs/DTOS.md
Правила соблюдения безопасности - docs/SECURITY.md

Задача: ...
```

---

## 🔚 Резюме

> **Если проекта ещё нет — ты создаёшь его строго по этой архитектуре.  
> Если проект уже существует — ты продолжаешь развитие в этих рамках.**

