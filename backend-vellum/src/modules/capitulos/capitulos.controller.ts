import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseFloatPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join, extname } from 'path';
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
import { CapitulosService } from './capitulos.service';
import { CapituloIngestService } from './capitulo-ingest.service';
import {
  ActualizarCapituloDto,
  CrearCapituloTextoDto,
  SubirCapituloZipDto,
  UltimosDto,
} from './capitulos.dto';

const MAX_ZIP = 300 * 1024 * 1024;

@Controller()
export class CapitulosController {
  constructor(
    private readonly capitulos: CapitulosService,
    private readonly ingest: CapituloIngestService,
  ) {}

  @Get('capitulos/ultimos')
  ultimos(@Query() q: UltimosDto) {
    return this.capitulos.ultimos(q);
  }

  @Get('mangas/:slug/capitulos/:numero')
  @UseGuards(OptionalJwtAuthGuard)
  lector(
    @Param('slug') slug: string,
    @Param('numero', ParseFloatPipe) numero: number,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.capitulos.lector(slug, numero, user?.id);
  }

  @Post('capitulos/:id/vista')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  vista(@Param('id', ParseIntPipe) id: number) {
    return this.capitulos.registrarVista(id);
  }

  // ---------------- Administración (admin + uploader) ----------------

  /** Carga masiva: multipart/form-data { archivo: .zip, mangaId, numero, volumen?, titulo?, reemplazar? } */
  @Post('admin/capitulos/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'uploader')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, _file, cb) => cb(null, `vellum-${randomUUID()}.zip`),
      }),
      limits: { fileSize: MAX_ZIP, files: 1 },
      fileFilter: (_req, file, cb) =>
        extname(file.originalname).toLowerCase() === '.zip'
          ? cb(null, true)
          : cb(new BadRequestException('Solo se aceptan archivos .zip'), false),
    }),
  )
  async upload(
    @Body() dto: SubirCapituloZipDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException('Falta el archivo .zip (campo "archivo")');
    try {
      return await this.ingest.ingestZip(file.path, dto);
    } finally {
      await fs.rm(file.path, { force: true });
    }
  }

  @Post('admin/capitulos/texto')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'uploader')
  crearTexto(@Body() dto: CrearCapituloTextoDto) {
    return this.ingest.createText(dto);
  }

  @Patch('admin/capitulos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'uploader')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCapituloDto,
  ) {
    return this.capitulos.actualizar(id, dto);
  }

  @Delete('admin/capitulos/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async borrar(@Param('id', ParseIntPipe) id: number) {
    await this.ingest.removeChapter(id);
  }
}
