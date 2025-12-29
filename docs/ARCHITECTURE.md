# Архитектура проекта — Casemove Web

## Общая концепция
Проект — веб-версия инструмента для управления инвентарём CS2 и Steam Storage Units. 
UI работает в браузере, всё взаимодействие со Steam происходит строго на backend.

## Цели MVP
- один Steam-аккаунт из ENV
- локальная разработка → деплой на VPS
- безопасность на базовом уровне

## Дальнейшие цели
- мультиюзерность
- шифрование Steam-кредов
- rate limiting
- история операций

## Архитектурные слои
```
Frontend  →  API Client →  Backend (Fastify) → SteamManager → SteamClient → Steam / GC
```
- **SteamManager** — управляет клиентами Steam (в будущем — для каждого user отдельный клиент)
- **SteamClient** — низкий уровень: log in, fetch инвентарь, перемещение предметов

## Monorepo
```
root/
  apps/
    web/       # Next.js фронтенд
    api/       # Fastify backend
  packages/
    shared-types/   # DTO
    shared-utils/   # utilities
  docs/
```