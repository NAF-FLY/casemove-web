# Backend — Fastify

## Назначение
Backend — единственная точка взаимодействия со Steam. 
Хранит соединение с Game Coordinator, выполняет операции, контролирует очередь задач.

## Структура
```
apps/api/src/
  plugins/
  core/
    steam-manager.ts
    steam-client.ts
    bulk-queue.ts
  modules/
    inventory/
    storage/
    bulk/
```
## Основные принципы
- REST — получение данных и инициализация задач
- WebSocket — прогресс задач
- Steam — только через SteamManager → SteamClient
