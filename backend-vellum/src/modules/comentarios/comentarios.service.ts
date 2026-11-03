import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ComentarioMultimedia } from '../../entities';
import { StorageService } from '../storage/storage.service';
import { NotificacionesService } from '../notificaciones/notificaciones.module';
import { ModeracionService } from '../moderacion/moderacion.module';
import { CrearComentarioDto } from './comentarios.dto';

const PAGE_SIZE = 20;

interface Row {
  id: number;
  padreId: number | null;
  contenido: string;
  eliminado: boolean;
  creadoEn: Date;
  usuarioId: string;
  username: string;
  avatarUrl: string | null;
  rol: string;
  likes: number;
  meGusta: boolean;
  multimedia: any[];
}
export type ComentarioNode = Omit<Row, 'padreId'> & {
  respuestas: ComentarioNode[];
};

@Injectable()
export class ComentariosService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly storage: StorageService,
    private readonly notifs: NotificacionesService,
    private readonly moderacion: ModeracionService,
  ) {}

  async listar(
    capituloId: number,
    page = 1,
    orden = 'recientes',
    userId?: string,
  ) {
    const orderBy =
      orden === 'populares'
        ? `(SELECT count(*) FROM reacciones_comentarios r WHERE r.comentario_id = c.id) DESC, c.creado_en DESC`
        : orden === 'antiguos'
          ? 'c.creado_en ASC'
          : 'c.creado_en DESC';

    const roots: { id: number }[] = await this.ds.query(
      `SELECT c.id FROM comentarios c
        WHERE c.capitulo_id = $1 AND c.comentario_padre_id IS NULL
        ORDER BY ${orderBy}, c.id DESC LIMIT $2 OFFSET $3`,
      [capituloId, PAGE_SIZE, (page - 1) * PAGE_SIZE],
    );
    const [{ total, todos }] = await this.ds.query(
      `SELECT count(*) FILTER (WHERE comentario_padre_id IS NULL)::int AS total,
              count(*) FILTER (WHERE NOT eliminado)::int AS todos
         FROM comentarios WHERE capitulo_id = $1`,
      [capituloId],
    );
    if (!roots.length)
      return {
        items: [],
        total,
        totalComentarios: todos,
        page,
        pageSize: PAGE_SIZE,
      };

    // CTE recursivo: trae todo el árbol de respuestas de los comentarios raíz de la página
    const rows: Row[] = await this.ds.query(
      `WITH RECURSIVE tree AS (
         SELECT c.*, 0 AS depth FROM comentarios c WHERE c.id = ANY($1::int[])
         UNION ALL
         SELECT c.*, t.depth + 1 FROM comentarios c JOIN tree t ON c.comentario_padre_id = t.id WHERE t.depth < 25
       )
       SELECT t.id, t.comentario_padre_id AS "padreId", t.contenido, t.eliminado, t.creado_en AS "creadoEn",
              u.id AS "usuarioId", u.username, u.avatar_url AS "avatarUrl", u.rol,
              (SELECT count(*)::int FROM reacciones_comentarios r WHERE r.comentario_id = t.id) AS likes,
              EXISTS (SELECT 1 FROM reacciones_comentarios r
                       WHERE r.comentario_id = t.id AND r.usuario_id = $2::uuid) AS "meGusta",
              COALESCE((SELECT json_agg(json_build_object('id', m.id, 'tipo', m.tipo, 'url', m.url,
                                                           'ancho', m.ancho, 'alto', m.alto) ORDER BY m.id)
                          FROM comentario_multimedia m WHERE m.comentario_id = t.id), '[]'::json) AS multimedia
         FROM tree t JOIN usuarios u ON u.id = t.usuario_id
        ORDER BY t.creado_en ASC, t.id ASC`,
      [roots.map((r) => r.id), userId ?? null],
    );

    const nodes = new Map<number, ComentarioNode>();
    for (const r of rows) {
      const { padreId, ...rest } = r;
      nodes.set(r.id, {
        ...rest,
        contenido: r.eliminado ? '' : r.contenido,
        multimedia: r.eliminado ? [] : r.multimedia,
        respuestas: [],
      });
    }
    for (const r of rows)
      if (r.padreId && nodes.has(r.padreId))
        nodes.get(r.padreId)!.respuestas.push(nodes.get(r.id)!);
    const items = roots.map((r) => nodes.get(r.id)!).filter(Boolean);
    return { items, total, totalComentarios: todos, page, pageSize: PAGE_SIZE };
  }

  async crear(capituloId: number, user: AuthUser, dto: CrearComentarioDto) {
    const contenido = (dto.contenido ?? '').trim();
    const multimedia = dto.multimedia ?? [];
    if (!contenido && !multimedia.length)
      throw new BadRequestException('El comentario está vacío');

    const prohibida = await this.moderacion.palabraProhibida(contenido);
    if (prohibida)
      throw new BadRequestException(
        'Tu comentario contiene lenguaje no permitido',
      );

    // Solo se aceptan archivos que subimos nosotros (evita hotlinking y URLs maliciosas)
    for (const m of multimedia) {
      const key = this.storage.keyFromUrl(m.url);
      if (!key || !key.startsWith('comentarios/'))
        throw new BadRequestException('Archivo adjunto no válido');
    }

    if (
      !(
        await this.ds.query('SELECT 1 FROM capitulos WHERE id = $1', [
          capituloId,
        ])
      ).length
    ) {
      throw new NotFoundException('Capítulo no encontrado');
    }
    if (dto.padreId) {
      const p = await this.ds.query(
        'SELECT 1 FROM comentarios WHERE id = $1 AND capitulo_id = $2 AND NOT eliminado',
        [dto.padreId, capituloId],
      );
      if (!p.length)
        throw new BadRequestException(
          'El comentario al que respondes no existe',
        );
    }

    const id = await this.ds.transaction(async (em) => {
      const [{ id }] = await em.query(
        `INSERT INTO comentarios (capitulo_id, usuario_id, comentario_padre_id, contenido)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [capituloId, user.id, dto.padreId ?? null, contenido],
      );
      if (multimedia.length) {
        await em
          .createQueryBuilder()
          .insert()
          .into(ComentarioMultimedia)
          .values(
            multimedia.map((m) => ({
              comentarioId: id,
              tipo: m.tipo,
              url: m.url,
              ancho: m.ancho ?? null,
              alto: m.alto ?? null,
            })),
          )
          .execute();
      }
      return id as number;
    });
    if (dto.padreId)
      void this.notifs
        .respuesta(dto.padreId, id, user, contenido || '[adjunto]')
        .catch(() => undefined);
    return { id };
  }

  /** Borrado lógico (conserva el hilo); borra adjuntos del almacenamiento. */
  async eliminar(id: number, user: AuthUser) {
    const [c] = await this.ds.query(
      'SELECT usuario_id FROM comentarios WHERE id = $1 AND NOT eliminado',
      [id],
    );
    if (!c) throw new NotFoundException('Comentario no encontrado');
    if (c.usuario_id !== user.id && user.rol !== 'admin')
      throw new ForbiddenException();
    const media: { url: string }[] = await this.ds.query(
      'SELECT url FROM comentario_multimedia WHERE comentario_id = $1',
      [id],
    );
    await this.ds.query(
      'DELETE FROM comentario_multimedia WHERE comentario_id = $1',
      [id],
    );
    await this.ds.query(
      `UPDATE comentarios SET eliminado = true, contenido = '' WHERE id = $1`,
      [id],
    );
    await this.storage.deleteUrls(media.map((m) => m.url));
    return { ok: true };
  }

  async toggleLike(id: number, userId: string) {
    if (
      !(
        await this.ds.query(
          'SELECT 1 FROM comentarios WHERE id = $1 AND NOT eliminado',
          [id],
        )
      ).length
    ) {
      throw new NotFoundException('Comentario no encontrado');
    }
    const del = await this.ds.query(
      'DELETE FROM reacciones_comentarios WHERE comentario_id = $1 AND usuario_id = $2 RETURNING id',
      [id, userId],
    );
    const meGusta = del.length === 0;
    if (meGusta) {
      await this.ds.query(
        `INSERT INTO reacciones_comentarios (comentario_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, userId],
      );
    }
    const [{ n }] = await this.ds.query(
      'SELECT count(*)::int AS n FROM reacciones_comentarios WHERE comentario_id = $1',
      [id],
    );
    return { meGusta, likes: n as number };
  }
}
