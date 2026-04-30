# Workspace

## Overview

pnpm workspace monorepo using TypeScript. CraKa OSINT Portal — a dark-themed intelligence aggregation platform.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind + wouter + TanStack Query
- **Auth**: Admin auth via Bearer token (base64 username:password), stored in localStorage

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

- `artifacts/craka-osint/` — React + Vite frontend (dark terminal UI)
  - Pages: Terminal (home), Logs, Stats, Tools, Admin Panel
  - Auth state: `src/lib/auth.ts` (zustand + setAuthTokenGetter)
  - Dev server proxies `/api/*` to `http://localhost:8080`
- `artifacts/api-server/` — Express API backend
  - `src/routes/osint.ts` — OSINT lookup, history, stats, APIs list
  - `src/routes/admin.ts` — Admin auth, CRUD for APIs, cache clear, grant/revoke premium
  - In production (`NODE_ENV=production`) it also serves the built frontend from `artifacts/craka-osint/dist/public` and falls back to `index.html` for SPA routes

## Deployment (Render single-service)

`render.yaml` defines one web service that builds both packages and serves them together:

- Build: `pnpm install` → build frontend → build api-server (esbuild bundle)
- Start: `node dist/index.mjs` from `artifacts/api-server/`
- Health check: `/api/healthz`
- Required env vars on Render: `NEON_DATABASE_URL` (or `DATABASE_URL`), `ADMIN_USER`, `ADMIN_PASS`, `JWT_SECRET`
- `lib/db/src/schema/osint.ts` — DB schema: osint_apis, osint_history, osint_cache

## Features

- 19 OSINT tools: Phone, Aadhaar, Vehicle RC, PAN, IFSC, UPI, Pincode, IP, Email, Telegram, Pakistan Number, Global Number, Free Fire, GSTIN, Domain WHOIS
- Category filtering: Phone, Identity, Vehicle, Banking, Location, Network, Email, Social, Gaming
- Result caching (30 min TTL)
- Query history log
- Admin panel: API management (CRUD), cache clear, full stats
- Token / credit system per user session (5 free credits, +5 per referral, refund on failed lookup)
- Premium plans (Basic / Pro / Elite — Elite = unlimited)
- Referral system with milestones, premium upgrade banner & buy-tokens modal (WhatsApp +91 7571083385, Telegram @DM_CRAKA_OWNER_BOT)

## Recent UI additions (post-migration)

- `src/lib/user.ts` — `useCurrentUser`, `useRefreshCurrentUser`, `useEnsureUserInitialized`, `isUnlimitedUser`, `isPremiumActive`
- `src/components/token-badge.tsx` — clickable badge in sidebar/topbar showing live tokens + plan; navigates to `/premium`
- `src/components/buy-tokens-modal.tsx` — popup shown when tokens run out during a search, with WhatsApp / Telegram CTAs
- `src/components/layout.tsx` — wires `useEnsureUserInitialized()` and renders `TokenBadge` everywhere
- `src/pages/home.tsx` — pre-flight token check + 403 handler that opens `BuyTokensModal`
- `src/components/premium-banner.tsx` — hidden for users with an active premium plan

## Admin Credentials

- Username: `admin`
- Password: `craka@admin123`
- (Configurable via ADMIN_USER / ADMIN_PASS environment variables)

## Developer Credit

`@DM_CRAKA_OWNER_BOT`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
