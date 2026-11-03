import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { MailService } from '../mail/mail.module';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService, publicUser } from '../usuarios/usuarios.service';
import { LoginDto, OlvideDto, RegistroDto, RestablecerDto } from './auth.dto';
import { Usuario } from '../../entities';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly cfg: ConfigService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  private hash = (t: string) => createHash('sha256').update(t).digest('hex');

  /** Siempre responde igual (no revela si el correo existe). */
  async olvide(dto: OlvideDto) {
    const [u] = await this.ds.query(
      'SELECT id, username FROM usuarios WHERE lower(email) = lower($1) AND activo',
      [dto.email],
    );
    if (u) {
      const token = randomBytes(32).toString('hex');
      await this.ds.query('DELETE FROM password_resets WHERE usuario_id = $1', [
        u.id,
      ]);
      await this.ds.query(
        `INSERT INTO password_resets (usuario_id, token_hash, expira_en) VALUES ($1, $2, now() + interval '1 hour')`,
        [u.id, this.hash(token)],
      );
      const base = this.cfg
        .get<string>('FRONTEND_URL', 'http://localhost:3000')
        .split(',')[0]
        .trim();
      await this.mail.send(
        dto.email,
        'Restablece tu contraseña de Vellum',
        `Hola ${u.username},\n\nPara elegir una nueva contraseña entra aquí (válido 1 hora):\n${base}/restablecer?token=${token}\n\nSi no lo pediste, ignora este mensaje.`,
      );
    }
    return { ok: true };
  }

  async restablecer(dto: RestablecerDto) {
    const [r] = await this.ds.query(
      `SELECT id, usuario_id FROM password_resets WHERE token_hash = $1 AND NOT usado AND expira_en > now()`,
      [this.hash(dto.token)],
    );
    if (!r)
      throw new BadRequestException('El enlace no es válido o ha caducado');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.ds.transaction(async (em) => {
      await em.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [
        passwordHash,
        r.usuario_id,
      ]);
      await em.query('DELETE FROM password_resets WHERE usuario_id = $1', [
        r.usuario_id,
      ]);
    });
    return { ok: true };
  }

  private session(u: Usuario) {
    return { token: this.jwt.sign({ sub: u.id }), usuario: publicUser(u) };
  }

  async registro(dto: RegistroDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const u = await this.usuarios.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
    });
    return this.session(u);
  }

  async login(dto: LoginDto) {
    const u = await this.usuarios.findForLogin(dto.identificador);
    const ok =
      u && u.activo && (await bcrypt.compare(dto.password, u.passwordHash));
    if (!ok) throw new UnauthorizedException('Credenciales incorrectas');
    return this.session(u);
  }

  async me(id: string) {
    const u = await this.usuarios.findById(id);
    if (!u) throw new UnauthorizedException();
    return publicUser(u);
  }
}
