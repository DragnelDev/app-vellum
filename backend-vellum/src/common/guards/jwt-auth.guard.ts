import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/** Deja pasar sin token, pero si hay token válido rellena req.user. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T | null {
    return user || null;
  }
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
