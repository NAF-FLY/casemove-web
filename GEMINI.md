# Agent Instructions

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

---

## General Rules
- Prefer minimal, focused diffs.
- Do not change application behavior unless explicitly requested.
- Do not rewrite entire files when a small refactor is sufficient.
- Explain the intent of changes BEFORE applying them.
- Ask for confirmation before large, cross-module, or risky changes.
- Avoid speculative or hypothetical changes.

---

## Tooling Rules
- Always use Serena MCP tools for:
  - refactoring
  - file modifications
  - structural analysis
  - code navigation
- Do NOT manually rewrite files when a Serena tool is available.
- Respect pnpm monorepo boundaries.
- Never move or duplicate code across packages without explicit confirmation.

---

## Agent Skills (Skill Packs)
- If AgentSkills are available in the workspace (e.g. `.agent/skills/**/SKILL.md`), the agent MUST:
  1) Prefer using a relevant skill for the task (e.g. React patterns, refactoring playbooks).
  2) Read the skill instructions first and follow them.
  3) Mention which skill is being applied (by name) before making changes.

- Priority / Conflict Resolution:
  - This `Agent.md` is the highest priority policy for this repository.
  - Skills may add more specific best practices, but must not violate:
    - Language Policy (Russian only)
    - Minimal diffs
    - “No behavior changes unless requested”
    - Safety-Critical Areas rules
  - If a skill conflicts with this file, follow `Agent.md` and briefly explain the conflict.

- When doing code changes:
  - Use Serena MCP tools to analyze and apply edits.
  - Skills define “how to do it well”; Serena defines “how to do it safely”.

---

## Repository Structure
- This repository is a pnpm monorepo.
- apps/web — Next.js 16 frontend (App Router).
- apps/api — Fastify backend.
- Shared logic must not be duplicated across apps.
- Any proposal to extract shared code must be discussed first.

---

## Frontend Rules (apps/web)
- Use Next.js App Router conventions.
- Prefer Server Components unless client-side state is required.
- Client Components must be explicitly justified.
- Use Zustand for global state management.
- Do not introduce new state management libraries.
- Use Tailwind CSS and HeroUI only.
- Avoid CSS-in-JS and inline styles unless explicitly requested.
- Keep components small and focused.
- Feature logic should live in `src/modules`.

---

## Backend Rules (apps/api)
- Use Fastify plugin and module architecture.
- Keep HTTP layer (routes) thin.
- Business logic must live in service files.
- Do not mix infrastructure (`src/core`) with feature modules.
- Supabase is the primary data source.
- JWT and crypto logic are considered sensitive.

---

## Safety-Critical Areas
- Authentication
- Authorization
- Billing / payments
- Steam integration
- Cryptography
- Database schema and migrations

Rules:
- Never modify safety-critical areas without explicit confirmation.
- Always explain potential risks before touching these areas.

---

## Refactoring Guidelines
- Refactoring must preserve existing behavior.
- Tests (if present) must continue to pass.
- Prefer incremental refactors over large rewrites.
- Highlight any potential side effects.
- Stop and ask if the refactor scope grows unexpectedly.

---

## Interaction Style
- Be concise and precise.
- Do not over-explain unless asked.
- Avoid unnecessary verbosity.
- Ask clarifying questions only when necessary to proceed safely.

---

## Confirmation
- After reading this file, the agent must acknowledge understanding.
- The agent must follow these instructions strictly in all future interactions.
