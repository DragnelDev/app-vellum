import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from './common/naming';
import * as entities from './entities';
import { DatabaseBootstrapService } from './database/bootstrap.service';
import { StorageModule } from './modules/storage/storage.module';
import { MediaModule } from './modules/media/media.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { PreferenciasModule } from './modules/preferencias/preferencias.module';
import { GenerosModule } from './modules/generos/generos.module';
import { MangasModule } from './modules/mangas/mangas.module';
import { CapitulosModule } from './modules/capitulos/capitulos.module';
import { BibliotecaModule } from './modules/biblioteca/biblioteca.module';
import { HistorialModule } from './modules/historial/historial.module';
import { ReaccionesModule } from './modules/reacciones/reacciones.module';
import { ComentariosModule } from './modules/comentarios/comentarios.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { ModeracionModule } from './modules/moderacion/moderacion.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 240 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        url: cfg.getOrThrow<string>('DATABASE_URL'),
        ssl:
          cfg.get('DATABASE_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        entities: Object.values(entities).filter(
          (e) => typeof e === 'function',
        ),
        namingStrategy: new SnakeNamingStrategy(),
        // En producción usa migraciones y DB_SYNCHRONIZE=false
        synchronize:
          cfg.get(
            'DB_SYNCHRONIZE',
            cfg.get('NODE_ENV') === 'production' ? 'false' : 'true',
          ) === 'true',
        extra: { max: +cfg.get('DB_POOL_MAX', 20) },
      }),
    }),
    StorageModule,
    MediaModule,
    MailModule,
    NotificacionesModule,
    ModeracionModule,
    AdminModule,
    UsuariosModule,
    AuthModule,
    PreferenciasModule,
    GenerosModule,
    MangasModule,
    CapitulosModule,
    BibliotecaModule,
    HistorialModule,
    ReaccionesModule,
    ComentariosModule,
  ],
  providers: [
    DatabaseBootstrapService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
