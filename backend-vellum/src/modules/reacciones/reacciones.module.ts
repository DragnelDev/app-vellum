import {
  Body,
  Controller,
  Get,
  Injectable,
  MessageEvent,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Put,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { IsIn, IsString } from 'class-validator';
import { DataSource } from 'typeorm';
import {
  Observable,
  Subject,
  defer,
  filter,
  from,
  interval,
  map,
  merge,
} from 'rxjs';
import { EMOJIS_REACCION, ReaccionCapitulo } from '../../entities';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../../common/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

type Conteos = Record<string, number>;

class ReaccionDto {
  @IsString() @IsIn([...EMOJIS_REACCION]) emoji: string;
}

@Injectable()
export class ReaccionesService {
  /** Bus en memoria (1 instancia). Para escalar horizontalmente: Redis pub/sub aquí. */
  readonly bus = new Subject<{ capituloId: number; conteos: Conteos }>();

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async conteos(capituloId: number): Promise<Conteos> {
    const rows: { emoji: string; n: number }[] = await this.ds.query(
      `SELECT emoji, count(*)::int AS n FROM reacciones_capitulo WHERE capitulo_id = $1 GROUP BY emoji`,
      [capituloId],
    );
    const out: Conteos = Object.fromEntries(EMOJIS_REACCION.map((e) => [e, 0]));
    for (const r of rows) out[r.emoji] = r.n;
    return out;
  }

  async mia(capituloId: number, userId?: string) {
    if (!userId) return null;
    const r = await this.ds.query(
      `SELECT emoji FROM reacciones_capitulo WHERE capitulo_id = $1 AND usuario_id = $2`,
      [capituloId, userId],
    );
    return (r[0]?.emoji as string) ?? null;
  }

  /** Una reacción por usuario y capítulo: mismo emoji = quitar; otro emoji = cambiar. */
  async reaccionar(capituloId: number, userId: string, emoji: string) {
    if (
      !(
        await this.ds.query('SELECT 1 FROM capitulos WHERE id = $1', [
          capituloId,
        ])
      ).length
    ) {
      throw new NotFoundException('Capítulo no encontrado');
    }
    const actual = await this.mia(capituloId, userId);
    if (actual === emoji) {
      await this.ds.query(
        `DELETE FROM reacciones_capitulo WHERE capitulo_id = $1 AND usuario_id = $2`,
        [capituloId, userId],
      );
    } else {
      await this.ds.query(
        `INSERT INTO reacciones_capitulo (capitulo_id, usuario_id, emoji) VALUES ($1, $2, $3)
         ON CONFLICT (capitulo_id, usuario_id) DO UPDATE SET emoji = EXCLUDED.emoji`,
        [capituloId, userId, emoji],
      );
    }
    const conteos = await this.conteos(capituloId);
    this.bus.next({ capituloId, conteos });
    return { conteos, mia: actual === emoji ? null : emoji };
  }
}

@Controller('capitulos/:id/reacciones')
export class ReaccionesController {
  constructor(private readonly svc: ReaccionesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async get(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() u: AuthUser | null,
  ) {
    const [conteos, mia] = await Promise.all([
      this.svc.conteos(id),
      this.svc.mia(id, u?.id),
    ]);
    return { conteos, mia };
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  reaccionar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() u: AuthUser,
    @Body() dto: ReaccionDto,
  ) {
    return this.svc.reaccionar(id, u.id, dto.emoji);
  }

  /** Contadores en tiempo real (Server-Sent Events). */
  @Sse('stream')
  @SkipThrottle()
  stream(@Param('id', ParseIntPipe) id: number): Observable<MessageEvent> {
    return merge(
      defer(() => from(this.svc.conteos(id))),
      this.svc.bus.pipe(
        filter((e) => e.capituloId === id),
        map((e) => e.conteos),
      ),
    ).pipe(
      map((conteos): MessageEvent => ({ data: conteos })),
      // keep-alive para proxies/Cloudflare (evento con nombre: el cliente lo ignora)
      (src) =>
        merge(
          src,
          interval(25_000).pipe(
            map((): MessageEvent => ({ type: 'ping', data: '' })),
          ),
        ),
    );
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ReaccionCapitulo])],
  controllers: [ReaccionesController],
  providers: [ReaccionesService],
})
export class ReaccionesModule {}
