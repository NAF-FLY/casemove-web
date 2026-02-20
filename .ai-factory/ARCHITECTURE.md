# Architecture: Modular Monolith

## Overview
For the Casemove Web Monorepo, we've selected the **Modular Monolith** architecture. This pattern fits perfectly with our pnpm workspace structure. It allows us to build distinct feature modules (e.g., users, authentication, cases, trades) that can be developed and tested independently, while still being deployed as a cohesive unit (Next.js web client and Fastify API backend).

## Decision Rationale
- **Project type:** Full-Stack web application with Steam integration
- **Tech stack:** TypeScript, Next.js (web), Fastify (api), Supabase
- **Key factor:** Simplicity of operations (deploying two main apps) combined with clear boundaries for long-term maintainability. 

## Folder Structure
```
casemove-web/
├── apps/
│   ├── web/                     # Next.js Presentation Layer
│   │   ├── app/                 # Next.js App Router 
│   │   ├── components/          # Shared UI components (HeroUI)
│   │   └── modules/             # Frontend feature-specific modules (optional, for complex features)
│   │       └── auth/            
│   │           ├── components/
│   │           ├── hooks/
│   │           └── store.ts     # Zustand store
│   │
│   └── api/                     # Fastify Backend Service
│       └── src/
│           ├── modules/         # Core business logic divided by feature
│           │   ├── users/
│           │   │   ├── api.ts   # Fastify route handlers 
│           │   │   ├── service.ts # Business logic
│           │   │   └── index.ts # Public API export
│           │   └── ...
│           ├── plugins/         # Fastify plugins (Supabase, Steam)
│           └── index.ts         # Composition root
│
├── packages/
│   ├── shared-types/            # Truly shared definitions (DTOs, Enums)
│   └── shared-utils/            # Shared helpers
```

## Dependency Rules

- ✅ `apps/web` can depend on `packages/shared-types` and `packages/shared-utils`.
- ✅ `apps/api` can depend on `packages/shared-types` and `packages/shared-utils`.
- ❌ `apps/web` MUST NOT depend on `apps/api` directly (use HTTP/fetch to communicate).
- ❌ `packages/*` MUST NOT depend on `apps/*` (shared code must remain agnostic).
- ❌ Within `api/src/modules`, a module MUST NOT import from the internals of another module. It may only import from the other module's `index.ts` public API.

## Layer/Module Communication
- **Frontend to Backend:** The Next.js web application requests the Fastify API using standard HTTP.
- **Backend Module to Module:** Within the `api` backend, modules communicate through their public APIs (exported from `index.ts`).
- **Data Access:** Supabase SDK is used within the backend services (`api/src/modules/*/service.ts`) or in secure Next.js Server Components.

## Key Principles
1. **Explicit Module Boundaries:** Keep features self-contained. If a change affects "users", you should only need to modify the files in the `users` module.
2. **Shared Everything in Packages:** If a type or utility is needed by both `web` and `api`, it goes into the `packages/` directory.
3. **Keep Components Dumb:** UI components in `web/components/` should not contain complex business logic or data fetching. Pass data as props.

## Code Examples

### Defining a Module Public API (Backend)
```typescript
// apps/api/src/modules/users/index.ts
// ✅ ONLY export what other modules are allowed to use
export { getUserProfile, updateUserStatus } from './service';
export type { UserProfileDto } from '@casemove/shared-types';
```

### Invalid Inter-Module Import (Anti-Pattern)
```typescript
// apps/api/src/modules/orders/service.ts
// ❌ Do NOT reach into another module's internal files
import { internalUserValidation } from '../users/validation'; 
```

## Anti-Patterns
- ❌ **The "God" User Object:** Avoid attaching everything to a single shared User model. Let each module extend the `shared-types` definition with its specific needs.
- ❌ **Database calls in Route Handlers:** Don't initialize Supabase and perform queries directly inside Fastify route handlers. Delegate to the module's `service.ts` layer.
