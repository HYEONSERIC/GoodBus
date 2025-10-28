# Quick Start Guide for GoodBus

## Step-by-Step Setup

### 1. Start Docker Desktop

Make sure Docker Desktop is running on your machine before proceeding.

### 2. Install Dependencies

**Frontend:**

```bash
cd goodbus
npm install
```

**Backend:**

```bash
cd server
npm install
```

### 3. Start Database

```bash
cd server
docker-compose up -d
```

Wait about 10 seconds for the database to be ready.

### 4. Initialize Database

```bash
cd server
npm run db:push
npm run db:seed
```

You should see output confirming the seed created users and a trip.

### 5. Start the Backend Server

In a terminal, run:

```bash
cd server
npm run dev
```

The server will start on http://localhost:4000

### 6. Start the Frontend

In another terminal, run:

```bash
cd goodbus
npm run dev
```

The frontend will start on http://localhost:3000

## Testing the Application

### Login with Test Accounts

All test accounts use password: `password123`

-   **Passenger**: passenger@example.com
-   **Driver**: driver@example.com
-   **Bus Company**: company@example.com

### Try It Out

1. Visit http://localhost:3000
2. Click "Sign Up" and create a new account, or login with a test account
3. As a Passenger: Create a trip, view bids, award a trip
4. As a Driver/Company: Browse open trips, place bids
5. Go back as Passenger to award your trip!

## Troubleshooting

### Database Connection Error

-   Make sure Docker is running
-   Wait a bit longer and try `npm run db:push` again
-   Check if the container is running: `docker ps`

### Port Already in Use

-   Stop any other apps using ports 3000 or 4000
-   Or change the ports in the configuration

### Module Not Found

-   Make sure you ran `npm install` in both root and server directories
-   Try deleting `node_modules` and running `npm install` again

## Stopping the Application

```bash
# Stop the database
cd server
docker-compose down

# Stop the backend (Ctrl+C in terminal)
# Stop the frontend (Ctrl+C in terminal)
```
