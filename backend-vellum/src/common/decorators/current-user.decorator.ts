import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Rol } from '../../entities/usuario.entity';

export interface AuthUser {
  id: string;
  username: string;
  rol: Rol;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | null =>
    ctx.switchToHttp().getRequest().user ?? null,
);
