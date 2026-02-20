# AGENTS.md

> Project map for AI agents. Keep this file up-to-date as the project evolves.

## Project Overview
A full-stack web application for CS:GO / Steam integrations configured as a pnpm monorepo.

## Tech Stack
- **Language:** TypeScript
- **Framework:** Next.js (web), Fastify (api)
- **Database:** Supabase (PostgreSQL)
- **Tooling:** pnpm workspaces

## Project Structure
```
.
├── apps/
│   ├── api/            # Fastify backend service integrating with Steam components
│   └── web/            # Next.js frontend application using HeroUI
├── packages/
│   ├── shared-types/   # Shared TypeScript definitions
│   └── shared-utils/   # Shared utility functions
├── supabase/           # Supabase configurations and edge functions
├── .ai-factory/        # AI Factory specifications and rules
└── package.json        # Root package with monorepo scripts
```

## Key Entry Points
| File | Purpose |
|------|---------|
| package.json | Root monorepo configuration |
| apps/web/package.json | Web app dependencies and scripts |
| apps/api/src/index.ts | Main Fastify backend entry file (implied from package.json) |

## Documentation
| Document | Path | Description |
|----------|------|-------------|
| README | README.md | Project landing page |

## AI Context Files
| File | Purpose |
|------|---------|
| AGENTS.md | This file — project structure map |
| .ai-factory/DESCRIPTION.md | Project specification and tech stack |
| .ai-factory/ARCHITECTURE.md | Architecture decisions and guidelines |
| CLAUDE.md | Generic AI agent context instructions |

## Language Policy
- The agent MUST always communicate with the user in Russian.
- All explanations, confirmations, summaries, and messages must be written in Russian.
- English is allowed ONLY for:
  - source code
  - library, framework, and API names
  - file names and paths
  - error messages quoted verbatim
- Responding in a non-Russian language without explicit user request is considered a critical violation.
- If the agent accidentally responds in another language, it must immediately switch back to Russian.