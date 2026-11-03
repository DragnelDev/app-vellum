import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: ConfigService,
    private readonly usuarios: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** Se consulta la BD para que cambios de rol / bloqueos surtan efecto de inmediato. */
  async validate(payload: { sub: string }): Promise<AuthUser> {
    const u = await this.usuarios.findById(payload.sub);
    if (!u || !u.activo) throw new UnauthorizedException();
    return { id: u.id, username: u.username, rol: u.rol };
  }
}
