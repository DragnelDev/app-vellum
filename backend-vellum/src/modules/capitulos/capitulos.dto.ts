import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

class BaseCapituloDto {
  @Type(() => Number) @IsInt() @Min(1) mangaId: number;
  /** Admite decimales: 130.5 */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999)
  numero: number;
  @IsOptional() @IsString() @MaxLength(255) titulo?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  volumen?: number;
  /** Si el capítulo ya existe, lo reemplaza. */
  @IsOptional() @Transform(toBool) @IsBoolean() reemplazar?: boolean;
}

export class SubirCapituloZipDto extends BaseCapituloDto {}

export class CrearCapituloTextoDto extends BaseCapituloDto {
  @IsString() @MaxLength(400_000) contenido: string;
}

export class ActualizarCapituloDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999)
  numero?: number;
  @IsOptional() @IsString() @MaxLength(255) titulo?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  volumen?: number;
}

export class UltimosDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) limit?: number;
  @IsOptional() @IsString() tipo?: string;
}
