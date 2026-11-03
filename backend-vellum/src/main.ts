import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { StorageService } from './modules/storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const cfg = process.env;

  if (
    cfg.NODE_ENV === 'production' &&
    (!cfg.JWT_SECRET || cfg.JWT_SECRET.length < 32)
  ) {
    throw new Error(
      'JWT_SECRET debe tener al menos 32 caracteres en producción',
    );
  }

  app.set('trust proxy', 1); // detrás de Cloudflare / proxy inverso (IP real para el rate limit)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (cfg.FRONTEND_URL ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Servir /media solo con el driver local (en producción lo sirve Cloudflare R2 + CDN)
  if ((cfg.STORAGE_DRIVER ?? 'local') === 'local') {
    app.useStaticAssets(app.get(StorageService).localRoot, {
      prefix: '/media',
      maxAge: '30d',
      immutable: true,
    });
  }

  const port = Number(cfg.PORT ?? 3001);
  await app.listen(port);
  new Logger('Vellum').log(`API lista en http://localhost:${port}/api`);
}
bootstrap();
