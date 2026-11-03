import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../../common/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ImagesService } from '../media/images.service';
import { StorageService } from '../storage/storage.service';
import { ComentariosService } from './comentarios.service';
import { CrearComentarioDto, ListarComentariosDto } from './comentarios.dto';

@Controller()
export class ComentariosController {
  constructor(
    private readonly svc: ComentariosService,
    private readonly images: ImagesService,
    private readonly storage: StorageService,
  ) {}

  @Get('capitulos/:id/comentarios')
  @UseGuards(OptionalJwtAuthGuard)
  listar(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: ListarComentariosDto,
    @CurrentUser() u: AuthUser | null,
  ) {
    return this.svc.listar(id, q.page ?? 1, q.orden, u?.id);
  }

  @Post('capitulos/:id/comentarios')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  crear(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() u: AuthUser,
    @Body() dto: CrearComentarioDto,
  ) {
    return this.svc.crear(id, u, dto);
  }

  @Delete('comentarios/:id')
  @UseGuards(JwtAuthGuard)
  eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) {
    return this.svc.eliminar(id, u);
  }

  @Put('comentarios/:id/like')
  @UseGuards(JwtAuthGuard)
  like(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) {
    return this.svc.toggleLike(id, u.id);
  }

  /**
   * Sube una imagen / GIF / sticker para adjuntar a un comentario.
   * Se valida por firma real del archivo. GIFs animados se conservan tal cual (≤ 6 MB).
   */
  @Post('comentarios/media')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    }),
  )
  async media(
    @CurrentUser() u: AuthUser,
    @Body('tipo') tipoSolicitado?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo');
    const kind = this.images.detect(file.buffer);
    if (!kind)
      throw new BadRequestException(
        'Formato no soportado (JPG, PNG, WebP, GIF, AVIF)',
      );
    const id = randomUUID();

    if (kind === 'gif') {
      if (file.size > 6 * 1024 * 1024)
        throw new BadRequestException('El GIF supera los 6 MB');
      const meta = await sharp(file.buffer, { animated: false }).metadata();
      const url = await this.storage.put({
        key: `comentarios/${u.id}/${id}.gif`,
        body: file.buffer,
        contentType: 'image/gif',
      });
      return {
        tipo: 'gif',
        url,
        ancho: meta.width ?? null,
        alto: meta.height ?? null,
      };
    }

    const tipo = tipoSolicitado === 'sticker' ? 'sticker' : 'imagen';
    const img = await this.images.toWebpSingle(
      file.buffer,
      tipo === 'sticker' ? 512 : 1200,
    );
    const url = await this.storage.put({
      key: `comentarios/${u.id}/${id}.webp`,
      body: img.buffer,
      contentType: 'image/webp',
    });
    return { tipo, url, ancho: img.width, alto: img.height };
  }
}
