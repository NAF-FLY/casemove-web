# Tech Stack

## General
- **Monorepo Manager**: pnpm
- **Runtime**: Node.js 18+
- **Language**: TypeScript

## Apps

### Web (`apps/web`)
- **Framework**: Next.js (v16.1.1)
- **UI Library**: React (v18.2.0) + `@heroui/react`
- **Styling**: Tailwind CSS (v4 alpha/beta), PostCSS, `tailwindcss-animate`, `framer-motion`
- **Icons**: `lucide-react`
- **State Management**: `zustand`
- **Steam Integration**: `steamcommunity`

### API (`apps/api`)
- **Framework**: Fastify
- **Runtime Runner**: `tsx`
- **Authentication/Database**: Supabase (`@supabase/supabase-js`)
- **Steam Integration**: `steam-user`, `steamcommunity`, `globaloffensive`
- **Utilities**: `dotenv`, `jsonwebtoken`
