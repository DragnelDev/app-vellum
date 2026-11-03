import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreferenciaUsuario } from '../../entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { PreferenciasDto } from './preferencias.dto';

@Controller('preferencias')
@UseGuards(JwtAuthGuard)
export class PreferenciasController {
  constructor(
    @InjectRepository(PreferenciaUsuario)
    private readonly repo: Repository<PreferenciaUsuario>,
  ) {}

  private strip({ usuarioId, actualizadoEn, ...rest }: PreferenciaUsuario) {
    return rest;
  }

  @Get()
  async get(@CurrentUser() u: AuthUser) {
    const p = await this.repo.findOne({ where: { usuarioId: u.id } });
    return this.strip(p ?? this.repo.create({ usuarioId: u.id, ...DEFAULTS }));
  }

  @Put()
  async put(@CurrentUser() u: AuthUser, @Body() dto: PreferenciasDto) {
    const current =
      (await this.repo.findOne({ where: { usuarioId: u.id } })) ??
      this.repo.create({ usuarioId: u.id, ...DEFAULTS });
    Object.assign(current, dto);
    return this.strip(await this.repo.save(current));
  }
}

const DEFAULTS = {
  tema: 'oscuro' as const,
  colorFondo: '#0f172a',
  colorAcento: '#f59e0b',
  anchoPagina: 800,
  separacionVinetas: 'sin_espacio' as const,
  brillo: 100,
  gestosTactiles: true,
  ocultarBarras: true,
  tamanoFuente: 18,
  modoLectura: 'vertical' as const,
};
