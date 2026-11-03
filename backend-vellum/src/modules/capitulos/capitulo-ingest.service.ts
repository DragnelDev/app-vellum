import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import AdmZip from 'adm-zip';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Capitulo, CapituloPagina, Manga } from '../../entities';
import { mapLimit } from '../../common/utils/concurrency';
import { ImagesService, ProcessedImage } from '../media/images.service';
import { StorageService } from '../storage/storage.service';
import { NotificacionesService } from '../notificaciones/notificaciones.module';
import { CrearCapituloTextoDto, SubirCapituloZipDto } from './capitulos.dto';

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const MAX_PAGES = 500;
const MAX_ENTRY_BYTES = 40 * 1024 * 1024;
const MAX_TOTAL_BYTES = 1.5 * 1024 * 1024 * 1024;

@Injectable()
export class CapituloIngestService {
  private readonly log = new Logger(CapituloIngestService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly images: ImagesService,
    private readonly storage: StorageService,
    private readonly notifs: NotificacionesService,
  ) {}

  /**
   * ZIP -> descompresión en memoria (sin tocar el disco: sin riesgo de zip-slip)
   *     -> WebP (con cortes de tiras largas) -> subida masiva a R2 -> bulk insert en capitulo_paginas.
   */
  async ingestZip(zipPath: string, dto: SubirCapituloZipDto) {
    const manga = await this.requireManga(dto.mangaId);
    const entries = this.readImageEntries(zipPath);

    // 1) Procesar imágenes (CPU) con concurrencia limitada
    const processed = await mapLimit(entries, 4, async (e) => {
      const data = e.getData();
      if (data.length > MAX_ENTRY_BYTES)
        throw new PayloadTooLargeException(
          `${e.entryName} es demasiado grande`,
        );
      return this.images.toWebp(data);
    });
    const pages: ProcessedImage[] = processed.flat();

    // 2) Subida a R2 bajo un prefijo único (los objetos son inmutables -> cache de 1 año seguro)
    const prefix = `mangas/${manga.id}/${String(dto.numero).replace('.', '_')}-${randomUUID().slice(0, 8)}`;
    const keys = pages.map(
      (_, i) => `${prefix}/${String(i + 1).padStart(3, '0')}.webp`,
    );
    let urls: string[];
    try {
      urls = await this.storage.putMany(
        pages.map((p, i) => ({
          key: keys[i],
          body: p.buffer,
          contentType: 'image/webp',
        })),
        8,
      );
    } catch (e) {
      await this.storage.deleteKeys(keys);
      throw e;
    }

    // 3) Transacción corta: capítulo + bulk insert de páginas
    try {
      const { capitulo, oldUrls } = await this.ds.transaction(async (em) => {
        const oldUrls = await this.prepareSlot(em, manga.id, dto);
        const capitulo = await em.save(
          Capitulo,
          em.create(Capitulo, {
            mangaId: manga.id,
            numero: dto.numero,
            titulo: dto.titulo ?? null,
            volumen: dto.volumen ?? null,
          }),
        );
        await em
          .createQueryBuilder()
          .insert()
          .into(CapituloPagina)
          .values(
            pages.map((p, i) => ({
              capituloId: capitulo.id,
              orden: i + 1,
              url: urls[i],
              ancho: p.width,
              alto: p.height,
            })),
          )
          .execute();
        await em.update(Manga, manga.id, { actualizadoEn: new Date() });
        return { capitulo, oldUrls };
      });
      if (oldUrls.length) void this.storage.deleteUrls(oldUrls);
      if (!dto.reemplazar)
        void this.notifs
          .nuevoCapitulo(manga.id, capitulo.numero)
          .catch((e) => this.log.error(e.message));
      return {
        id: capitulo.id,
        numero: capitulo.numero,
        paginas: pages.length,
      };
    } catch (e) {
      await this.storage.deleteKeys(keys); // no dejar huérfanos en R2
      throw e;
    }
  }

  async createText(dto: CrearCapituloTextoDto) {
    const manga = await this.requireManga(dto.mangaId);
    if (manga.tipo !== 'novela')
      throw new BadRequestException(
        'Solo las novelas admiten capítulos de texto',
      );
    const res = await this.ds.transaction(async (em) => {
      const oldUrls = await this.prepareSlot(em, manga.id, dto);
      const cap = await em.save(
        Capitulo,
        em.create(Capitulo, {
          mangaId: manga.id,
          numero: dto.numero,
          titulo: dto.titulo ?? null,
          volumen: dto.volumen ?? null,
          contenidoTexto: dto.contenido,
        }),
      );
      await em.update(Manga, manga.id, { actualizadoEn: new Date() });
      if (oldUrls.length) void this.storage.deleteUrls(oldUrls);
      return { id: cap.id, numero: cap.numero };
    });
    if (!dto.reemplazar)
      void this.notifs
        .nuevoCapitulo(manga.id, res.numero)
        .catch((e) => this.log.error(e.message));
    return res;
  }

  async removeChapter(id: number) {
    const urls: { url: string }[] = await this.ds.query(
      'SELECT url FROM capitulo_paginas WHERE capitulo_id = $1',
      [id],
    );
    const res = await this.ds.getRepository(Capitulo).delete(id);
    if (!res.affected) throw new NotFoundException('Capítulo no encontrado');
    await this.storage.deleteUrls(urls.map((u) => u.url));
  }

  // ---------------- helpers ----------------
  private async requireManga(id: number) {
    const m = await this.ds.getRepository(Manga).findOne({ where: { id } });
    if (!m) throw new NotFoundException('Obra no encontrada');
    return m;
  }

  /** Si ya existe el nº de capítulo: 409, o lo elimina si `reemplazar`. Devuelve URLs antiguas a borrar. */
  private async prepareSlot(
    em: EntityManager,
    mangaId: number,
    dto: { numero: number; reemplazar?: boolean },
  ) {
    const existing = await em.findOne(Capitulo, {
      where: { mangaId, numero: dto.numero },
      select: { id: true },
    });
    if (!existing) return [];
    if (!dto.reemplazar)
      throw new ConflictException(
        `El capítulo ${dto.numero} ya existe (usa reemplazar=true)`,
      );
    const old: { url: string }[] = await em.query(
      'SELECT url FROM capitulo_paginas WHERE capitulo_id = $1',
      [existing.id],
    );
    await em.delete(Capitulo, existing.id);
    return old.map((o) => o.url);
  }

  private readImageEntries(zipPath: string) {
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipPath);
    } catch {
      throw new BadRequestException('El archivo no es un ZIP válido');
    }
    const entries = zip.getEntries().filter((e) => {
      const base = e.entryName.split('/').pop() ?? '';
      return (
        !e.isDirectory &&
        !e.entryName.includes('__MACOSX') &&
        !base.startsWith('.') &&
        IMAGE_RE.test(base)
      );
    });
    if (!entries.length)
      throw new BadRequestException('El ZIP no contiene imágenes');
    if (entries.length > MAX_PAGES)
      throw new BadRequestException(`Máximo ${MAX_PAGES} páginas por capítulo`);
    const total = entries.reduce((s, e) => s + e.header.size, 0);
    if (
      total > MAX_TOTAL_BYTES ||
      entries.some((e) => e.header.size > MAX_ENTRY_BYTES)
    ) {
      throw new PayloadTooLargeException(
        'El contenido descomprimido excede los límites permitidos',
      );
    }
    // Orden numérico natural: 1.jpg, 2.jpg, 10.jpg (no 1, 10, 2)
    entries.sort((a, b) =>
      a.entryName.localeCompare(b.entryName, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
    return entries;
  }
}
