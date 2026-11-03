import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreferenciaUsuario } from '../../entities';
import { PreferenciasController } from './preferencias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PreferenciaUsuario])],
  controllers: [PreferenciasController],
})
export class PreferenciasModule {}
