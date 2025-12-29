# ROADMAP.md — План работ (атомарные задачи для ИИ)

Этот документ создан для пошаговой разработки Casemove Web.
Каждая задача уже сформулирована так, чтобы её можно было **копировать → вставлять в ИИ** и получать код без лишнего.

---

# 📌 Правило работы
- 1 задача = 1 файл / 1 действие / 1 PR / 1 git commit
- задачи выполняются в порядке сверху вниз
- если требуется изменить существующий код — задача должна быть отдельной

---

# 🚀 Этап 1 — Инфраструктура / Setup

## 1.1 — Корневые файлы

**Task R-1.1.1 — package.json**
```
Создай файл package.json в корне проекта.
Содержимое: pnpm workspace + name = "casemove-web-monorepo".
Добавь скрипты:
- "dev:web": "pnpm --filter web dev"
- "dev:api": "pnpm --filter api dev"
- "dev": "concurrently \"pnpm dev:api\" \"pnpm dev:web\""

Не создавай других файлов и не меняй ничего вне корня.
```

**Task R-1.1.2 — pnpm-workspace**
```
Создай файл pnpm-workspace.yaml в корне.
Содержимое:
packages:
  - "apps/*"
  - "packages/*"
```

**Task R-1.1.3 — tsconfig.base.json**
```
Создай файл tsconfig.base.json в корне (TypeScript strict mode + path aliases со @shared/* → packages/shared-types/src).
```

---

# 🧱 Этап 2 — Backend минимальный запуск

**Task R-2.1 — apps/api/src/index.ts**
```
Задача: создать файл apps/api/src/index.ts
Функция: поднять Fastify сервер, слушать PORT (из process.env или 4000)
Маршрут GET /health → return { status: "ok", steamStatus: "idle" }
Требования:
- никакой бизнес-логики
- только server.listen() и console.log()
```

**Task R-2.2 — config plugin**
```
Создай файл apps/api/src/plugins/config.ts
Экспортируй функцию registerConfig(app)
Делай: читать PORT из process.env, если нет → default = 4000
Верни объект { port }
Использование: в index.ts вызов registerConfig()
```

**Task R-2.3 — Backend dirs**
```
Создай папки, без файлов:
apps/api/src/core
apps/api/src/modules/health
apps/api/src/modules/inventory
apps/api/src/modules/storage
apps/api/src/modules/bulk
```

---

# 🎨 Этап 3 — Frontend минимальный запуск

**Task R-3.1 — Next.js skeleton**
```
Задача: создать Next.js skeleton в apps/web
Требования:
- app router включен
- /app/page.tsx → <h1>Casemove Web — MVP</h1>
- package.json внутри web должен иметь "dev": "next dev"
```

**Task R-3.2 — Tailwind**
```
Добавь в apps/web:
- tailwind.config.js
- postcss.config.js
- src/app/globals.css
используй базовый preset tailwind
```

**Task R-3.3 — shadcn init**
```
Добавь shadcn/ui baseline setup
Не добавляй компоненты — только init
```

**Task R-3.4 — Zustand session**
```
Создай файл apps/web/store/session.store.ts
Содержимое:
- состояние { steamStatus: "idle" }
- экшен setSteamStatus(newStatus)
```

---

# 📦 Этап 4 — Mock Inventory

**Task R-4.1 — DTO**
```
Создай файл packages/shared-types/src/inventory.ts
Экспортируй InventoryItemDTO как в docs/DTOS.md
```

```
Создай файл packages/shared-types/src/index.ts
Экспортируй всё из ./inventory
```

**Task R-4.2 — backend mocks**
```
Создай файл apps/api/src/modules/inventory/service.ts
Экспортируй функцию getInventoryMock(): возвращай массив 3 статичных предметов
```

```
Создай файл apps/api/src/modules/inventory/routes.ts
registerInventoryRoutes(app)
GET /inventory → return { items: getInventoryMock() }
```

```
Добавь в apps/api/src/index.ts регистрацию registerInventoryRoutes(app)
```

**Task R-4.3 — frontend fetch + store**
```
Создай файл apps/web/lib/api-client/inventory.ts
Функция fetchInventory(): GET /api/inventory → return JSON
```

```
Создай файл apps/web/store/inventory.store.ts
Состояние: items: []
Экшен load(): items = await fetchInventory()
```

```
Создай страницу apps/web/app/inventory/page.tsx
В ней: вызови load(), отрендери items в таблице
```

---

# 📡 Этап 5 — Bulk (моки)

**Task R-5.1 — bulk queue**
```
Создай файл apps/api/src/core/bulk-queue.ts
Храни: Map<string, taskState>
Метод createTask(request) → uuid
Метод getTaskStatus(taskId)
Имитация выполнения через setTimeout
```

**Task R-5.2 — bulk routes**
```
Создай routes: apps/api/src/modules/bulk/routes.ts
POST /bulk-move → createTask()
GET /bulk-move/:id → getTaskStatus()
```

**Task R-5.3 — frontend bulk api**
```
Файл apps/web/lib/api-client/bulk.ts
createBulk()
getBulkStatus()
```

**Task R-5.4 — zustand + page**
```
apps/web/store/bulk.store.ts — startBulk(), pollStatus()
apps/web/app/bulk-move/page.tsx — форма + прогресс
```

---

# 🔌 Этап 6 — WebSocket

**Task R-6.1**
```
Создать apps/api/src/plugins/ws.ts
Добавить fastify-websocket
/ws → подписка на события по taskId
```

**Task R-6.2**
```
В bulk-queue: emit events { type: "bulkMoveProgress" } и {type:"bulkMoveDone"}
```

**Task R-6.3**
```
Фронт: apps/web/lib/ws-client.ts
WebSocket singleton + subscribe(taskId, cb)
```

**Task R-6.4**
```
Обновить bulk.store.ts слушать ws вместо polling
```

---

# 🎮 Этап 7 — Steam MVP

⚠️ выполнять, когда UI на моках полностью готов

**Task R-7.1 — SteamClient**
```
Создай core/steam-client.ts
login(), getInventory(), getStorageUnits(), getStorageItems(), moveItems()
только сигнатуры
```

**Task R-7.2 — SteamManager**
```
Создай core/steam-manager.ts
singleton → getClient() возвращает один steamClient
```

**Task R-7.3**
```
Заменить inventory.service.ts → steamClient.getInventory()
```

---

# 🏁 Завершение
Когда весь roadmap выполнен → обновить docs/SECURITY.md и OPENAPI.md

