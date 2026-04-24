# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

See `DESIGN.md` for the full product intent, data schema, and feature roadmap before making any non-trivial changes to the DB or business logic.

## Commands

```sh
bun dev           # start dev server
bun build         # production build
bun lint          # biome check
bun format        # biome format --write

bun db:generate   # generate SQL migration from schema changes
bun db:migrate    # apply migrations to Neon
bun db:studio     # open Drizzle Studio
```

Bun is at `~/.bun/bin/bun` if not yet on PATH.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Clerk** for auth — `@clerk/nextjs/server` in Server Components/Route Handlers, `@clerk/nextjs` for client components
- **Drizzle ORM** + **Neon** (serverless Postgres) for the database
- **Biome** for linting and formatting (replaces ESLint + Prettier)

## Architecture

All routes are protected by default via `src/middleware.ts`. Only `/sign-in` and `/sign-up` are public. Add new public routes to the `isPublicRoute` matcher there.

Auth pages live in `src/app/(auth)/` using Clerk's catch-all route pattern (`[[...sign-in]]`, `[[...sign-up]]`).

Database schema is defined in `src/db/schema.ts` and the Drizzle client is exported from `src/db/index.ts`. Import as `@allocado/db` and `@allocado/db/schema` (path aliases in `tsconfig.json`).

## Brand / Styling

Custom Tailwind theme tokens are defined in `src/app/globals.css` — use `avocado-*` scale (50–900), `pit`, `coin`, and `leaf` colors. Reusable component classes (`.btn-primary`, `.btn-secondary`, `.input-field`, `.card`) are in the `@layer components` block in the same file.

## Environment variables

Required in `.env`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
DATABASE_URL   # Neon connection string with ?sslmode=require
```
