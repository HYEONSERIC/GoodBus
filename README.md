# GoodBus - Charter Bus Bidding Platform

A full-stack web application connecting passengers with drivers and bus companies for charter bus services.

## Tech Stack

### Frontend

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- date-fns

### Backend

- Node.js with Express
- TypeScript
- PostgreSQL with Prisma ORM
- JWT authentication
- bcrypt for password hashing
- Docker Compose for PostgreSQL

## Features

### Authentication & roles

- **Role-based authentication**: Passenger, Driver, Bus Company, Admin (JWT + HttpOnly cookies)
- **Admin sub-roles**: Super, CustomerSupport, Operations, Finance (tab visibility differs by role)

### Passenger

- **Trip quoting**: Multi-step trip creation (Kakao address autocomplete, round-trip / one-way, companion & itinerary fields)
- **Quote list**: Open trips with bid counts, expandable detail, distance hints (Kakao Directions)
- **Bid detail & award**: Compare bids, view bidder profile/gallery, award selected bid, open chat from bid detail
- **Booking tab**: Awarded / in-progress vs completed trips (grouped display via shared `tripGroupsCore`)
- **Trip cancel**: Cancel open or awarded trips with reason (`PassengerCancelTripDialog`)
- **Trip update**: Edit open trips before award (`PATCH /trips/:id`)
- **Reviews**: Star rating, comment, up to 4 photos on completed trips; view own reviews per trip; **bid list/detail shows driver/company average rating** (`GET /reviews/drivers/summary`)
- **Chat tab**: In-dashboard chat only (no quote summary / CTA cards on chat tab)
- **Support tab**: Notices, FAQ search, 1:1 inquiries (`SupportCustomerCenter`, `SupportInquiryDialog`)

### Driver & bus company (bidders)

- **Open trips & bidding**: Browse open trips, `OpenTripBidDialog` (fee step → price, vehicle, extras, message, add-ons)
- **Bid withdraw**: Withdraw own open bids
- **Contracts / awarded trips**: Shared `AwardedTripCard` + `BidderAwardedTripsList`; my-bid detail overlay
- **Profile**: View/edit profile, vehicle gallery, verification status (`BidderProfileTabPanel`, `useBidderProfile`)
- **Membership plans**: Plan list UI for bidders (`MembershipPlansPanel`)
- **Payment cards (client UI)**: Add/list cards stored in browser `localStorage` per user (`PaymentCardsPanel`) — not a live payment gateway
- **Reviews received**: Driver/company “my reviews” with average rating (`GET /reviews/driver/me`)
- **Chat**: Same list → room flow as passengers; room titles show route + optional “손님” suffix for bidders

### In-app chat

- **Room list → room**: `ChatPanel` shows rooms first; tap to enter conversation (not side-by-side master-detail)
- **Per-trip rooms**: Create/ensure room for a quote (`POST /chats/rooms/for-quote`)
- **List metadata**: Route-based title (or custom title), last message preview, last activity time, unread count
- **Messaging**: Send text, mark read, leave room; optional custom room title (`PATCH /chats/rooms/:id`)
- **Peer display**: `displayName` / `companyName` / role-based fallback labels; profile avatars in list & header
- **Deep link**: `focusRoomId` opens a room from bid detail or booking “채팅하기”

### Notifications

- **In-app feed**: Recent notifications for the signed-in user
- **History**: Paginated history with type/date filters; delete one or clear all
- **Unread count & read state**: Per-notification and mark-all-read
- **Email hooks**: Server-side notification creation for bid/trip events (where configured)

### Admin console

- **Shell**: Fixed sidebar + scrollable main; logout under nav; **CustomerSupport** hides **매출·거래** tab (UI only; API still Admin-wide today)
- **Overview**: Today/week GMV (만원), pending inquiry & verification counts with badges; **deep links** from recent trips/bids to user & bid tabs
- **Users**: Search/filter; block/unblock; detail with profile/vehicles/verification; **bidder awarded count + GMV**; activity (trips, bids, reviews) with pagination cap; links to bid tab
- **Bids**: Search/filter; **deep links** to user profile & trip-scoped bid list; amounts labeled **(만원)**
- **Notification history**: Admin-wide log with filters; price column in 만원
- **Verification**: Approve/reject with reason; **Korean status labels** (승인 대기/완료/반려)
- **FAQ / support**: Notice & FAQ CRUD; inquiries with **search, status filter, 미답변 우선 sort**, reply dialog
- **Revenue (매출·거래)**: GMV & estimated platform fee (10%) by month; `awardedAt` fallback notice; monthly chart/table; per-month award list; **period/month CSV** with summary footer
- **Admin creation**: Super-only
- **Audit log**: `AdminAuditLog` model + `recordAdminAudit` util records user block/unblock, verification review, admin creation, support post CRUD, and inquiry reply; `AdminAuditLogPanel` (Super/Operations only) shows a paginated, read-only table (time/admin/action/target/metadata)
- **UX**: Shared **`AdminErrorBanner`**, **`AdminLoadingSkeleton`**, **`AdminAsyncContent`** across tabs; URL query `?tab=&userId=&bidderId=` for bookmarking (`lib/adminNav.ts`, `components/admin/adminNav.ts`); **`AdminActivitySectionFooter`** ("더보기" load-more, configurable `max`/`step`) used for user activity, bids, and support inquiries lists

### Maps & data

- **Kakao Places**: Address autocomplete (passenger trip form; server REST proxy)
- **Kakao Directions**: Route distance/duration for trip cards (`/kakao/directions`, Next.js `/api/kakao/directions` proxy)
- **Trip grouping**: Shared `tripGroupsCore` for round-trip pairing and passenger trip summaries (front + server)

### Platform & storage

- **Dashboard UX**: `DashboardMobileShell` — unified top bar, side menu, bottom tabs (Korean UI) per role
- **Profile & verification**: Multipart profile update; license/registration upload; pending / approved / rejected
- **Storage abstraction**: Local uploads by default, S3-ready service structure
- **Static uploads**: Served under `/uploads` on the API host

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop (make sure it's running)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd goodbus
```

2. Install frontend dependencies:

```bash
npm install
```

3. Install server dependencies:

```bash
cd server
npm install
```

4. Start Docker Desktop on your machine (if not already running).

5. Set up environment variables:

```bash
cd server
cp .env.example .env
cd ..
```

Add the Kakao REST API key to `server/.env`:

```
KAKAO_REST_API_KEY=YOUR_REST_API_KEY
```

6. Start PostgreSQL with Docker Compose:

```bash
cd server
docker-compose up -d
```

This will start a PostgreSQL container. Wait a few seconds for it to be ready.

7. Set up the database:

```bash
cd server
npm run db:push
npm run db:seed
```

If you get an error, wait a few more seconds and try again to let Docker fully start the database.

### Production deployment (Cafe24 VPS)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the Cafe24-based architecture (~66,000원/mo), env templates, Nginx/certbot, and pm2 setup.

### Running the Application

#### 방법 1: 간편 실행 (권장)

프론트엔드와 백엔드를 한 번에 실행:

```bash
npm run dev:all
```

이 명령어는 프론트엔드(http://localhost:3000)와 백엔드(http://localhost:4000)를 동시에 실행합니다.

#### 방법 2: 개별 실행

별도의 터미널에서 각각 실행하려면:

**터미널 1: 백엔드 서버**

```bash
cd server
npm run dev
```

백엔드는 http://localhost:4000에서 실행됩니다.

**터미널 2: 프론트엔드**

```bash
npm run dev
```

프론트엔드는 http://localhost:3000에서 실행됩니다.

## Default Test Accounts

The seed script creates test accounts (all with password: `password123`):

- **Passenger**: passenger@example.com
- **Driver**: driver@example.com
- **Bus Company**: company@example.com
- **Admin (Super)**: admin@example.com

## API Endpoints

Base URL: `http://localhost:4000` (or same-origin `/api` proxy from Next.js). All authenticated routes use cookie JWT unless noted.

### Authentication

- `POST /auth/signup` - Create new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user

### Trips

- `GET /trips` - List trips (optional `?status=` filter; role-scoped)
- `GET /trips/:id` - Trip detail with bids
- `POST /trips` - Create trip (Passenger)
- `PATCH /trips/:id` - Update open trip (Passenger)
- `POST /trips/:id/award` - Award trip to bid (Passenger); sets `Trip.awardedAt`
- `PATCH /trips/:id/cancel` - Cancel trip (Passenger)

### Bids

- `POST /bids` - Create bid (Driver / Bus Company)
- `PATCH /bids/:id/withdraw` - Withdraw bid (owner)

### Chats

- `POST /chats/rooms/for-quote` - Ensure chat room for trip + bidder
- `GET /chats/rooms` - List my chat rooms
- `GET /chats/rooms/:roomId/messages` - Messages (optional `?after=`)
- `POST /chats/rooms/:roomId/messages` - Send message
- `PATCH /chats/rooms/:roomId` - Update room (e.g. `customTitle`)
- `PATCH /chats/rooms/:roomId/read` - Mark room read
- `POST /chats/rooms/:roomId/leave` - Leave room

### Notifications

- `GET /notifications` - Recent notifications
- `GET /notifications/history` - Paginated history (`page`, `pageSize`, `type`, dates)
- `GET /notifications/unread-count` - Unread count
- `PATCH /notifications/:id/read` - Mark one read
- `PATCH /notifications/read-all` - Mark all read
- `DELETE /notifications/history/:id` - Delete one history row
- `DELETE /notifications/history` - Clear history

### Reviews

- `GET /reviews?tripIds=...` - Reviews for trips (Passenger: own trips)
- `POST /reviews` - Create review with photos (Passenger, multipart)
- `GET /reviews/driver/me` - Reviews received by driver/company + average rating
- `GET /reviews/drivers/summary?driverIds=` - Batch avg rating for bid UI (Passenger)
- `GET /reviews/drivers/:driverId` - Public driver review list for bid detail

### Support (public posts + authenticated inquiries)

- `GET /support/posts?kind=notice|faq&q=` - List notices or FAQ
- `GET /support/posts/:id` - Post detail
- `POST /support/inquiries` - Submit inquiry (authenticated)
- `GET /support/my-inquiries` - My inquiries
- `GET /support/my-inquiries/:id` - Inquiry detail

### Profile & verification

- `GET /profile/me` - My profile
- `PATCH /profile/me` - Update profile (multipart: text + photos)
- `GET /verification/me` - My verification status
- `POST /verification/upload` - Upload verification document (multipart)

### Kakao (server)

- `GET /kakao/places?query=...` - Places autocomplete
- `GET /kakao/directions?...` - Directions / distance proxy

### Next.js API proxy (frontend)

- `GET /api/kakao/places?query=...` - Proxies to backend Kakao places
- `GET /api/kakao/directions?...` - Proxies to backend Kakao directions

### Admin

- `GET /admin/overview` - Stats, recent trips/bids, `navBadges`, today/week awards
- `GET /admin/users` - List/filter users (`role`, `status`, `search`)
- `GET /admin/users/:id` - User detail, `bidderStats`, `reviewSummary`, passenger `tripSummary`
- `PATCH /admin/users/:id/status` - Block/unblock
- `GET /admin/users/:id/activity` - Trips, bids, reviews (`?take=`, max 50)
- `GET /admin/bids` - Bid search (`search`, `bidStatus`, `tripStatus`, dates, `bidderId`, `passengerId`, `tripId`, `take` max 200)
- `GET /admin/notification-history` - Notification log (filters)
- `GET /admin/verifications` - Verification queue (`type`, `status`)
- `GET /admin/verifications/:id/download` - Download submitted document
- `PATCH /admin/verifications/:id` - Approve/reject (`?type=driver|company`)
- `GET /admin/support-posts` - List notice/FAQ posts
- `POST /admin/support-posts` - Create post
- `PATCH /admin/support-posts/:id` - Update post
- `DELETE /admin/support-posts/:id` - Delete post
- `GET /admin/support-inquiries` - List inquiries (`search`, `status`, `sort`, `take` max 500)
- `GET /admin/support-inquiries/:id` - Inquiry detail
- `PATCH /admin/support-inquiries/:id` - Reply to inquiry
- `GET /admin/revenue-stats` - GMV stats (`from`, `to` as `YYYY-MM`)
- `GET /admin/revenue-stats/awards` - Award rows for month or range (CSV source)
- `POST /admin/admins` - Create admin (Super)
- `GET /admin/audit-log` - Admin action history (Super/Operations only, `page`/`pageSize`)

## Scripts

### Frontend

- `npm run dev` - Start development server
- `npm run dev:server` - Start backend server only
- `npm run dev:all` - Start both frontend and backend servers simultaneously
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linter
- `npm test` - Run Vitest unit tests (frontend only)
- `npm run test:all` - Run frontend + backend unit tests in parallel

### Backend

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run db:push` - Push Prisma schema to database
- `npm run db:seed` - Seed test users; sample NY→Boston trip only if missing (idempotent)
- `npm test` - Run Vitest unit tests (backend only)

## Project Status

대시보드·입찰 UI를 **역할별 훅 + 얇은 `page.tsx` + 공통 컴포넌트** 구조로 단계적으로 분리 중입니다. 동작은 유지한 채 파일만 이동·추출(Strangler)한 상태이며, `npx tsc --noEmit`으로 타입 검증을 맞춰 두었습니다.

| 영역                        | 상태    | 비고                                                                                                   |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| 관리자 대시보드             | ✅ 완료 | `useAdminDashboard` + `app/admin/page.tsx` + `components/admin/panels/*`, `adminNav.ts`, revenue/CS UX |
| 기사 / 회사 / 승객 대시보드 | ✅ 완료 | 역할별 Provider 훅 + `*DashboardContent`, `page.tsx` 각 **~12줄**                                      |
| 입찰자 프로필 (기사·회사)   | ✅ 완료 | `useBidderProfile`, `BidderProfileTabPanel` / `BidderProfileEditPanel`                                 |
| 낙찰·예약 카드·모바일 셸    | ✅ 완료 | `AwardedTripCard`, `BidderAwardedTripsList`, `DashboardMobileShell`                                    |
| 승객 Dialog 묶음            | ✅ 완료 | `components/passenger/dialogs/*` (취소·수정·입찰 상세)                                                 |
| `OpenTripBidDialog` 분리    | ✅ 완료 | 오케스트레이터 ~193줄 + `components/openTripBid/*`, `lib/openTripBidForm.ts`                           |
| `tripGroups`                | ✅ 완료 | 프론트·서버 공통 `server/src/utils/tripGroupsCore.ts` re-export                                        |
| `lib/adminApi.ts`           | ✅ 완료 | `adminAPI` re-export (선택 import 경로)                                                                |
| 관리자 공통 UX              | ✅ 완료 | `AdminErrorBanner`, `AdminLoadingSkeleton`, `AdminAsyncContent`, `AdminDeepLink`                       |
| 관리자 감사 로그            | ✅ 완료 | `AdminAuditLog` + `recordAdminAudit`, `GET /admin/audit-log`(Super/Operations), `AdminAuditLogPanel`   |
| 관리자 RBAC (전체)          | 🔲 예정 | 매출·감사로그 등 일부 라우트만 `requireAdminRole` 적용; 전체 서브롤 권한 분리는 아직 아님                |

### Dashboard `page.tsx` (Before → After)

| 역할      | 경로                               | 이전 (대략) | 현재                                       |
| --------- | ---------------------------------- | ----------- | ------------------------------------------ |
| Driver    | `app/dashboard/driver/page.tsx`    | ~1,500+ 줄  | **12줄** (Provider 래퍼만)                 |
| Company   | `app/dashboard/company/page.tsx`   | ~1,300+ 줄  | **12줄**                                   |
| Passenger | `app/dashboard/passenger/page.tsx` | ~670+ 줄    | **12줄**                                   |
| Admin     | `app/admin/page.tsx`               | —           | 탭·패널 조립 + 초기 스켈레톤·`globalError` |

로직·상태는 각 `hooks/use*Dashboard.tsx`와 `components/*/*DashboardContent.tsx`로 이동했습니다.

## Refactoring Summary

### 패턴: Provider + Content (관리자와 동일)

```tsx
// app/dashboard/driver/page.tsx (기사·회사·승객 동일 패턴)
<DriverDashboardProvider>
    <DriverDashboardContent />
</DriverDashboardProvider>
```

- **훅**: `loadData`, 탭별 lazy reload (`contract` / `available` / `profile` 등), 메모·핸들러, 헤더·모바일 셸 상태
- **훅 파일**: `hooks/useDriverDashboard.tsx` (~522줄), `useCompanyDashboard.tsx` (~448줄), `usePassengerDashboard.tsx` (~385줄), `useAdminDashboard.tsx` (~560줄)
- **UI**: `components/driver/DriverDashboardContent.tsx`, `company/…`, `passenger/…`

### 공통 프론트 레이어

| 분류        | 경로                                                                                                             | 용도                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 타입        | `types/dashboard.ts`, `trip.ts`, `passenger.ts`, `bidderProfile.ts`, `openTripBid.ts`, `admin.ts`                | 대시보드·입찰·프로필 타입 통합                          |
| 유틸        | `lib/errors.ts` (`getErrorMessage`), `lib/bidderProfile.ts`, `lib/openTripBidForm.ts`                            | 에러 메시지·프로필·입찰 폼 조립                         |
| API         | `lib/api.ts`, `lib/adminApi.ts`                                                                                  | 클라이언트 API (`adminAPI` re-export)                   |
| 여정 그룹   | `lib/tripGroups.ts` → `tripGroupsCore`                                                                           | 왕복·표시 그룹핑 (서버와 공유)                          |
| 입찰자 UI   | `components/bidder/*`, `components/contracts/BidderAwardedTripsList.tsx`, `components/trips/AwardedTripCard.tsx` | 프로필·낙찰 목록·카드                                   |
| 레이아웃    | `components/layout/DashboardMobileShell.tsx`                                                                     | 모바일 하단 탭·헤더 셸                                  |
| 승객 Dialog | `components/passenger/dialogs/`                                                                                  | `PassengerCancelTripDialog`, `PassengerEditTripDialog`, `PassengerBidDetailDialog` |
| 입찰 Dialog | `components/OpenTripBidDialog.tsx` + `components/openTripBid/*`                                                  | 수수료 단계·여정 요약·폼 본문 분리                      |

### `OpenTripBidDialog` 분리 (~951줄 → ~193줄)

| 파일                                            | 역할                                                    |
| ----------------------------------------------- | ------------------------------------------------------- |
| `OpenTripBidDialog.tsx`                         | 단계 조립·submit 오케스트레이션                         |
| `openTripBid/OpenTripBidFeeStep.tsx`            | 수수료 안내                                             |
| `openTripBid/OpenTripBidTripSummarySection.tsx` | 여정 요약                                               |
| `openTripBid/OpenTripBidFormBody.tsx`           | 가격·차량·부대비용·메시지·부가서비스                    |
| `lib/openTripBidForm.ts`                        | `BidProfileForm`, `assembleBidNote`, 부가서비스 행 정의 |

### 로컬 확인 (수동)

`npm run dev:all` 실행 후:

1. 기사 / 회사 / 승객 — 탭 전환, 프로필 저장, 계약·입찰 탭 lazy load
2. 승객 — 견적 취소 Dialog, 입찰 상세, 낙찰·리뷰
3. 기사 / 회사 — `OpenTripBidDialog` (수수료 → 폼 → 제출)
4. 관리자 — 사용자·입찰·인증 패널

## Project Structure

```
goodbus/
├── app/
│   ├── dashboard/              # 역할별 대시보드 (page = Provider 래퍼만)
│   │   ├── driver/page.tsx
│   │   ├── company/page.tsx
│   │   └── passenger/page.tsx
│   ├── admin/page.tsx          # 관리자 (탭 + panels 조립)
│   ├── login/
│   ├── signup/
│   └── page.tsx
├── components/
│   ├── ui/                     # shadcn/ui
│   ├── admin/                  # AdminShell, panels/, shared UX
│   │   ├── panels/             # Overview, Users, Bids, Revenue, FAQ, …
│   │   ├── adminNav.ts         # Tab titles, visibility, URL query helpers
│   │   ├── AdminErrorBanner.tsx
│   │   ├── AdminLoadingSkeleton.tsx
│   │   ├── AdminAsyncContent.tsx
│   │   └── AdminDeepLink.tsx
│   ├── bidder/                 # 프로필·입찰 상세 오버레이
│   ├── driver/                 # DriverDashboardContent
│   ├── company/                # CompanyDashboardContent
│   ├── passenger/              # PassengerDashboardContent, dialogs/
│   ├── openTripBid/            # 입찰 Dialog 섹션
│   ├── trips/                  # AwardedTripCard 등
│   ├── contracts/              # BidderAwardedTripsList
│   └── layout/                 # DashboardMobileShell
├── hooks/
│   ├── useAdminDashboard.tsx
│   ├── useDriverDashboard.tsx
│   ├── useCompanyDashboard.tsx
│   ├── usePassengerDashboard.tsx
│   └── useBidderProfile.ts
├── types/                      # dashboard, trip, passenger, …
├── lib/
│   ├── api.ts
│   ├── adminApi.ts             # adminAPI re-export
│   ├── errors.ts
│   ├── adminNav.ts             # Admin deep-link query builder
│   ├── adminRevenueDisplay.ts  # formatManWon, CSV helpers
│   ├── adminStatusLabels.ts    # Korean trip/bid/verification labels
│   ├── exportRevenueCsv.ts
│   ├── openTripBidForm.ts
│   ├── tripGroups.ts           # → server tripGroupsCore
│   └── …
├── server/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── types/
│   │   └── utils/
│   │       ├── tripGroupsCore.ts
│   │       ├── adminRevenue.ts
│   │       ├── adminOverview.ts
│   │       ├── adminUserStats.ts
│   │       └── adminSupportInquiryList.ts
│   ├── prisma/
│   └── docker-compose.yml
└── README.md
```

## Security

- Passwords are hashed with bcrypt
- JWT tokens stored in HttpOnly cookies
- CORS enabled for frontend origin only
- Role-based authorization on all protected routes
- SQL injection prevented with Prisma
