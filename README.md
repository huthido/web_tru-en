# Web Truyen Tien Hung

Production-ready monorepo foundation for a story/manga reading platform.

## 🎯 Project Status

✅ **SETUP COMPLETE** - Foundation ready for feature development

This is a **configuration-only** setup. No business logic is implemented. All modules are scaffolded and ready for implementation.

## 📋 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker-compose up -d

# 3. Setup environment (copy env.example to .env in each app)
# apps/backend/env.example → apps/backend/.env
# apps/frontend/env.example → apps/frontend/.env

# 4. Run database migrations
cd apps/backend
npx prisma migrate dev

# 5. Start development servers
npm run dev:backend    # Terminal 1 - http://localhost:3001/api
npm run dev:frontend   # Terminal 2 - http://localhost:3000
```

📖 **Detailed setup**: See [QUICK_START.md](./QUICK_START.md)

## 🏗️ Architecture

### Monorepo Structure
```
apps/
├── backend/     # NestJS REST API
└── frontend/    # Next.js 14+ App Router

packages/
└── shared/      # Shared TypeScript types
```

### Tech Stack

**Backend:**
- NestJS 10+ (TypeScript)
- PostgreSQL + Prisma ORM
- Security: Helmet, CORS, Rate Limiting (100 req/min)
- JWT Authentication (configured, not implemented)
- Cloudinary (configured, not implemented)

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- **Tailwind CSS** (chosen for customization & performance)
- Axios for API communication
- Dark mode foundation

**Shared:**
- TypeScript types shared across stack

## 📦 What's Included

### Backend Modules (Empty - Ready for Implementation)
- ✅ auth - Authentication
- ✅ users - User management
- ✅ stories - Story management
- ✅ chapters - Chapter management
- ✅ comments - Comment system
- ✅ follows - Follow/unfollow
- ✅ categories - Categories
- ✅ admin - Admin operations
- ✅ statistics - Analytics

### Database Schema
- ✅ 8 models created (User, Story, Chapter, Comment, Follow, Category, ReadingHistory, ViewLog)
- ✅ Prisma configured
- ✅ Migrations ready

### Frontend Foundation
- ✅ App Router structure
- ✅ Global layout with theme provider
- ✅ API client with interceptors
- ✅ Auth context structure
- ✅ Protected route layout
- ✅ SEO metadata setup

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture documentation
- **[DEPENDENCIES.md](./DEPENDENCIES.md)** - Dependencies overview
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Complete folder structure
- **[SUMMARY.md](./SUMMARY.md)** - Setup summary

## 🛠️ Development Commands

```bash
# Development
npm run dev:backend      # Start backend (port 3001)
npm run dev:frontend     # Start frontend (port 3000)

# Building
npm run build:backend    # Build backend
npm run build:frontend   # Build frontend

# Code Quality
npm run lint             # Lint all workspaces
npm run format           # Format all code
npm run format:check     # Check formatting

# Database (in apps/backend)
npx prisma studio        # Open Prisma Studio
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma Client
```

## 🔒 Security Features

- ✅ Helmet (HTTP security headers)
- ✅ CORS (configured)
- ✅ Rate Limiting (100 requests/minute)
- ✅ Input Validation (Global ValidationPipe)
- ✅ Exception Filter (Global error handling)
- ✅ JWT Ready (configured)
- ✅ HTTP-only Cookies (structure ready)

## 🎨 UI Library Choice: Tailwind CSS

**Why Tailwind CSS over Ant Design/Material UI?**

- ✅ **Performance**: Purges unused CSS (smaller bundle)
- ✅ **Customization**: Complete control for reading platform
- ✅ **Reading UI**: Excellent typography & spacing utilities
- ✅ **Flexibility**: Can add component libraries later
- ✅ **Modern**: Industry standard, great DX
- ✅ **SEO Friendly**: No runtime CSS-in-JS overhead

## 🚀 Scaling Readiness

- ✅ **Horizontal Scaling**: Stateless backend, connection pooling
- ✅ **Team Collaboration**: Clear module boundaries, shared types
- ✅ **Production Ready**: Docker, environment config, security
- ✅ **Future Proof**: Easy to add new apps (mobile, admin panel)

## ⚠️ What's NOT Implemented

As requested, **NO business logic** is implemented:

- ❌ Controllers logic
- ❌ Services logic
- ❌ API endpoints
- ❌ UI components for features
- ❌ Authentication flow
- ❌ File upload logic
- ❌ Database relations (only models)

**Everything is scaffolded and ready for implementation!**

## 📝 Environment Variables

### Backend (`apps/backend/.env`)
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/web_truyen_db
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
# ... see apps/backend/env.example
```

### Frontend (`apps/frontend/.env`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
# ... see apps/frontend/env.example
```

## 🤝 Contributing

1. Follow the established architecture
2. Use shared types from `packages/shared`
3. Follow ESLint and Prettier rules
4. Write TypeScript with strict mode
5. Document new modules

## 📄 License

Private project - All rights reserved

---

**Status**: ✅ Foundation Complete | Ready for Feature Development

