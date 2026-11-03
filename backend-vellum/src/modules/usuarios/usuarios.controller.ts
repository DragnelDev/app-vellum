import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  ParseIntPipe,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ROLES, Rol } from '../../entities';
import { ImagesService } from '../media/images.service';
import { StorageService } from '../storage/storage.service';
import { UsuariosService } from './usuarios.service';

class SetRolDto {
  @IsIn(ROLES) rol: Rol;
}
class ActivoDto {
  @IsBoolean() activo: boolean;
}
class PasswordDto {
  @IsString() @MaxLength(72) actual: string;
  @IsString() @MinLength(8) @MaxLength(72) nueva: string;
}
class EmailDto {
  @IsEmail() @MaxLength(255) email: string;
  @IsString() @MaxLength(72) password: string;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly images: ImagesService,
    private readonly storage: StorageService,
  ) {}

  @Post('usuarios/me/avatar')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async avatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo');
    const img = await this.images.toWebpSingle(file.buffer, 256);
    const key = `avatares/${user.id}-${Date.now().toString(36)}.webp`;
    const url = await this.storage.put({
      key,
      body: img.buffer,
      contentType: 'image/webp',
    });
    return this.usuarios.setAvatar(user.id, url);
  }

  @Patch('usuarios/me/password')
  cambiarPassword(@CurrentUser() u: AuthUser, @Body() dto: PasswordDto) {
    return this.usuarios.cambiarPassword(u.id, dto.actual, dto.nueva);
  }

  @Patch('usuarios/me/email')
  cambiarEmail(@CurrentUser() u: AuthUser, @Body() dto: EmailDto) {
    return this.usuarios.cambiarEmail(u.id, dto.email, dto.password);
  }

  @Get('usuarios/me/historial')
  historial(@CurrentUser() u: AuthUser, @Query('page') page = '1') {
    return this.usuarios.historial(u.id, Math.max(1, +page || 1));
  }

  @Delete('usuarios/me/historial')
  vaciarHistorial(@CurrentUser() u: AuthUser) {
    return this.usuarios.borrarHistorial(u.id);
  }

  @Delete('usuarios/me/historial/:mangaId')
  borrarObraHistorial(
    @CurrentUser() u: AuthUser,
    @Param('mangaId', ParseIntPipe) mangaId: number,
  ) {
    return this.usuarios.borrarHistorial(u.id, mangaId);
  }

  // ---- Administración ----
  @Get('admin/usuarios')
  @Roles('admin')
  list(@Query('page') page = '1', @Query('q') q?: string) {
    return this.usuarios.list(Math.max(1, +page || 1), 50, q);
  }

  @Patch('admin/usuarios/:id/activo')
  @Roles('admin')
  setActivo(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivoDto,
  ) {
    if (id === me.id)
      throw new BadRequestException('No puedes bloquearte a ti mismo');
    return this.usuarios.setActivo(id, dto.activo);
  }

  @Patch('admin/usuarios/:id/rol')
  @Roles('admin')
  setRol(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRolDto) {
    return this.usuarios.setRol(id, dto.rol);
  }
}
