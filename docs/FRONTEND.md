# Frontend — Next.js + Zustand + shadcn/ui

## Назначение
UI для отображения инвентаря, запуска bulk-операций, мониторинга прогресса.

## Структура
```
apps/web/
  app/
  components/
  store/        # Zustand
  lib/api-client/
  lib/ws-client/
```

## Состояние
Zustand stores:
- `inventory.store.ts`
- `storage.store.ts`
- `bulk.store.ts`
- `session.store.ts`

## UI
Основан на shadcn/ui (Radix + Tailwind)
