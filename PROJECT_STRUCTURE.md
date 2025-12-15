# Project Structure

## Complete Folder Tree

```
web-truyen-tien-hung/
├── .husky/                          # Git hooks (optional)
│   └── README.md
│
├── apps/
│   ├── backend/                      # NestJS Backend
│   │   ├── prisma/
│   │   │   └── schema.prisma        # Database schema
│   │   ├── src/
│   │   │   ├── admin/               # Admin module (empty)
│   │   │   │   └── admin.module.ts
│   │   │   ├── auth/                # Auth module (empty)
│   │   │   │   └── auth.module.ts
│   │   │   ├── categories/          # Categories module (empty)
│   │   │   │   └── categories.module.ts
│   │   │   ├── chapters/            # Chapters module (empty)
│   │   │   │   └── chapters.module.ts
│   │   │   ├── cloudinary/          # Cloudinary config
│   │   │   │   ├── cloudinary.module.ts
│   │   │   │   └── cloudinary.service.ts
│   │   │   ├── comments/            # Comments module (empty)
│   │   │   │   └── comments.module.ts
│   │   │   ├── common/              # Shared utilities
│   │   │   │   ├── filters/
│   │   │   │   │   └── all-exceptions.filter.ts
│   │   │   │   └── interfaces/
│   │   │   │       └── api-response.interface.ts
│   │   │   ├── follows/             # Follows module (empty)
│   │   │   │   └── follows.module.ts
│   │   │   ├── prisma/              # Prisma service
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── statistics/          # Statistics module (empty)
│   │   │   │   └── statistics.module.ts
│   │   │   ├── stories/             # Stories module (empty)
│   │   │   │   └── stories.module.ts
│   │   │   ├── users/               # Users module (empty)
│   │   │   │   └── users.module.ts
│   │   │   ├── app.module.ts        # Root module
│   │   │   └── main.ts              # Application entry
│   │   ├── .eslintrc.js
│   │   ├── env.example              # Environment template
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                     # Next.js Frontend
│       ├── src/
│       │   ├── app/                 # App Router
│       │   │   ├── globals.css      # Global styles
│       │   │   ├── layout.tsx       # Root layout
│       │   │   ├── page.tsx         # Home page
│       │   │   └── not-found.tsx    # 404 page
│       │   ├── components/          # React components
│       │   │   ├── layouts/
│       │   │   │   └── protected-route.tsx
│       │   │   └── providers/
│       │   │       └── theme-provider.tsx
│       │   ├── contexts/            # React contexts
│       │   │   └── auth-context.tsx
│       │   └── lib/                 # Utilities
│       │       └── api/
│       │           └── client.ts    # Axios client
│       ├── .eslintrc.json
│       ├── .prettierrc
│       ├── env.example              # Environment template
│       ├── next.config.js
│       ├── next-env.d.ts
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # Shared TypeScript types
│       ├── src/
│       │   ├── types/
│       │   │   └── index.ts         # Type definitions
│       │   └── index.ts             # Package entry
│       ├── package.json
│       └── tsconfig.json
│
├── .editorconfig                     # Editor configuration
├── .gitignore                        # Git ignore rules
├── .prettierrc                       # Prettier config
├── .prettierignore                   # Prettier ignore
├── docker-compose.yml                # PostgreSQL container
├── package.json                      # Root workspace
├── README.md                         # Project README
├── SETUP.md                          # Setup guide
├── ARCHITECTURE.md                   # Architecture docs
├── DEPENDENCIES.md                   # Dependencies overview
├── PROJECT_STRUCTURE.md              # This file
└── tsconfig.json                     # Root TypeScript config
```

## Key Files

### Root Level
- `package.json` - Workspace configuration
- `docker-compose.yml` - PostgreSQL setup
- `.prettierrc` - Code formatting
- `.editorconfig` - Editor settings
- `.gitignore` - Git ignore rules

### Backend (`apps/backend`)
- `src/main.ts` - Application bootstrap
- `src/app.module.ts` - Root module
- `prisma/schema.prisma` - Database schema
- `env.example` - Environment variables template

### Frontend (`apps/frontend`)
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Home page
- `src/lib/api/client.ts` - API client
- `src/contexts/auth-context.tsx` - Auth context
- `env.example` - Environment variables template

### Shared (`packages/shared`)
- `src/types/index.ts` - Shared type definitions

## Module Organization

### Backend Modules (All Empty - Ready for Implementation)

1. **auth** - Authentication & authorization
2. **users** - User management
3. **stories** - Story/manga management
4. **chapters** - Chapter management
5. **comments** - Comment system
6. **follows** - Follow/unfollow stories
7. **categories** - Category management
8. **admin** - Admin operations
9. **statistics** - Analytics & statistics

### Frontend Structure

- **app/** - Next.js App Router pages
- **components/** - Reusable React components
- **contexts/** - React context providers
- **lib/** - Utilities and API client

## Configuration Files

### TypeScript
- Root `tsconfig.json` - Base configuration
- `apps/backend/tsconfig.json` - Backend config
- `apps/frontend/tsconfig.json` - Frontend config
- `packages/shared/tsconfig.json` - Shared config

### Linting & Formatting
- `apps/backend/.eslintrc.js` - Backend ESLint
- `apps/frontend/.eslintrc.json` - Frontend ESLint
- `.prettierrc` - Prettier config (root)
- `apps/frontend/.prettierrc` - Frontend Prettier

### Build Tools
- `apps/backend/nest-cli.json` - NestJS CLI config
- `apps/frontend/next.config.js` - Next.js config
- `apps/frontend/tailwind.config.ts` - Tailwind config
- `apps/frontend/postcss.config.js` - PostCSS config

## Environment Files

- `apps/backend/env.example` - Backend env template
- `apps/frontend/env.example` - Frontend env template
- Copy to `.env` in each app directory

## Documentation

- `README.md` - Project overview
- `SETUP.md` - Setup instructions
- `ARCHITECTURE.md` - Architecture details
- `DEPENDENCIES.md` - Dependencies overview
- `PROJECT_STRUCTURE.md` - This file

