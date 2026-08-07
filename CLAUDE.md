# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- Frontend: Next.js 16 (App Router) + React 19 + TypeScript, at repo root (`app/`, `components/`, `hooks/`, `lib/`, `types/`)
- Backend: Express + TypeScript in `server/` (`server/src/routes`, `server/src/middleware`, `server/src/utils`)
- Database: PostgreSQL via Prisma ORM (`server/prisma/schema.prisma`)
- Next.js and Express are **not** containerized together — only Postgres runs in Docker (`server/docker-compose.yml`, container `goodbus-postgres`). Run Next.js/Express directly with npm (dev) or pm2 (prod).

## Development

- `npm run dev:all` from repo root runs frontend (:3000) and backend (:4000) concurrently
- Backend first-time setup: `cd server && docker-compose up -d && npm run db:push && npm run db:seed`
- Working branch: `refactor/GB` (most recently active branch; base new work here unless told otherwise — `main` is behind)
- No test suite and no CI/CD pipeline exist yet — don't assume `npm test` works.

## Architecture patterns

- **Auth**: JWT signed in `server/src/utils/jwt.ts`, stored in an HttpOnly cookie named `token` (`{ httpOnly, secure: NODE_ENV==='production', sameSite:'lax', maxAge: 7d }`). `JWT_SECRET` is required — `server/src/utils/jwt.ts` throws at process startup if it's unset (no fallback).
- **Route protection**: `requireAuth`/`requireRole(...role)` in `server/src/middleware/auth.ts` check `UserRole` (Passenger/Driver/BusCompany/Admin). `requireAdminRole(...adminRoles)` additionally checks `AdminRole` (Super/CustomerSupport/Operations/Finance) via a fresh DB lookup (not stored in the JWT) — applied today to `/admin/revenue-stats`, `/admin/revenue-stats/awards`, `POST /admin/admins`, and the Admin-target-account branch of `PATCH /admin/users/:id/status`. Other admin sub-routes (support posts/inquiries, verifications, etc.) have no sub-role restriction, which matches their frontend (no adminRole gating there either). Don't assume a *new* admin endpoint is sub-role-restricted unless it explicitly uses `requireAdminRole`.
- **Backend routes**: one router per domain in `server/src/routes/*.ts`, mounted at a matching path in `server/src/index.ts` (e.g. `authRoutes` → `/auth`). Validate request bodies with a Zod schema declared at the top of the file — this pattern is consistent in `auth.ts`/`trips.ts` but **not** yet applied to `admin.ts`, `chats.ts`, `notifications.ts`, `profile.ts`, `support.ts`, `verification.ts`. Don't assume a route already validates input; check the specific file before adding to it.
- **External API calls**: use native `fetch`, not axios (axios isn't a dependency) — see `server/src/routes/kakao.ts` for the pattern (env-var presence check → `fetch` → `response.ok` check → typed error response).
- **Frontend API client**: all calls go through `lib/api.ts`'s `fetchAPI` helper (always `credentials: 'include'`, parses `{error}` from non-2xx JSON responses and throws). New API namespaces should follow the existing `authAPI`/`tripsAPI` object style, not ad-hoc `fetch` calls in components.

## Where to look for project status

`PROJECT_STATUS.md` (Korean) tracks what's built vs. not yet built, production gaps, and hosting/rollout plans — check it before assuming a feature (payments, phone login, etc.) is implemented. `PROJECT_SUMMARY.md` and `README.md` have the fuller feature/API list. `DEPLOYMENT.md` covers the hosting setup.
