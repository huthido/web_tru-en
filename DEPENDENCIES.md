# Dependencies Overview

## Root Dependencies

```json
{
  "devDependencies": {
    "prettier": "^3.2.5",
    "typescript": "^5.3.3"
  }
}
```

## Backend Dependencies (`apps/backend`)

### Production

```json
{
  "@nestjs/common": "^10.3.0",
  "@nestjs/core": "^10.3.0",
  "@nestjs/platform-express": "^10.3.0",
  "@nestjs/config": "^3.1.1",           // Environment configuration
  "@nestjs/jwt": "^10.2.0",            // JWT authentication
  "@nestjs/passport": "^10.0.3",        // Passport integration
  "@nestjs/throttler": "^5.1.1",        // Rate limiting
  "@prisma/client": "^5.9.1",           // Prisma ORM client
  "passport": "^0.7.0",                 // Authentication
  "passport-jwt": "^4.0.1",             // JWT strategy
  "class-validator": "^0.14.0",         // DTO validation
  "class-transformer": "^0.5.1",       // Object transformation
  "helmet": "^7.1.0",                   // Security headers
  "cloudinary": "^1.41.3",               // Image storage
  "reflect-metadata": "^0.1.13",        // Decorators
  "rxjs": "^7.8.1"                      // Reactive programming
}
```

### Development

```json
{
  "@nestjs/cli": "^10.2.1",
  "@nestjs/schematics": "^10.0.3",
  "@nestjs/testing": "^10.3.0",
  "prisma": "^5.9.1",                   // Prisma CLI
  "typescript": "^5.3.3",
  "ts-jest": "^29.1.1",
  "jest": "^29.7.0",
  "eslint": "^8.56.0",
  "@typescript-eslint/eslint-plugin": "^6.19.0",
  "@typescript-eslint/parser": "^6.19.0",
  "prettier": "^3.2.5"
}
```

## Frontend Dependencies (`apps/frontend`)

### Production

```json
{
  "next": "^14.1.0",                     // Next.js framework
  "react": "^18.2.0",                    // React library
  "react-dom": "^18.2.0",                // React DOM
  "axios": "^1.6.5",                     // HTTP client
  "zustand": "^4.4.7",                   // State management (optional)
  "classnames": "^2.3.2"                 // CSS class utilities
}
```

### Development

```json
{
  "typescript": "^5.3.3",
  "tailwindcss": "^3.4.1",               // Utility-first CSS
  "postcss": "^8.4.35",                  // CSS processing
  "autoprefixer": "^10.4.17",            // CSS vendor prefixes
  "eslint": "^8.56.0",
  "eslint-config-next": "^14.1.0",
  "prettier": "^3.2.5",
  "prettier-plugin-tailwindcss": "^0.5.11"
}
```

## Shared Package Dependencies (`packages/shared`)

### Development Only

```json
{
  "typescript": "^5.3.3"
}
```

## Dependency Rationale

### Backend

- **NestJS**: Enterprise-grade Node.js framework
- **Prisma**: Type-safe ORM with excellent DX
- **Helmet**: Essential security headers
- **class-validator**: Runtime validation for DTOs
- **@nestjs/throttler**: Built-in rate limiting
- **Cloudinary**: Professional image hosting

### Frontend

- **Next.js 14+**: Latest App Router for optimal performance
- **Tailwind CSS**: Highly customizable, performant CSS
- **Axios**: Reliable HTTP client with interceptors
- **Zustand**: Lightweight state management (optional, ready for use)

### Why These Choices?

1. **Type Safety**: TypeScript + Prisma + shared types
2. **Security**: Helmet, CORS, rate limiting, validation
3. **Performance**: Next.js RSC, Tailwind purging, Prisma pooling
4. **Developer Experience**: Excellent tooling, clear structure
5. **Scalability**: Module-based, stateless, environment-based

## Version Strategy

- **Major versions**: Tested and stable
- **Minor versions**: Latest stable
- **Security**: Regular updates recommended

## Bundle Size Considerations

### Backend
- Server-side, bundle size not critical
- Tree-shaking enabled

### Frontend
- **Next.js**: Automatic code splitting
- **Tailwind**: Purges unused CSS
- **Axios**: Small footprint
- Total initial bundle: ~150KB (estimated)

## Future Dependencies (Not Installed)

### Potential Additions

- **Redis**: Caching layer
- **Elasticsearch**: Search functionality
- **Socket.io**: Real-time features
- **Bull**: Job queue
- **Winston**: Logging
- **Swagger**: API documentation

### When to Add

- Add only when feature requires it
- Evaluate bundle size impact
- Consider alternatives

