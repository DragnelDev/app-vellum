import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'uploader')
export class AdminController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** Panel: totales, vistas de los últimos 14 días, top semanal y actividad reciente. */
  @Get('estadisticas')
  async estadisticas() {
    const [totales] = await this.ds.query(`
      SELECT (SELECT count(*) FROM mangas)::int AS obras,
             (SELECT count(*) FROM capitulos)::int AS capitulos,
             (SELECT count(*) FROM usuarios)::int AS usuarios,
             (SELECT count(*) FROM comentarios WHERE NOT eliminado)::int AS comentarios,
             (SELECT coalesce(sum(vistas), 0) FROM mangas)::int AS vistas,
             (SELECT count(DISTINCT comentario_id) FROM reportes_comentarios WHERE estado = 'pendiente')::int AS "reportesPendientes"`);
    const vistasPorDia = await this.ds.query(`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS dia, coalesce(sum(v.vistas), 0)::int AS vistas
        FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') d
        LEFT JOIN vistas_diarias v ON v.dia = d::date
       GROUP BY d ORDER BY d`);
    const topSemana = await this.ds.query(`
      SELECT m.id, m.titulo, m.slug, sum(v.vistas)::int AS vistas
        FROM vistas_diarias v JOIN mangas m ON m.id = v.manga_id
       WHERE v.dia >= CURRENT_DATE - 6 GROUP BY m.id ORDER BY vistas DESC LIMIT 8`);
    const recientes = await this.ds.query(`
      SELECT c.id, c.numero::float AS numero, c.publicado_en AS "publicadoEn", m.titulo, m.slug
        FROM capitulos c JOIN mangas m ON m.id = c.manga_id ORDER BY c.publicado_en DESC LIMIT 8`);
    return { totales, vistasPorDia, topSemana, recientes };
  }
}

@Module({ controllers: [AdminController] })
export class AdminModule {}
