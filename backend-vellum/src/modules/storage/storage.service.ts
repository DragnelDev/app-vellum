import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import * as path from 'path';
import { mapLimit } from '../../common/utils/concurrency';

export interface StorageItem {
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Almacenamiento de objetos.
 *  - driver "r2": Cloudflare R2 (API S3) servido por Cloudflare CDN en R2_PUBLIC_URL.
 *  - driver "local": disco local (desarrollo) servido en /media.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly driver: 'r2' | 'local';
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly localDir: string;
  private s3?: S3Client;

  constructor(cfg: ConfigService) {
    this.driver = cfg.get('STORAGE_DRIVER', 'local') === 'r2' ? 'r2' : 'local';
    this.bucket = cfg.get('R2_BUCKET', '');
    this.localDir = path.resolve(cfg.get('STORAGE_LOCAL_DIR', './storage'));
    if (this.driver === 'r2') {
      const account = cfg.getOrThrow<string>('R2_ACCOUNT_ID');
      this.publicUrl = cfg
        .getOrThrow<string>('R2_PUBLIC_URL')
        .replace(/\/$/, '');
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${account}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: cfg.getOrThrow('R2_ACCESS_KEY_ID'),
          secretAccessKey: cfg.getOrThrow('R2_SECRET_ACCESS_KEY'),
        },
      });
    } else {
      this.publicUrl = `${cfg.get('PUBLIC_API_URL', 'http://localhost:3001').replace(/\/$/, '')}/media`;
      this.log.warn(
        `Usando almacenamiento LOCAL en ${this.localDir} (solo desarrollo)`,
      );
    }
  }

  get localRoot() {
    return this.localDir;
  }

  urlFor(key: string) {
    return `${this.publicUrl}/${key}`;
  }

  keyFromUrl(url: string): string | null {
    return url.startsWith(this.publicUrl + '/')
      ? url.slice(this.publicUrl.length + 1)
      : null;
  }

  async put(item: StorageItem): Promise<string> {
    if (this.driver === 'r2') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: item.key,
          Body: item.body,
          ContentType: item.contentType,
          // Las claves incluyen el id del capítulo/hash: son inmutables.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } else {
      const file = path.join(this.localDir, item.key);
      if (!file.startsWith(this.localDir))
        throw new InternalServerErrorException('Clave inválida');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, item.body);
    }
    return this.urlFor(item.key);
  }

  /** Subida masiva con concurrencia limitada. Devuelve las URLs en el mismo orden. */
  putMany(items: StorageItem[], concurrency = 8): Promise<string[]> {
    return mapLimit(items, concurrency, (i) => this.put(i));
  }

  async deleteKeys(keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      if (this.driver === 'r2') {
        for (let i = 0; i < keys.length; i += 1000) {
          await this.s3!.send(
            new DeleteObjectsCommand({
              Bucket: this.bucket,
              Delete: {
                Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })),
                Quiet: true,
              },
            }),
          );
        }
      } else {
        await Promise.all(
          keys.map((k) => fs.rm(path.join(this.localDir, k), { force: true })),
        );
      }
    } catch (e) {
      this.log.error(`No se pudieron borrar objetos: ${(e as Error).message}`);
    }
  }

  async deleteUrls(urls: string[]) {
    await this.deleteKeys(
      urls.map((u) => this.keyFromUrl(u)).filter((k): k is string => !!k),
    );
  }
}
