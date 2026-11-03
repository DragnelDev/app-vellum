import {
  Controller,
  Delete,
  Get,
  Global,
  HttpCode,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@Injectable()
export class NotificacionesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** Avisa a quien tenga la obra en "leyendo" o "pendiente" de su biblioteca. */
  async nuevoCapitulo(mangaId: number, numero: number) {
    await this.ds.query(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, url)
       SELECT b.usuario_id, 'nuevo_capitulo', m.titulo, 'Capítulo ' || $2::text || ' disponible',
              '/leer/' || m.slug || '/' || $2::text
         FROM biblioteca_usuario b JOIN mangas m ON m.id = b.manga_id
        WHERE b.manga_id = $1 AND b.estado IN ('leyendo', 'pendiente')`,
      [mangaId, String(numero)],
    );
  }

  /** Avisa al autor del comentario padre de que alguien le respondió. */
  async respuesta(
    comentarioPadreId: number,
    comentarioId: number,
    actor: AuthUser,
    texto: string,
  ) {
    const [p] = await this.ds.query(
      `SELECT c.usuario_id, m.slug, cap.numero
         FROM comentarios c JOIN capitulos cap ON cap.id = c.capitulo_id JOIN mangas m ON m.id = cap.manga_id
        WHERE c.id = $1`,
      [comentarioPadreId],
    );
    if (!p || p.usuario_id === actor.id) return;
    await this.ds.query(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, url) VALUES ($1, 'respuesta', $2, $3, $4)`,
      [
        p.usuario_id,
        `${actor.username} respondió a tu comentario`,
        texto.slice(0, 140),
        `/leer/${p.slug}/${parseFloat(p.numero)}#c-${comentarioId}`,
      ],
    );
  }
}

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get()
  async list(@CurrentUser() u: AuthUser, @Query('page') page = '1') {
    const p = Math.max(1, +page || 1);
    const items = await this.ds.query(
      `SELECT id, tipo, titulo, cuerpo, url, leida, creado_en AS "creadoEn"
         FROM notificaciones WHERE usuario_id = $1 ORDER BY creado_en DESC, id DESC LIMIT 30 OFFSET $2`,
      [u.id, (p - 1) * 30],
    );
    const [{ total, no_leidas }] = await this.ds.query(
      `SELECT count(*)::int AS total, count(*) FILTER (WHERE NOT leida)::int AS no_leidas FROM notificaciones WHERE usuario_id = $1`,
      [u.id],
    );
    return { items, total, noLeidas: no_leidas, page: p, pageSize: 30 };
  }

  @Get('contador')
  async contador(@CurrentUser() u: AuthUser) {
    const [{ n }] = await this.ds.query(
      `SELECT count(*)::int AS n FROM notificaciones WHERE usuario_id = $1 AND NOT leida`,
      [u.id],
    );
    return { noLeidas: n as number };
  }

  @Patch('leer-todas')
  async leerTodas(@CurrentUser() u: AuthUser) {
    await this.ds.query(
      `UPDATE notificaciones SET leida = true WHERE usuario_id = $1 AND NOT leida`,
      [u.id],
    );
    return { ok: true };
  }

  @Patch(':id/leer')
  async leer(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.ds.query(
      `UPDATE notificaciones SET leida = true WHERE id = $1 AND usuario_id = $2`,
      [id, u.id],
    );
    return { ok: true };
  }

  @Delete(':id')
  @HttpCode(204)
  async borrar(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.ds.query(
      `DELETE FROM notificaciones WHERE id = $1 AND usuario_id = $2`,
      [id, u.id],
    );
  }
}

@Global()
@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
