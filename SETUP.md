# Project Setup Guide

## Architecture Overview

This is a **monorepo** structure designed for scalability and team collaboration:

```
├── apps/
│   ├── backend/          # NestJS REST API
│   └── frontend/         # Next.js 14+ App Router
├── packages/
│   └── shared/           # Shared TypeScript types
└── docker-compose.yml    # PostgreSQL container
```

### Why This Architecture?

1. **Separation of Concerns**: Frontend and backend are completely independent
2. **Shared Types**: Type safety across the entire stack via shared package
3. **Scalability**: Easy to add new apps (mobile, admin panel, etc.)
4. **Team Collaboration**: Different teams can work on different apps
5. **Single Source of Truth**: Shared types ensure consistency

## UI Library Choice: Tailwind CSS

### Comparison

**Ant Design:**
- ✅ Production-ready components
- ✅ Rich component library
- ❌ Heavy bundle size
- ❌ Less customizable for reading-heavy UI
- ❌ Opinionated design system

**Material UI:**
- ✅ Comprehensive component library
- ✅ Good documentation
- ❌ Large bundle size
- ❌ Material Design may not fit reading platform aesthetic
- ❌ Complex theming for custom designs

**Tailwind CSS + shadcn/ui:**
- ✅ Highly customizable
- ✅ Small bundle size (purges unused CSS)
- ✅ Perfect for reading-heavy UI (typography, spacing)
- ✅ Works excellently with Next.js
- ✅ Can build custom components easily
- ✅ Great for both reading UI and admin dashboards
- ✅ Modern, widely adopted

### Decision: **Tailwind CSS**

**Why:**
- **Performance**: Only includes CSS you use
- **Customization**: Complete control over design
- **Reading Platform**: Excellent typography and spacing utilities
- **Flexibility**: Can add component libraries later if needed
- **Developer Experience**: Intuitive utility classes
- **SEO Friendly**: No runtime CSS-in-JS overhead

## Tech Stack Details

### Backend (NestJS)

**Core:**
- NestJS 10+ with TypeScript
- PostgreSQL via Prisma ORM
- REST API architecture

**Security:**
- Helmet for HTTP headers
- CORS configured
- Rate limiting (100 req/min)
- Global validation pipe
- Exception filter

**Authentication:**
- JWT configured (not implemented)
- Passport.js ready

**Storage:**
- Cloudinary configured (not implemented)

**Modules Created (Empty):**
- `auth` - Authentication
- `users` - User management
- `stories` - Story management
- `chapters` - Chapter management
- `comments` - Comment system
- `follows` - Follow/unfollow stories
- `categories` - Story categories
- `admin` - Admin operations
- `statistics` - Analytics

### Frontend (Next.js)

**Core:**
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS

**Features:**
- Dark mode foundation
- Responsive layout
- SEO metadata setup
- API client with interceptors
- Auth context structure
- Protected route layout

**Structure:**
```
src/
├── app/              # App Router pages
├── components/       # React components
├── contexts/         # React contexts
├── lib/             # Utilities & API client
└── types/           # TypeScript types (if needed)
```

### Shared Package

- TypeScript types shared between frontend and backend
- Ensures type safety across the stack
- Single source of truth for data models

## Environment Variables

### Backend (`apps/backend/env.example`)

```env
# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/web_truyen_db?schema=public

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend (`apps/frontend/env.example`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Docker (`docker-compose.yml`)

```env
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=web_truyen_db
POSTGRES_PORT=5432
```

## Prisma Schema

Models created (no relations yet):
- `User` - User accounts
- `Story` - Stories/manga
- `Chapter` - Story chapters
- `Comment` - Comments on stories/chapters
- `Follow` - User follows stories
- `Category` - Story categories
- `ReadingHistory` - User reading progress
- `ViewLog` - Analytics tracking

## Scaling Readiness

### Current Setup Supports:

1. **Horizontal Scaling:**
   - Stateless backend (JWT auth)
   - Database connection pooling (Prisma)
   - Environment-based configuration

2. **Team Collaboration:**
   - Monorepo structure
   - Shared types package
   - Consistent tooling (ESLint, Prettier)
   - Clear module separation

3. **Production Deployment:**
   - Docker for database
   - Environment variables
   - Security middleware
   - Error handling
   - API response standardization

4. **Future Additions:**
   - Easy to add new apps (mobile, admin)
   - Module-based architecture
   - Shared types ensure consistency

## Development Workflow

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

3. **Setup environment:**
   - Copy `env.example` to `.env` in both apps
   - Fill in required values

4. **Run Prisma migrations:**
   ```bash
   cd apps/backend
   npx prisma migrate dev
   ```

5. **Start dev servers:**
   ```bash
   # Terminal 1
   npm run dev:backend

   # Terminal 2
   npm run dev:frontend
   ```

## Next Steps (Not Implemented)

- Business logic implementation
- API endpoints
- UI components for features
- Authentication flow
- File upload logic
- Database relations

All scaffolding is ready for feature development!

