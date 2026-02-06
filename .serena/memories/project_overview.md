# Project Overview: Casemove Web Monorepo

This is a **pnpm monorepo** for the **Casemove Web** project.
It consists of a frontend web application and a backend API service, along with shared internal packages.

## Structure

### Monorepo
- **apps/web**: Next.js frontend (App Router)
- **apps/api**: Fastify backend
- **packages/**: Shared logic and types
- **supabase/**: Supabase configuration and migrations

### Frontend Structure (`apps/web/src/`)
```
src/
├── app/           # Next.js App Router (routes, layouts)
├── assets/        # Static resources (images)
├── core/          # Infrastructure
│   ├── providers/ # Providers.tsx, AuthInit.tsx, session.store.ts
│   ├── api-client/# API clients (fetchClient.ts, inventory, storage, steam-accounts)
│   ├── supabase/  # Supabase client
│   └── theme/     # CSS tokens
├── modules/       # Feature modules (domain-driven)
│   ├── auth/      # components/, auth.store.ts
│   ├── inventory/ # components/, inventory.store.ts, inventorySelection.store.ts
│   ├── profile/   # components/, steamAccounts.store.ts
│   └── storage/   # components/, hooks/, storage.*.ts (service, types, utils, store, etc.)
├── shared/        # Reusable elements
│   ├── components/# layout/ (PageContainer, Sidebar), ui/ (Table, Toolbar, etc.)
│   ├── hooks/     # useDebouncedValue, useRefetchOnFocus
│   └── utils/     # utils.ts
└── proxy.ts
```

## Naming Conventions
- **Components**: `PascalCase.tsx`
- **Hooks**: `useCamelCase.ts`
- **Module files**: `feature.type.ts` (e.g., `storage.service.ts`)
- **Utilities/styles**: `camelCase.ts`

## Purpose
The project facilitates interaction with Steam/CS:GO items ("Casemove"), involving inventory management, trading, or viewing, given the dependencies on `steam-user`, `steamcommunity`, and `globaloffensive`.
