# Suggested Commands

## Development
These commands should be run from the root directory unless specified otherwise.

- **Install Dependencies**: `pnpm install`
- **Run All (Concurrent)**: `pnpm dev` (or `pnpm -w run dev`)
- **Run Web Only**: `pnpm dev:web` (or `pnpm --filter web dev`)
- **Run API Only**: `pnpm dev:api` (or `pnpm --filter api dev`)

## Formatting & Linting
*Note: No explicit lint/test scripts were found in the root `package.json`. Standard Next.js linting likely applies within `apps/web` via `next lint` (though not explicitly exposed as a root script).*

## Other
- **Supabase**: If working with local Supabase, standard `supabase` CLI commands likely apply (e.g. `supabase start`, `supabase status`), though checking the `supabase` directory might be needed for specifics.
