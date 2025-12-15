# Architecture Documentation

## Monorepo Structure

```
web-truyen-tien-hung/
├── apps/
│   ├── backend/              # NestJS API Server
│   │   ├── src/
│   │   │   ├── auth/         # Authentication module (empty)
│   │   │   ├── users/        # User management (empty)
│   │   │   ├── stories/      # Story management (empty)
│   │   │   ├── chapters/     # Chapter management (empty)
│   │   │   ├── comments/     # Comments (empty)
│   │   │   ├── follows/      # Follow system (empty)
│   │   │   ├── categories/   # Categories (empty)
│   │   │   ├── admin/        # Admin operations (empty)
│   │   │   ├── statistics/   # Analytics (empty)
│   │   │   ├── cloudinary/   # Cloudinary config
│   │   │   ├── prisma/       # Prisma service
│   │   │   ├── common/       # Shared utilities
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   │
│   └── frontend/             # Next.js App
│       ├── src/
│       │   ├── app/          # App Router pages
│       │   ├── components/   # React components
│       │   ├── contexts/     # React contexts
│       │   └── lib/          # Utilities & API client
│       └── package.json
│
├── packages/
│   └── shared/               # Shared TypeScript types
│       ├── src/
│       │   └── types/
│       └── package.json
│
├── docker-compose.yml        # PostgreSQL container
├── package.json              # Root workspace
└── README.md
```

## Backend Architecture (NestJS)

### Module Structure

Each feature module follows NestJS best practices:
- **Module**: Defines dependencies and exports
- **Controller**: Handles HTTP requests (to be implemented)
- **Service**: Business logic (to be implemented)
- **DTOs**: Data transfer objects (to be implemented)

### Security Layers

1. **Helmet**: HTTP security headers
2. **CORS**: Cross-origin resource sharing (configured)
3. **Rate Limiting**: 100 requests per minute
4. **Validation**: Global ValidationPipe with class-validator
5. **Exception Filter**: Global error handling

### Database (Prisma)

- **ORM**: Prisma for type-safe database access
- **Database**: PostgreSQL
- **Models**: 8 core models defined
- **Migrations**: Ready for schema evolution

### Configuration

- **Environment-based**: @nestjs/config
- **Global**: ConfigModule available everywhere
- **Type-safe**: Environment variables validated

## Frontend Architecture (Next.js)

### App Router Structure

```
src/app/
├── layout.tsx          # Root layout with theme provider
├── page.tsx            # Home page
├── not-found.tsx       # 404 page
└── globals.css         # Global styles
```

### Component Organization

```
src/components/
├── providers/          # Context providers
│   └── theme-provider.tsx
└── layouts/            # Layout components
    └── protected-route.tsx
```

### API Communication

- **Client**: Axios instance with interceptors
- **Base URL**: Environment-based
- **Credentials**: HTTP-only cookies ready
- **Error Handling**: Global interceptor

### Authentication Foundation

- **Context**: AuthContext for state management
- **Protected Routes**: Layout component ready
- **Cookie-based**: HTTP-only cookie structure

## Shared Package

### Purpose

- Type safety across frontend and backend
- Single source of truth for data models
- Prevents type drift

### Usage

```typescript
// Backend
import { User, Story } from '@shared/types';

// Frontend
import { User, Story } from '@shared/types';
```

## Development Tools

### Code Quality

- **ESLint**: Linting for both apps
- **Prettier**: Code formatting
- **EditorConfig**: Consistent editor settings
- **TypeScript**: Strict mode enabled

### Path Aliases

**Backend:**
- `@/*` → `src/*`
- `@shared/*` → `../../packages/shared/src/*`

**Frontend:**
- `@/*` → `src/*`
- `@shared/*` → `../../packages/shared/src/*`

## Database Schema

### Models

1. **User**: User accounts with roles
2. **Story**: Stories/manga with metadata
3. **Chapter**: Story chapters with content
4. **Comment**: Nested comments system
5. **Follow**: User follows stories
6. **Category**: Story categorization
7. **ReadingHistory**: User reading progress
8. **ViewLog**: Analytics tracking

### Design Decisions

- **CUID**: Using CUID for IDs (better than UUID for URLs)
- **Soft Deletes**: Comments support soft delete
- **Status Enums**: Type-safe status management
- **Timestamps**: Created/updated tracking

## API Design

### Response Format

```typescript
{
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}
```

### Pagination

```typescript
{
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Environment Configuration

### Backend

- Server port
- Database connection
- JWT secrets
- Cloudinary credentials
- CORS origin
- Rate limiting

### Frontend

- API URL
- App URL
- Environment mode

## Scaling Considerations

### Horizontal Scaling

- Stateless backend (JWT auth)
- Database connection pooling
- Environment-based config

### Vertical Scaling

- Module-based architecture
- Lazy loading ready
- Code splitting (Next.js)

### Team Scaling

- Clear module boundaries
- Shared types package
- Consistent tooling
- Documentation

## Security Best Practices

1. **Helmet**: Security headers
2. **CORS**: Restricted origins
3. **Rate Limiting**: DDoS protection
4. **Validation**: Input sanitization
5. **JWT**: Token-based auth (configured)
6. **HTTP-only Cookies**: XSS protection (ready)

## Performance Optimizations

### Backend

- Connection pooling (Prisma)
- Rate limiting
- Efficient queries (to be implemented)

### Frontend

- Next.js App Router (RSC)
- Tailwind CSS (purged unused CSS)
- Image optimization (Cloudinary)
- Code splitting (automatic)

## Deployment Readiness

### Production Checklist

- [ ] Environment variables set
- [ ] Database migrations run
- [ ] JWT secrets rotated
- [ ] CORS origins configured
- [ ] Rate limits adjusted
- [ ] Error logging setup
- [ ] Monitoring configured
- [ ] CI/CD pipeline

### Docker

- PostgreSQL container ready
- Easy local development
- Production-ready database setup

## Future Enhancements

### Potential Additions

- Redis for caching
- Elasticsearch for search
- WebSocket for real-time features
- GraphQL API (optional)
- Mobile app (React Native)
- Admin dashboard (separate app)

### Architecture Supports

- Microservices migration (if needed)
- Multi-tenant support
- Internationalization
- CDN integration
- Serverless functions

