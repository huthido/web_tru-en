# Quick Start Guide

## Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose
- npm >= 9.0.0

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

Verify it's running:
```bash
docker ps
```

### 3. Configure Environment Variables

**Backend:**
```bash
cd apps/backend
cp env.example .env
# Edit .env with your values
```

**Frontend:**
```bash
cd apps/frontend
cp env.example .env
# Edit .env with your values
```

### 4. Setup Database

```bash
cd apps/backend
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```
Backend runs on: http://localhost:3001/api

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```
Frontend runs on: http://localhost:3000

## Verify Setup

1. **Backend**: Visit http://localhost:3001/api (should return 404 or error, but server is running)
2. **Frontend**: Visit http://localhost:3000 (should show homepage)
3. **Database**: Run `npx prisma studio` in `apps/backend` to view database

## Common Commands

```bash
# Install dependencies
npm install

# Start backend
npm run dev:backend

# Start frontend
npm run dev:frontend

# Lint all projects
npm run lint

# Format code
npm run format

# Database
cd apps/backend
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev     # Run migrations
npx prisma generate        # Generate Prisma Client
```

## Troubleshooting

### Port Already in Use

- Backend (3001): Change `PORT` in `apps/backend/.env`
- Frontend (3000): Change port in `apps/frontend/package.json` dev script
- PostgreSQL (5432): Change `POSTGRES_PORT` in `docker-compose.yml`

### Database Connection Error

1. Check PostgreSQL is running: `docker ps`
2. Verify `DATABASE_URL` in `apps/backend/.env`
3. Check Docker logs: `docker-compose logs postgres`

### Module Not Found

1. Run `npm install` in root
2. Delete `node_modules` and reinstall
3. Check workspace configuration in root `package.json`

## Next Steps

1. Review `SETUP.md` for detailed setup
2. Read `ARCHITECTURE.md` for architecture overview
3. Check `DEPENDENCIES.md` for dependency information
4. Start implementing features in empty modules!

