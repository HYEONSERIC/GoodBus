# GoodBus - Project Summary

## ✅ What Was Built

A full-stack charter bus bidding platform with role-based access control and admin tooling.

### Backend (Express + TypeScript)

-   **Location**: `/server`
-   **Database**: PostgreSQL with Prisma ORM
-   **Authentication**: JWT tokens in HttpOnly cookies, bcrypt password hashing
-   **API Routes**:
    -   `/auth` - signup, login, logout, get current user
    -   `/trips` - create, list, get by ID, award trips
    -   `/bids` - create bids, withdraw bids
-   `/admin` - overview stats, user list, block/unblock, user activity, admin creation
-   **Security**: Role-based middleware, CORS configuration
-   **Docker**: PostgreSQL container with docker-compose

### Frontend (Next.js 16 + TypeScript)

-   **Location**: Root directory
-   **UI**: Tailwind CSS + shadcn/ui components
-   **Pages**:
    -   Home (`/`) - Landing page
    -   Login (`/login`) - User authentication
    -   Signup (`/signup`) - User registration with role selection
    -   Dashboard (`/dashboard`) - Role-based redirect
    -   Passenger Dashboard (`/dashboard/passenger`) - Create trips, view bids, award trips + Kakao autocomplete
    -   Driver Dashboard (`/dashboard/driver`) - Browse trips, place bids
    -   Company Dashboard (`/dashboard/company`) - Browse trips, place bids
    -   Admin Console (`/admin`) - Overview, users, activity, admin creation
-   **API Client**: Centralized API wrapper in `lib/api.ts`

### Features Implemented

✅ User authentication with role selection (Passenger/Driver/Bus Company)  
✅ Trip creation (Passenger only)  
✅ Browse open trips (Driver/Company)  
✅ Place bids on trips with price and notes (Driver/Company)  
✅ View bids for your trips (Passenger)  
✅ Award trip to a selected bid (Passenger only)  
✅ Bid withdrawal (bid owner only)  
✅ User status (Active/Blocked) with admin controls  
✅ Admin dashboard + user activity views  
✅ JWT-based authentication with secure cookies  
✅ Role-based authorization on all protected routes  
✅ Prisma schema with proper relationships  
✅ Database seeding with test users and sample trip  
✅ Docker Compose for PostgreSQL  
✅ Mobile-responsive UI + unified top bar/side menu/bottom tabs  
✅ ESLint + Prettier setup

## File Structure

```
goodbus/
├── app/                          # Next.js app directory
│   ├── dashboard/
│   │   ├── company/page.tsx     # Bus company dashboard
│   │   ├── driver/page.tsx      # Driver dashboard
│   │   ├── passenger/page.tsx   # Passenger dashboard
│   │   └── page.tsx             # Dashboard router
│   ├── login/page.tsx           # Login page
│   ├── signup/page.tsx          # Signup page
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage
├── components/
│   └── ui/                      # shadcn/ui components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── radio-group.tsx
│       ├── select.tsx
│       └── textarea.tsx
├── lib/
│   ├── api.ts                   # API client
│   └── utils.ts                 # Utility functions
├── server/                      # Express backend
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts         # Auth middleware
│   │   ├── routes/
│   │   │   ├── auth.ts         # Auth routes
│   │   │   ├── bids.ts         # Bid routes
│   │   │   └── trips.ts        # Trip routes
│   │   ├── types/
│   │   │   └── index.ts        # Type definitions
│   │   ├── utils/
│   │   │   ├── db.ts           # Prisma client
│   │   │   └── jwt.ts          # JWT utilities
│   │   ├── prisma/
│   │   │   └── seed.ts         # Database seed
│   │   └── index.ts            # Server entry point
│   ├── docker-compose.yml      # PostgreSQL container
│   ├── .env.example            # Environment template
│   ├── package.json            # Backend dependencies
│   └── tsconfig.json           # TypeScript config
├── README.md                    # Main documentation
├── SETUP.md                     # Quick start guide
├── .env.example                 # Frontend env template
└── package.json                # Frontend dependencies
```

## Tech Stack

### Frontend

-   **Framework**: Next.js 14 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Components**: shadcn/ui (Radix UI + Tailwind)
-   **Date Formatting**: date-fns
-   **HTTP Client**: Native Fetch API with credentials

### Backend

-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Database**: PostgreSQL 16
-   **ORM**: Prisma
-   **Authentication**: JWT + bcrypt
-   **Validation**: Zod
-   **Container**: Docker Compose
-   **Build Tool**: tsx

## Data Model

### User

-   id, email (unique), passwordHash, role (Passenger|Driver|BusCompany|Admin), status (Active|Blocked), adminRole (Super|CustomerSupport|Operations|Finance), createdAt

### Trip

-   id, passengerId, origin, destination, dateTime, paxCount, busSize (small|medium|large), status (open|awarded|cancelled), createdAt

### Bid

-   id, tripId, bidderId, price (decimal), note, status (open|withdrawn|awarded|lost), createdAt

## API Endpoints

### Authentication

-   `POST /auth/signup` - Create user account
-   `POST /auth/login` - Login user
-   `POST /auth/logout` - Logout user
-   `GET /auth/me` - Get current user

### Trips

-   `GET /trips` - List all trips (filter by status)
-   `GET /trips/:id` - Get trip details
-   `POST /trips` - Create trip (Passenger only)
-   `POST /trips/:id/award` - Award trip to bid (Passenger only)

### Bids

-   `POST /bids` - Create bid (Driver/Company only)
-   `PATCH /bids/:id/withdraw` - Withdraw bid (owner only)

## Testing with Seeded Data

The database comes pre-seeded with:

-   1 Passenger (passenger@example.com)
-   1 Driver (driver@example.com)
-   1 Bus Company (company@example.com)
-   1 Admin (admin@example.com)
-   1 Sample trip (New York → Boston)
-   All passwords: `password123`

## Security Features

-   ✅ JWT tokens in HttpOnly cookies (not accessible via JS)
-   ✅ SameSite=Lax protection against CSRF
-   ✅ Secure flag in production
-   ✅ Password hashing with bcrypt (10 rounds)
-   ✅ Role-based authorization middleware
-   ✅ CORS protection (only allows frontend origin)
-   ✅ Prisma ORM prevents SQL injection
-   ✅ Zod validation on all inputs

## Getting Started

See `SETUP.md` for detailed step-by-step instructions.

Quick commands:

```bash
# 1. Start database
cd server && docker-compose up -d

# 2. Initialize database
npm run db:push && npm run db:seed

# 3. Start backend (in server/)
npm run dev

# 4. Start frontend (in root/)
npm run dev
```

Then visit http://localhost:3000 and login with any seeded account!
