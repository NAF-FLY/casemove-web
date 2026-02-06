# Frontend Folder Structure

## Overview
The frontend (`apps/web/src/`) follows a domain-driven structure:

```
src/
├── app/           # Next.js App Router (routes only)
├── assets/        # Static resources
├── core/          # Infrastructure (providers, api-client, supabase, theme)
├── modules/       # Feature modules with stores inside
├── shared/        # Reusable components, hooks, utils
└── proxy.ts
```

## Module Pattern
Each feature module should follow:
```
modules/<feature>/
├── components/           # UI components
├── hooks/                # Feature-specific hooks
├── <feature>.service.ts  # API calls
├── <feature>.store.ts    # Zustand store
├── <feature>.types.ts    # TypeScript types
└── <feature>.utils.ts    # Utilities (optional)
```

## Key Directories

### `core/`
- `providers/` — App providers (Providers.tsx, AuthInit.tsx, session.store.ts)
- `api-client/` — API clients (fetchClient.ts, inventory.ts, storage.ts, steam-accounts.ts)
- `supabase/` — Supabase client configuration
- `theme/` — CSS tokens

### `shared/`
- `components/layout/` — PageContainer, Sidebar
- `components/ui/` — Table, Toolbar, FloatingActionButton, styles
- `hooks/` — useDebouncedValue, useRefetchOnFocus
- `utils/` — General utilities

### `modules/`
| Module | Contents |
|--------|----------|
| auth | LoginCard, LogoutButton, auth.store |
| inventory | InventoryTable, TransferItemDrawer, inventory.store, inventorySelection.store |
| profile | Profile cards, steamAccounts.store |
| storage | Full module: components, hooks, service, store, types, utils |

## Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Module files: `feature.type.ts`
- Utilities/styles: `camelCase.ts`
