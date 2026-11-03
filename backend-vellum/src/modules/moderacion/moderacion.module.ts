import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Global,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';

export const MOTIVOS = [
  'spam',
  'spoiler',
  'acoso',
  'ofensivo',
  'otro',
] as const;
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ReportarDto {
  @IsIn([...MOTIVOS]) motivo: string;
  @IsOptional() @IsString() @MaxLength(300) detalle?: string;
}
class ResolverDto {
  @IsIn(['descartar', 'eliminar', 'eliminar_y_bloquear']) accion:
    'descartar' | 'eliminar' | 'eliminar_y_bloquear';
}
class PalabraDto {
  @IsString() @MinLength(2) @MaxLength(80) palabra: string;
}

@Injectable()
export class ModeracionService {
  private cache: { re: RegExp | null; at: number } = { re: null, at: 0 };

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly storage: StorageService,
  ) {}

  /** Devuelve true si el texto contiene alguna palabra prohibida (sin acentos, palabra completa). */
  async palabraProhibida(texto: string): Promise<boolean> {
    if (!texto) return false;
    if (Date.now() - this.cache.at > 60_000) {
      const rows: { palabra: string }[] = await this.ds.query(
        'SELECT palabra FROM palabras_prohibidas',
      );
      this.cache = {
        at: Date.now(),
        re: rows.length
          ? new RegExp(
              `(^|[^\\p{L}\\p{N}])(${rows.map((r) => escapeRe(norm(r.palabra))).join('|')})(?![\\p{L}\\p{N}])`,
              'iu',
            )
          : null,
      };
    }
    return !!this.cache.re?.test(norm(texto));
  }
  invalidar() {
    this.cache.at = 0;
  }

  async reportar(comentarioId: number, user: AuthUser, dto: ReportarDto) {
    const [c] = await this.ds.query(
      'SELECT usuario_id FROM comentarios WHERE id = $1 AND NOT eliminado',
      [comentarioId],
    );
    if (!c) throw new NotFoundException('Comentario no encontrado');
    if (c.usuario_id === user.id)
      throw new BadRequestException('No puedes reportar tu propio comentario');
    await this.ds.query(
      `INSERT INTO reportes_comentarios (comentario_id, usuario_id, motivo, detalle) VALUES ($1, $2, $3, $4)
       ON CONFLICT (comentario_id, usuario_id) DO NOTHING`,
      [comentarioId, user.id, dto.motivo, dto.detalle ?? null],
    );
    return { ok: true };
  }

  /** Reportes agrupados por comentario. */
  listar(estado: string) {
    return this.ds.query(
      `SELECT c.id AS "comentarioId", c.contenido, c.eliminado, u.id AS "autorId", u.username AS autor, u.activo AS "autorActivo",
              m.slug, cap.numero::float AS numero, count(r.id)::int AS reportes,
              array_agg(DISTINCT r.motivo) AS motivos, max(r.creado_en) AS ultimo
         FROM reportes_comentarios r
         JOIN comentarios c ON c.id = r.comentario_id
         JOIN usuarios u ON u.id = c.usuario_id
         JOIN capitulos cap ON cap.id = c.capitulo_id
         JOIN mangas m ON m.id = cap.manga_id
        WHERE r.estado = $1
        GROUP BY c.id, u.id, m.id, cap.id
        ORDER BY max(r.creado_en) DESC LIMIT 100`,
      [estado === 'resuelto' || estado === 'descartado' ? estado : 'pendiente'],
    );
  }

  async resolver(comentarioId: number, accion: ResolverDto['accion']) {
    const [c] = await this.ds.query(
      'SELECT usuario_id FROM comentarios WHERE id = $1',
      [comentarioId],
    );
    if (!c) throw new NotFoundException('Comentario no encontrado');
    if (accion === 'descartar') {
      await this.ds.query(
        `UPDATE reportes_comentarios SET estado = 'descartado' WHERE comentario_id = $1`,
        [comentarioId],
      );
      return { ok: true };
    }
    const media: { url: string }[] = await this.ds.query(
      'SELECT url FROM comentario_multimedia WHERE comentario_id = $1',
      [comentarioId],
    );
    await this.ds.transaction(async (em) => {
      await em.query(
        'DELETE FROM comentario_multimedia WHERE comentario_id = $1',
        [comentarioId],
      );
      await em.query(
        `UPDATE comentarios SET eliminado = true, contenido = '' WHERE id = $1`,
        [comentarioId],
      );
      await em.query(
        `UPDATE reportes_comentarios SET estado = 'resuelto' WHERE comentario_id = $1`,
        [comentarioId],
      );
      if (accion === 'eliminar_y_bloquear')
        await em.query(
          `UPDATE usuarios SET activo = false WHERE id = $1 AND rol <> 'admin'`,
          [c.usuario_id],
        );
    });
    await this.storage.deleteUrls(media.map((m) => m.url));
    return { ok: true };
  }

  palabras() {
    return this.ds.query(
      'SELECT id, palabra FROM palabras_prohibidas ORDER BY palabra',
    );
  }
  async agregarPalabra(p: string) {
    const palabra = norm(p.trim());
    await this.ds.query(
      'INSERT INTO palabras_prohibidas (palabra) VALUES ($1) ON CONFLICT DO NOTHING',
      [palabra],
    );
    this.invalidar();
    return this.palabras();
  }
  async borrarPalabra(id: number) {
    await this.ds.query('DELETE FROM palabras_prohibidas WHERE id = $1', [id]);
    this.invalidar();
  }
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModeracionController {
  constructor(private readonly svc: ModeracionService) {}

  @Post('comentarios/:id/reportar')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reportar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() u: AuthUser,
    @Body() dto: ReportarDto,
  ) {
    return this.svc.reportar(id, u, dto);
  }

  @Get('admin/reportes')
  @Roles('admin')
  listar(@Query('estado') estado = 'pendiente') {
    return this.svc.listar(estado);
  }

  @Post('admin/reportes/comentario/:id/resolver')
  @HttpCode(200)
  @Roles('admin')
  resolver(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolverDto) {
    return this.svc.resolver(id, dto.accion);
  }

  @Get('admin/palabras-prohibidas')
  @Roles('admin')
  palabras() {
    return this.svc.palabras();
  }

  @Post('admin/palabras-prohibidas')
  @Roles('admin')
  agregar(@Body() dto: PalabraDto) {
    return this.svc.agregarPalabra(dto.palabra);
  }

  @Delete('admin/palabras-prohibidas/:id')
  @HttpCode(204)
  @Roles('admin')
  async borrar(@Param('id', ParseIntPipe) id: number) {
    await this.svc.borrarPalabra(id);
  }
}

@Global()
@Module({
  controllers: [ModeracionController],
  providers: [ModeracionService],
  exports: [ModeracionService],
})
export class ModeracionModule {}
