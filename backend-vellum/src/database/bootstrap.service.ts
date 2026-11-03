import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Genero, Usuario } from '../entities';
import { slugify } from '../common/utils/slug';

const GENEROS = [
  'Acción',
  'Aventura',
  'Comedia',
  'Drama',
  'Fantasía',
  'Romance',
  'Ciencia ficción',
  'Terror',
  'Misterio',
  'Slice of life',
  'Deportes',
  'Sobrenatural',
  'Isekai',
  'Artes marciales',
  'Escolar',
  'Psicológico',
  'Histórico',
  'Seinen',
  'Shonen',
  'Shojo',
];

/** Índices avanzados, géneros base y usuario administrador inicial. Idempotente. */
@Injectable()
export class DatabaseBootstrapService implements OnApplicationBootstrap {
  private readonly log = new Logger('DB');
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly cfg: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.extras();
    await this.seedGeneros();
    await this.seedAdmin();
    await this.cleanup();
  }

  /** Mantenimiento ligero al arrancar: notificaciones leídas antiguas y tokens caducados. */
  private async cleanup() {
    try {
      await this.ds.query(
        "DELETE FROM notificaciones WHERE leida AND creado_en < now() - interval '60 days'",
      );
      await this.ds.query(
        'DELETE FROM password_resets WHERE expira_en < now() OR usado',
      );
      await this.ds.query(
        'DELETE FROM vistas_diarias WHERE dia < CURRENT_DATE - 120',
      );
    } catch (e) {
      this.log.warn(`Limpieza omitida: ${(e as Error).message}`);
    }
  }

  private async extras() {
    try {
      await this.ds.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      // Búsqueda ILIKE '%texto%' en tiempo real sin escaneo secuencial
      await this.ds.query(
        'CREATE INDEX IF NOT EXISTS idx_mangas_titulo_trgm ON mangas USING gin (titulo gin_trgm_ops)',
      );
      await this.ds.query(
        'CREATE INDEX IF NOT EXISTS idx_mangas_titulo_alt_trgm ON mangas USING gin (titulo_alternativo gin_trgm_ops)',
      );
      await this.ds.query(
        'CREATE INDEX IF NOT EXISTS idx_manga_generos_genero ON manga_generos (genero_id, manga_id)',
      );
      await this.ds.query(
        'CREATE INDEX IF NOT EXISTS idx_capitulos_manga_numero_desc ON capitulos (manga_id, numero DESC)',
      );
      await this.ds.query(
        'CREATE INDEX IF NOT EXISTS idx_reacciones_comentarios_comentario ON reacciones_comentarios (comentario_id)',
      );
      await this.ds.query(
        'CREATE INDEX IF NOT EXISTS idx_comentario_multimedia_comentario ON comentario_multimedia (comentario_id)',
      );
    } catch (e) {
      this.log.warn(
        `No se pudieron crear índices avanzados (¿permisos pg_trgm?): ${(e as Error).message}`,
      );
    }
  }

  private async seedGeneros() {
    const repo = this.ds.getRepository(Genero);
    if (await repo.count()) return;
    await repo.insert(
      GENEROS.map((nombre) => ({ nombre, slug: slugify(nombre) })),
    );
    this.log.log(`Géneros base creados (${GENEROS.length})`);
  }

  private async seedAdmin() {
    const email = this.cfg.get<string>('ADMIN_EMAIL');
    const password = this.cfg.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;
    const repo = this.ds.getRepository(Usuario);
    const existing = await repo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      if (existing.rol !== 'admin') {
        existing.rol = 'admin';
        await repo.save(existing);
        this.log.log(`Rol de administrador asignado: ${email}`);
      }
      return;
    }
    await repo.save(
      repo.create({
        email: email.toLowerCase(),
        username: this.cfg.get('ADMIN_USERNAME', 'admin'),
        passwordHash: await bcrypt.hash(password, 12),
        rol: 'admin',
      }),
    );
    this.log.log(`Administrador inicial creado: ${email}`);
  }
}
