# CONTEXT.md — краткий контекст проекта (для AI)

Casemove Web — веб‑версия тулзы для управления инвентарём CS2 и Steam Storage Units.

## Что мы строим
- Браузерный UI, backend управляет Steam‑операциями.
- MVP: 1 Steam‑аккаунт из ENV, локальная разработка → VPS деплой.
- В будущем: мультиюзерность, хранение Steam‑кредов в БД (шифрование), rate‑limit, очередь задач.

## Технологии
Frontend:
- Next.js App Router + TypeScript
- Zustand (stores), shadcn/ui, Tailwind
- WebSocket для прогресса задач

Backend:
- Fastify + Node.js + TypeScript
- steam‑user + globaloffensive
- SteamManager → SteamClient
- bulk‑queue для операций

## Контракты (обязательные)
API:
- описано в docs/OPENAPI.md

DTO:
- лежат в packages/shared‑types
- описание: docs/DTOS.md

## Структура репо
root/
  apps/web     ← Next.js фронт
  apps/api     ← Fastify backend
  packages/shared‑types
  docs/

## Правило поведения ИИ
Не менять архитектуру. Если проекта ещё нет — генерировать строго по тем же правилам, что описаны в docs/.

