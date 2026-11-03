import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { Genero } from '../../entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { slugify } from '../../common/utils/slug';

class CrearGeneroDto {
  @IsString() @MinLength(2) @MaxLength(60) nombre: string;
}

@Controller()
export class GenerosController {
  constructor(
    @InjectRepository(Genero) private readonly repo: Repository<Genero>,
  ) {}

  @Get('generos')
  list() {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  @Post('admin/generos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'uploader')
  async crear(@Body() dto: CrearGeneroDto) {
    const slug = slugify(dto.nombre);
    return (
      (await this.repo.findOne({ where: { slug } })) ??
      this.repo.save({ nombre: dto.nombre.trim(), slug })
    );
  }

  @Patch('admin/generos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async renombrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearGeneroDto,
  ) {
    await this.repo.update(id, {
      nombre: dto.nombre.trim(),
      slug: slugify(dto.nombre),
    });
    return this.repo.findOne({ where: { id } });
  }

  @Delete('admin/generos/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async borrar(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Genero])],
  controllers: [GenerosController],
})
export class GenerosModule {}
