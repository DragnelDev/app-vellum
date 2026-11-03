import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ESTADOS, EstadoObra, TIPOS, TipoObra } from '../../entities';

export class CrearMangaDto {
  @IsString() @MinLength(1) @MaxLength(255) titulo: string;
  @IsOptional() @IsString() @MaxLength(255) tituloAlternativo?: string;
  @IsOptional() @IsString() @MaxLength(5000) sinopsis?: string;
  @IsOptional() @IsString() @MaxLength(160) autor?: string;
  @IsIn(TIPOS) tipo: TipoObra;
  @IsOptional() @IsIn(ESTADOS) estado?: EstadoObra;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsInt({ each: true })
  generos?: number[];
  @IsOptional() @IsBoolean() destacado?: boolean;
}

export class ActualizarMangaDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) titulo?: string;
  @IsOptional() @IsString() @MaxLength(255) tituloAlternativo?: string;
  @IsOptional() @IsString() @MaxLength(5000) sinopsis?: string;
  @IsOptional() @IsString() @MaxLength(160) autor?: string;
  @IsOptional() @IsIn(TIPOS) tipo?: TipoObra;
  @IsOptional() @IsIn(ESTADOS) estado?: EstadoObra;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsInt({ each: true })
  generos?: number[];
  @IsOptional() @IsBoolean() destacado?: boolean;
}

export class ListarMangasDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  /** slugs separados por coma */
  @IsOptional() @IsString() @MaxLength(300) genero?: string;
  @IsOptional() @IsIn(TIPOS) tipo?: TipoObra;
  @IsOptional() @IsIn(ESTADOS) estado?: EstadoObra;
  @IsOptional() @IsString() @MaxLength(100) autor?: string;
  /** true = solo obras con al menos un capítulo */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  conCapitulos?: boolean;
  @IsOptional()
  @IsIn(['recientes', 'populares', 'titulo', 'actualizados'])
  orden?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) limit?: number;
}
