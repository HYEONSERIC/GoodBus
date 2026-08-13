# GoodBus - Project Summary

## ✅ What Was Built

A full-stack charter bus bidding platform with role-based access control, passenger reviews, Kakao maps integration, and an operations-focused **admin console**.

### Backend (Express + TypeScript)

-   **Location**: `/server`
-   **Database**: PostgreSQL with Prisma ORM
-   **Authentication**: JWT tokens in HttpOnly cookies, bcrypt password hashing
-   **API Routes** (high level):
    -   `/auth` - signup, login, logout, get current user
    -   `/trips` - create, list, get by ID, award trips (`awardedAt` on award)
    -   `/bids` - create bids, withdraw bids
    -   `/profile` - my profile read/update (multipart uploads)
    -   `/verification` - document upload and status read
    -   `/reviews` - create/list reviews; driver summary for bid UI
    -   `/notifications` - in-app notifications
    -   `/support` - passenger FAQ, notices, inquiries
    -   `/admin` - overview, users, activity, bids, verifications, support posts/inquiries, **revenue-stats**, notification history, admin creation
    -   `/kakao` - places search + directions proxy
    -   `/payments` - Toss Payments billing-key registration, membership tier subscribe/cancel/reactivate (upgrade=immediate, downgrade=scheduled), min-bid-amount add-on subscription, webhook (test keys as of 2026-08-13)
-   **Admin utilities**: `adminRevenue.ts`, `adminOverview.ts`, `adminUserStats.ts`, `adminSupportInquiryList.ts`
-   **Security**: Role-based middleware, CORS configuration
-   **Docker**: PostgreSQL container with docker-compose

### Frontend (Next.js + TypeScript)

-   **Location**: Root directory
-   **UI**: Tailwind CSS + shadcn/ui; `DashboardMobileShell` for role dashboards
-   **Pages**:
    -   Home (`/`), Login, Signup
    -   Dashboard router + Passenger / Driver / Company dashboards (trips, bids, profile, support, reviews)
    -   **Admin Console** (`/admin`) — tabbed shell with panels: overview, users, bids, notifications, verification, **revenue**, FAQ/inquiries, admin create
-   **State**: `hooks/useAdminDashboard.tsx` centralizes admin data, filters, deep links
-   **API Client**: `lib/api.ts` (+ optional `lib/adminApi.ts`)

### Features Implemented

✅ User authentication with role selection (Passenger/Driver/Bus Company/Admin)  
✅ Trip creation, bid, award, withdrawal flows  
✅ Reviews on completed trips; **driver rating on passenger bid list/detail**  
✅ In-app + optional SMTP email notifications  
✅ Kakao Places autocomplete + Directions on trip cards  
✅ Profile/verification uploads (local storage, S3-ready abstraction)  
✅ Trip grouping (`tripGroupsCore`) for round-trip pairing  
✅ **Admin console**: user/bid search, block, verification queue, FAQ/inquiry ops, notification history  
✅ **Admin revenue**: GMV & estimated fee by month, CSV export, `awardedAt` handling  
✅ **Admin deep links** between users ↔ bids via URL query (`lib/adminNav.ts`)  
✅ Shared admin loading/error UX components  
✅ JWT cookies, RBAC on routes, Prisma schema, idempotent seed (sample trip if missing)  
✅ `npm run dev:all` — frontend + backend concurrently  
✅ **Toss Payments integration** (test keys): billing-key card registration, 4-tier membership subscriptions with server-enforced bid limits, upgrade/downgrade flow (upgrade=immediate charge, downgrade=scheduled at next billing date), standalone min-bid-amount add-on subscription, recurring billing cron (`run-recurring-billing.ts`), webhook signature verification

## File Structure (condensed)

```
goodbus/
├── app/
│   ├── admin/page.tsx              # Admin entry (query-driven tabs)
│   ├── dashboard/                  # passenger | driver | company
│   ├── login, signup, page.tsx
│   └── api/kakao/                  # directions proxy
├── components/
│   ├── admin/
│   │   ├── AdminShell.tsx
│   │   ├── adminNav.ts             # Tab labels, CS visibility
│   │   ├── panels/                 # Admin*Panel.tsx per tab
│   │   ├── AdminErrorBanner.tsx
│   │   ├── AdminLoadingSkeleton.tsx
│   │   ├── AdminAsyncContent.tsx
│   │   └── AdminDeepLink.tsx
│   ├── dashboard/                  # Trip/bid UI, mobile shell
│   └── ui/                         # shadcn
├── hooks/
│   └── useAdminDashboard.tsx
├── lib/
│   ├── api.ts
│   ├── adminNav.ts                 # buildAdminHref query helper
│   ├── adminRevenueDisplay.ts
│   ├── adminStatusLabels.ts
│   ├── exportRevenueCsv.ts
│   └── tripGroups.ts
├── types/admin.ts
├── server/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/                 # auth, trips, bids, admin, reviews, …
│       ├── middleware/auth.ts
│       └── utils/                    # adminRevenue, adminOverview, …
├── README.md
├── PROJECT_STATUS.md
└── PROJECT_SUMMARY.md
```

## Tech Stack

### Frontend

-   **Framework**: Next.js (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Components**: shadcn/ui (Radix UI + Tailwind)
-   **HTTP**: Fetch with credentials

### Backend

-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Database**: PostgreSQL 16
-   **ORM**: Prisma
-   **Authentication**: JWT + bcrypt
-   **Validation**: Zod
-   **Container**: Docker Compose

## Data Model (key fields)

### User

-   id, email, passwordHash, role, status, **adminRole** (Super|CustomerSupport|Operations|Finance)
-   profile/vehicle images, garage, bus fields, verification URLs/status, driverComment, phoneNumber

### Trip

-   id, passengerId, origin, destination, dateTime, paxCount, busSize, status (open|awarded|cancelled)
-   **awardedAt** (set on award; used for revenue stats, fallback to createdAt when null)

### Bid

-   id, tripId, bidderId, price, note, status (open|withdrawn|awarded|lost)

## Admin API (additions)

-   `GET /admin/overview` — stats, nav badges, recent trips/bids
-   `GET /admin/users/:id` — `bidderStats`, `reviewSummary`, trip summary
-   `GET /admin/users/:id/activity` — trips, bids, reviews
-   `GET /admin/bids` — filters including `bidderId`, `passengerId`, `tripId`
-   `GET /admin/support-inquiries` — `search`, `status`, `sort`
-   `GET /admin/revenue-stats` — monthly GMV (`from`/`to` YYYY-MM)
-   `GET /admin/revenue-stats/awards` — award rows for CSV
-   `GET /admin/audit-log` — admin action history (Super/Operations only)

See **README.md** for the full endpoint list.

## Reviews API (passenger bid UI)

-   `GET /reviews/drivers/summary?driverIds=`
-   `GET /reviews/drivers/:driverId`

## Testing with Seeded Data

-   Passenger, Driver, Bus Company, Admin test accounts
-   Sample trip (New York → Boston) created only if not already present
-   Default password: `password123`

## Security Features

-   HttpOnly JWT cookies, SameSite=Lax, Secure in production
-   bcrypt password hashing
-   Role-based route middleware
-   CORS restricted to frontend origin
-   Prisma ORM + Zod validation

## Automated Testing, CI & Observability

-   Vitest unit tests (pure-logic focus, ~48 tests total): `npm test` (frontend), `cd server && npm test` (backend)
-   GitHub Actions CI (`.github/workflows/ci.yml`) — lint + build + test on push/PR to `main`/`aligo`; no CD (deploy is still manual)
-   Sentry error tracking (`@sentry/nextjs` frontend, `@sentry/node` backend) — enabled only when `NODE_ENV=production` and a DSN is set
-   Admin audit log (`AdminAuditLog` + `recordAdminAudit`) covers 5 admin write routes; viewable at `GET /admin/audit-log` / `AdminAuditLogPanel`

## Not Yet Built (production gaps)

-   Deployment automation (CD) — CI exists, but deploys are manual
-   Payment gateway, refunds, settlement
-   OAuth (Google/Kakao)
-   Rate limiting; full **adminRole API RBAC** (only a few routes use `requireAdminRole` today)
-   Central logging/metrics beyond Sentry error tracking (no request metrics/dashboards)
-   Route-level integration tests (current tests are pure-logic unit tests only)

## Getting Started

See `README.md` and `SETUP.md`.

```bash
cd server && docker-compose up -d
cd server && npm run db:push && npm run db:seed
# from repo root:
npm run dev:all
```

Then open http://localhost:3000 (frontend) and http://localhost:4000 (API).
