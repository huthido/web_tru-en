import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, still try to parse token but don't require it
      // This allows @CurrentUser() to work even on public routes
      // Wrap in try-catch to handle token errors gracefully
      try {
        const result = super.canActivate(context);
        if (result instanceof Promise) {
          return result.catch(() => true); // Allow access even if token is invalid
        }
        return result;
      } catch {
        return true; // Allow access even if token parsing fails
      }
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // For public routes, don't throw error if token is missing or invalid
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Return user if token is valid, or undefined if not (don't throw error)
      if (err || !user) {
        return undefined; // No error, just return undefined
      }
      return user;
    }

    // For protected routes, use default behavior (throw error if no user)
    return super.handleRequest(err, user, info, context);
  }
}

