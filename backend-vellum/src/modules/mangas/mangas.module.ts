import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BibliotecaUsuario,
  Genero,
  HistorialLectura,
  Manga,
} from '../../entities';
import { MangasController } from './mangas.controller';
import { MangasService } from './mangas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Manga,
      Genero,
      BibliotecaUsuario,
      HistorialLectura,
    ]),
  ],
  controllers: [MangasController],
  providers: [MangasService],
  exports: [MangasService],
})
export class MangasModule {}
