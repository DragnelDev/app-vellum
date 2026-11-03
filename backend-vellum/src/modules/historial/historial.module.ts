import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { DataSource } from 'typeorm';
import { HistorialLectura } from '../../entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

class GuardarProgresoDto {
  @Type(() => Number) @IsInt() @Min(1) mangaId: number;
  @Type(() => Number) @IsInt() @Min(1) capituloId: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5000) pagina: number;
}

@Controller('historial')
@UseGuards(JwtAuthGuard)
export class HistorialController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** "Continuar leyendo": última posición por obra, más reciente primero. */
  @Get('continuar')
  async continuar(@CurrentUser() u: AuthUser, @Query('limit') limit = '12') {
    const rows: any[] = await this.ds.query(
      `SELECT h.pagina, h.actualizado_en AS "actualizadoEn",
              m.id AS "mangaId", m.titulo, m.slug, m.portada_url AS "portadaUrl", m.tipo,
              c.id AS "capituloId", c.numero
         FROM historial_lectura h
         JOIN mangas m ON m.id = h.manga_id
         JOIN capitulos c ON c.id = h.capitulo_id
        WHERE h.usuario_id = $1
        ORDER BY h.actualizado_en DESC
        LIMIT $2`,
      [u.id, Math.min(Math.max(+limit || 12, 1), 50)],
    );
    return rows.map((r) => ({ ...r, numero: parseFloat(r.numero) }));
  }

  /** Posición del usuario en una obra (para el botón "Continuar"). */
  @Get('obra/:mangaId')
  async deObra(
    @CurrentUser() u: AuthUser,
    @Param('mangaId', ParseIntPipe) mangaId: number,
  ) {
    const [r] = await this.ds.query(
      `SELECT c.numero, h.pagina FROM historial_lectura h JOIN capitulos c ON c.id = h.capitulo_id
        WHERE h.usuario_id = $1 AND h.manga_id = $2`,
      [u.id, mangaId],
    );
    return r
      ? { capituloNumero: parseFloat(r.numero), pagina: r.pagina as number }
      : null;
  }

  /** Última página leída de un capítulo concreto. */
  @Get('capitulo/:capituloId')
  async deCapitulo(
    @CurrentUser() u: AuthUser,
    @Param('capituloId', ParseIntPipe) capituloId: number,
  ) {
    const [r] = await this.ds.query(
      `SELECT pagina FROM historial_lectura WHERE usuario_id = $1 AND capitulo_id = $2`,
      [u.id, capituloId],
    );
    return r ? { pagina: r.pagina as number } : null;
  }

  @Put()
  async guardar(@CurrentUser() u: AuthUser, @Body() dto: GuardarProgresoDto) {
    const ok = await this.ds.query(
      'SELECT 1 FROM capitulos WHERE id = $1 AND manga_id = $2',
      [dto.capituloId, dto.mangaId],
    );
    if (!ok.length)
      throw new BadRequestException('El capítulo no pertenece a la obra');
    await this.ds.query(
      `INSERT INTO historial_lectura (usuario_id, manga_id, capitulo_id, pagina, actualizado_en)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (usuario_id, manga_id)
       DO UPDATE SET capitulo_id = EXCLUDED.capitulo_id, pagina = EXCLUDED.pagina, actualizado_en = now()`,
      [u.id, dto.mangaId, dto.capituloId, dto.pagina],
    );
    // Leer una obra la marca como "leyendo" (sin pisar "completado")
    await this.ds.query(
      `INSERT INTO biblioteca_usuario (usuario_id, manga_id, estado) VALUES ($1, $2, 'leyendo')
       ON CONFLICT (usuario_id, manga_id) DO UPDATE SET estado = 'leyendo' WHERE biblioteca_usuario.estado = 'pendiente'`,
      [u.id, dto.mangaId],
    );
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([HistorialLectura])],
  controllers: [HistorialController],
})
export class HistorialModule {}
