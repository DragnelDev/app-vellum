import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TIPOS_MULTIMEDIA, TipoMultimedia } from '../../entities';

export class MultimediaDto {
  @IsIn(TIPOS_MULTIMEDIA) tipo: TipoMultimedia;
  @IsString() @MaxLength(1000) url: string;
  @IsOptional() @IsInt() @Min(1) ancho?: number;
  @IsOptional() @IsInt() @Min(1) alto?: number;
}

export class CrearComentarioDto {
  @IsOptional() @IsString() @MaxLength(2000) contenido?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) padreId?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => MultimediaDto)
  multimedia?: MultimediaDto[];
}

export class ListarComentariosDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @IsIn(['recientes', 'populares', 'antiguos']) orden?: string;
}
