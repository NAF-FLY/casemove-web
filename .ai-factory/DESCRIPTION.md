# Project: Casemove Web Monorepo

## Overview
A full-stack web application consisting of a web client and an API service, organized as a pnpm workspace monorepo. It interacts with the Steam ecosystem (CS:GO related based on globaloffensive and steam-user dependencies).

## Tech Stack
- **Language:** TypeScript
- **Package Manager:** pnpm (Workspaces)
- **Frontend (web):** Next.js 16, React 18, HeroUI, Tailwind CSS, Zustand, Framer Motion
- **Backend (api):** Fastify, Node.js, jsonwebtoken
- **Database / Auth:** Supabase (PostgreSQL)
- **Integrations:** Steam User, GlobalOffensive, SteamCommunity

## Architecture
See `.ai-factory/ARCHITECTURE.md` for detailed architecture guidelines.
Pattern: Modular Monolith

## Non-Functional Requirements
- Monorepo tooling and scripts (concurrently used for running dev mode).
- Standard linting setup using ESLint and Prettier.
