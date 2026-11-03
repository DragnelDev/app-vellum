import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  InjectDataSource,
  InjectRepository,
  TypeOrmModule,
} from '@nestjs/typeorm';
import { IsIn } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import {
  BibliotecaUsuario,
  ESTADOS_LECTURA,
  EstadoLectura,
  Manga,
} from '../../entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { NotFoundException } from '@nestjs/common';

class EstadoDto {
  @IsIn(ESTADOS_LECTURA) estado: EstadoLectura;
}

@Controller('biblioteca')
@UseGuards(JwtAuthGuard)
export class BibliotecaController {
  constructor(
    @InjectRepository(BibliotecaUsuario)
    private readonly repo: Repository<BibliotecaUsuario>,
    @InjectRepository(Manga) private readonly mangas: Repository<Manga>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  @Get()
  async list(@CurrentUser() u: AuthUser, @Query('estado') estado?: string) {
    const rows: any[] = await this.ds.query(
      `SELECT b.estado, b.actualizado_en AS "actualizadoEn",
              m.id, m.titulo, m.slug, m.portada_url AS "portadaUrl", m.tipo,
              (SELECT max(numero) FROM capitulos c WHERE c.manga_id = m.id) AS "ultimoCapitulo"
         FROM biblioteca_usuario b JOIN mangas m ON m.id = b.manga_id
        WHERE b.usuario_id = $1 AND ($2::text IS NULL OR b.estado = $2)
        ORDER BY b.actualizado_en DESC`,
      [u.id, ESTADOS_LECTURA.includes(estado as EstadoLectura) ? estado : null],
    );
    return rows.map((r) => ({
      ...r,
      ultimoCapitulo:
        r.ultimoCapitulo === null ? null : parseFloat(r.ultimoCapitulo),
    }));
  }

  @Get(':mangaId')
  async estado(
    @CurrentUser() u: AuthUser,
    @Param('mangaId', ParseIntPipe) mangaId: number,
  ) {
    const r = await this.repo.findOne({ where: { usuarioId: u.id, mangaId } });
    return { estado: r?.estado ?? null };
  }

  @Put(':mangaId')
  async set(
    @CurrentUser() u: AuthUser,
    @Param('mangaId', ParseIntPipe) mangaId: number,
    @Body() dto: EstadoDto,
  ) {
    if (!(await this.mangas.exists({ where: { id: mangaId } })))
      throw new NotFoundException('Obra no encontrada');
    await this.repo.upsert({ usuarioId: u.id, mangaId, estado: dto.estado }, [
      'usuarioId',
      'mangaId',
    ]);
    return { estado: dto.estado };
  }

  @Delete(':mangaId')
  @HttpCode(204)
  async remove(
    @CurrentUser() u: AuthUser,
    @Param('mangaId', ParseIntPipe) mangaId: number,
  ) {
    await this.repo.delete({ usuarioId: u.id, mangaId });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([BibliotecaUsuario, Manga])],
  controllers: [BibliotecaController],
})
export class BibliotecaModule {}
