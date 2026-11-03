import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Rol, Usuario } from '../../entities';

export const publicUser = (u: Usuario) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  avatarUrl: u.avatarUrl,
  rol: u.rol,
});

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  /** Incluye passwordHash (select:false por defecto). */
  findForLogin(identificador: string) {
    const id = identificador.trim().toLowerCase();
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('lower(u.email) = :id OR lower(u.username) = :id', { id })
      .getOne();
  }

  async create(data: {
    username: string;
    email: string;
    passwordHash: string;
    rol?: Rol;
  }) {
    const email = data.email.trim().toLowerCase();
    const exists = await this.repo
      .createQueryBuilder('u')
      .where(
        'lower(u.email) = :email OR lower(u.username) = lower(:username)',
        {
          email,
          username: data.username,
        },
      )
      .getExists();
    if (exists)
      throw new ConflictException(
        'El usuario o el correo ya están registrados',
      );
    return this.repo.save(
      this.repo.create({ ...data, email, rol: data.rol ?? 'lector' }),
    );
  }

  async list(page = 1, limit = 50, q?: string) {
    const qb = this.repo.createQueryBuilder('u').orderBy('u.creadoEn', 'DESC');
    if (q) qb.where('u.username ILIKE :q OR u.email ILIKE :q', { q: `%${q}%` });
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items: items.map((u) => ({
        ...publicUser(u),
        activo: u.activo,
        creadoEn: u.creadoEn,
      })),
      total,
      page,
      limit,
    };
  }

  async setRol(id: string, rol: Rol) {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException('Usuario no encontrado');
    u.rol = rol;
    return publicUser(await this.repo.save(u));
  }

  async setAvatar(id: string, url: string) {
    await this.repo.update(id, { avatarUrl: url });
    return publicUser((await this.findById(id))!);
  }

  async setActivo(id: string, activo: boolean) {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException('Usuario no encontrado');
    u.activo = activo;
    return { ...publicUser(await this.repo.save(u)), activo };
  }

  /** Cambio de contraseña (exige la actual). */
  async cambiarPassword(id: string, actual: string, nueva: string) {
    const u = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
    if (!u || !(await bcrypt.compare(actual, u.passwordHash)))
      throw new UnauthorizedException('La contraseña actual no es correcta');
    await this.repo.update(id, { passwordHash: await bcrypt.hash(nueva, 12) });
    return { ok: true };
  }

  async cambiarEmail(id: string, email: string, password: string) {
    const u = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
    if (!u || !(await bcrypt.compare(password, u.passwordHash)))
      throw new UnauthorizedException('Contraseña incorrecta');
    const e = email.trim().toLowerCase();
    if (
      await this.repo
        .createQueryBuilder('x')
        .where('lower(x.email) = :e AND x.id <> :id', { e, id })
        .getExists()
    ) {
      throw new ConflictException('Ese correo ya está en uso');
    }
    await this.repo.update(id, { email: e });
    return publicUser((await this.findById(id))!);
  }

  async historial(userId: string, page: number) {
    const limit = 20;
    const items = await this.ds.query(
      `SELECT m.id AS "mangaId", m.titulo, m.slug, m.portada_url AS "portadaUrl", m.tipo,
              c.numero, h.pagina, h.actualizado_en AS "actualizadoEn"
         FROM historial_lectura h JOIN mangas m ON m.id = h.manga_id JOIN capitulos c ON c.id = h.capitulo_id
        WHERE h.usuario_id = $1 ORDER BY h.actualizado_en DESC LIMIT $2 OFFSET $3`,
      [userId, limit, (page - 1) * limit],
    );
    const [{ n }] = await this.ds.query(
      'SELECT count(*)::int AS n FROM historial_lectura WHERE usuario_id = $1',
      [userId],
    );
    return {
      items: items.map((i: any) => ({ ...i, numero: parseFloat(i.numero) })),
      total: n as number,
      page,
      limit,
    };
  }

  async borrarHistorial(userId: string, mangaId?: number) {
    if (mangaId)
      await this.ds.query(
        'DELETE FROM historial_lectura WHERE usuario_id = $1 AND manga_id = $2',
        [userId, mangaId],
      );
    else
      await this.ds.query(
        'DELETE FROM historial_lectura WHERE usuario_id = $1',
        [userId],
      );
    return { ok: true };
  }
}
