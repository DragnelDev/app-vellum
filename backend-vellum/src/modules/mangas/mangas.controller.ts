import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BibliotecaUsuario, HistorialLectura } from '../../entities';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { MangasService } from './mangas.service';
import {
  ActualizarMangaDto,
  CrearMangaDto,
  ListarMangasDto,
} from './mangas.dto';

@Controller()
export class MangasController {
  constructor(
    private readonly mangas: MangasService,
    @InjectRepository(BibliotecaUsuario)
    private readonly biblioteca: Repository<BibliotecaUsuario>,
    @InjectRepository(HistorialLectura)
    private readonly historial: Repository<HistorialLectura>,
  ) {}

  @Get('mangas')
  list(@Query() q: ListarMangasDto) {
    return this.mangas.list(q);
  }

  @Get('mangas/destacadas')
  destacadas() {
    return this.mangas.destacadas();
  }

  @Get('mangas/ranking')
  ranking(@Query('periodo') periodo = 'semana', @Query('limit') limit = '10') {
    return this.mangas.ranking(
      periodo,
      Math.min(Math.max(+limit || 10, 1), 30),
    );
  }

  @Get('mangas/:slug/relacionadas')
  relacionadas(@Param('slug') slug: string) {
    return this.mangas.relacionadas(slug);
  }

  @Get('mangas/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  async detalle(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser | null,
  ) {
    const manga = await this.mangas.findBySlug(slug);
    if (!user) return { ...manga, mio: null };
    const [lib, hist] = await Promise.all([
      this.biblioteca.findOne({
        where: { usuarioId: user.id, mangaId: manga.id },
      }),
      this.historial.findOne({
        where: { usuarioId: user.id, mangaId: manga.id },
        relations: { capitulo: true },
      }),
    ]);
    return {
      ...manga,
      mio: {
        estado: lib?.estado ?? null,
        continuar: hist
          ? { capituloNumero: hist.capitulo.numero, pagina: hist.pagina }
          : null,
      },
    };
  }

  // ---------------- Administración (admin + uploader) ----------------
  @Post('admin/mangas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'uploader')
  crear(@Body() dto: CrearMangaDto) {
    return this.mangas.create(dto);
  }

  @Patch('admin/mangas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'uploader')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarMangaDto,
  ) {
    return this.mangas.update(id, dto);
  }

  @Post('admin/mangas/:id/portada')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'uploader')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  portada(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo');
    return this.mangas.setCover(id, file.buffer);
  }

  @Delete('admin/mangas/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async borrar(@Param('id', ParseIntPipe) id: number) {
    await this.mangas.remove(id);
  }
}
