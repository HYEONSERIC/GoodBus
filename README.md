# GoodBus - Charter Bus Bidding Platform

A full-stack web application connecting passengers with drivers and bus companies for charter bus services.

## Tech Stack

### Frontend

-   Next.js 14 (App Router)
-   TypeScript
-   Tailwind CSS
-   shadcn/ui components
-   date-fns

### Backend

-   Node.js with Express
-   TypeScript
-   PostgreSQL with Prisma ORM
-   JWT authentication
-   bcrypt for password hashing
-   Docker Compose for PostgreSQL

## Features

-   **Role-based authentication**: Passenger, Driver, or Bus Company
-   **Trip management**: Passengers can create trips
-   **Bidding system**: Drivers and bus companies can place bids on open trips
-   **Award flow**: Passengers can award trips to selected bidders
-   **Real-time updates**: Bid status tracking

## Getting Started

### Prerequisites

-   Node.js 18+
-   Docker Desktop (make sure it's running)
-   npm or yarn

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

### Running the Application

1. Start the backend server (in `server/` directory):

```bash
cd server
npm run dev
```

The server will run on http://localhost:4000

2. Start the frontend (in root directory):

```bash
npm run dev
```

The frontend will run on http://localhost:3000

## Default Test Accounts

The seed script creates three test accounts (all with password: `password123`):

-   **Passenger**: passenger@example.com
-   **Driver**: driver@example.com
-   **Bus Company**: company@example.com

## API Endpoints

### Authentication

-   `POST /auth/signup` - Create new user
-   `POST /auth/login` - Login user
-   `POST /auth/logout` - Logout user
-   `GET /auth/me` - Get current user

### Trips

-   `GET /trips` - Get all trips (optional `?status=open` filter)
-   `GET /trips/:id` - Get trip by ID
-   `POST /trips` - Create new trip (Passenger only)
-   `POST /trips/:id/award` - Award trip to bid (Passenger only)

### Bids

-   `POST /bids` - Create new bid (Driver/Company only)
-   `PATCH /bids/:id/withdraw` - Withdraw bid (bid owner only)

## Scripts

### Frontend

-   `npm run dev` - Start development server
-   `npm run build` - Build for production
-   `npm run start` - Start production server
-   `npm run lint` - Run linter

### Backend

-   `npm run dev` - Start development server with hot reload
-   `npm run build` - Build TypeScript to JavaScript
-   `npm run start` - Start production server
-   `npm run db:push` - Push Prisma schema to database
-   `npm run db:seed` - Seed database with test data

## Project Structure

```
goodbus/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages by role
│   ├── login/
│   ├── signup/
│   └── page.tsx           # Homepage
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilities
│   └── api.ts            # API client
├── server/               # Backend Express app
│   ├── src/
│   │   ├── middleware/  # Auth middleware
│   │   ├── routes/      # API routes
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utilities
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   └── docker-compose.yml
└── README.md

```

## Security

-   Passwords are hashed with bcrypt
-   JWT tokens stored in HttpOnly cookies
-   CORS enabled for frontend origin only
-   Role-based authorization on all protected routes
-   SQL injection prevented with Prisma

## License

MIT
