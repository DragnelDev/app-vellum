import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Capitulo,
  CapituloPagina,
  HistorialLectura,
  Manga,
} from '../../entities';
import { CapitulosController } from './capitulos.controller';
import { CapitulosService } from './capitulos.service';
import { CapituloIngestService } from './capitulo-ingest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Capitulo,
      CapituloPagina,
      Manga,
      HistorialLectura,
    ]),
  ],
  controllers: [CapitulosController],
  providers: [CapitulosService, CapituloIngestService],
})
export class CapitulosModule {}
