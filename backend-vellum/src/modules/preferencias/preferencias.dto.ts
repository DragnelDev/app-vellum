import {
  IsBoolean,
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class PreferenciasDto {
  @IsOptional() @IsIn(['oscuro', 'claro']) tema?: 'oscuro' | 'claro';
  @IsOptional() @IsHexColor() colorFondo?: string;
  @IsOptional() @IsHexColor() colorAcento?: string;
  @IsOptional() @IsInt() @Min(320) @Max(1400) anchoPagina?: number;
  @IsOptional() @IsIn(['sin_espacio', 'fina', 'amplia']) separacionVinetas?:
    'sin_espacio' | 'fina' | 'amplia';
  @IsOptional() @IsInt() @Min(40) @Max(100) brillo?: number;
  @IsOptional() @IsBoolean() gestosTactiles?: boolean;
  @IsOptional() @IsBoolean() ocultarBarras?: boolean;
  @IsOptional() @IsIn(['vertical', 'paginado', 'paginado_rtl']) modoLectura?:
    'vertical' | 'paginado' | 'paginado_rtl';
  @IsOptional() @IsInt() @Min(12) @Max(32) tamanoFuente?: number;
}
