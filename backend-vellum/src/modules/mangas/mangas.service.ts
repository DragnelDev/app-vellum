import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Capitulo, CapituloPagina, Genero, Manga } from '../../entities';
import { slugify } from '../../common/utils/slug';
import { StorageService } from '../storage/storage.service';
import { ImagesService } from '../media/images.service';
import {
  ActualizarMangaDto,
  CrearMangaDto,
  ListarMangasDto,
} from './mangas.dto';

@Injectable()
export class MangasService {
  constructor(
    @InjectRepository(Manga) private readonly repo: Repository<Manga>,
    @InjectRepository(Genero) private readonly generosRepo: Repository<Genero>,
    private readonly ds: DataSource,
    private readonly storage: StorageService,
    private readonly images: ImagesService,
  ) {}

  async list(q: ListarMangasDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 24;
    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.generos', 'g');

    if (q.q?.trim()) {
      qb.andWhere('(m.titulo ILIKE :q OR m.tituloAlternativo ILIKE :q)', {
        q: `%${q.q.trim().replace(/[%_\\]/g, '\\$&')}%`,
      });
    }
    if (q.autor?.trim())
      qb.andWhere('m.autor ILIKE :autor', {
        autor: `%${q.autor.trim().replace(/[%_\\]/g, '\\$&')}%`,
      });
    if (q.conCapitulos)
      qb.andWhere(
        'EXISTS (SELECT 1 FROM capitulos cc WHERE cc.manga_id = m.id)',
      );
    if (q.tipo) qb.andWhere('m.tipo = :tipo', { tipo: q.tipo });
    if (q.estado) qb.andWhere('m.estado = :estado', { estado: q.estado });
    if (q.genero) {
      const slugs = q.genero
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      qb.andWhere(
        `EXISTS (SELECT 1 FROM manga_generos mg JOIN generos gg ON gg.id = mg.genero_id
                 WHERE mg.manga_id = m.id AND gg.slug IN (:...slugs))`,
        { slugs },
      );
    }
    switch (q.orden) {
      case 'populares':
        qb.orderBy('m.vistas', 'DESC');
        break;
      case 'titulo':
        qb.orderBy('m.titulo', 'ASC');
        break;
      case 'actualizados':
        qb.orderBy('m.actualizadoEn', 'DESC');
        break;
      default:
        qb.orderBy('m.creadoEn', 'DESC');
    }
    qb.addOrderBy('m.id', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    await this.attachLastChapter(items);
    return { items, total, page, limit };
  }

  /** Añade `ultimoCapitulo` con una sola consulta agregada para toda la página. */
  private async attachLastChapter(items: Manga[]) {
    if (!items.length) return;
    const rows: { manga_id: number; ultimo: string }[] = await this.ds.query(
      `SELECT manga_id, max(numero) AS ultimo FROM capitulos WHERE manga_id = ANY($1) GROUP BY manga_id`,
      [items.map((i) => i.id)],
    );
    const map = new Map(rows.map((r) => [r.manga_id, parseFloat(r.ultimo)]));
    for (const m of items) (m as any).ultimoCapitulo = map.get(m.id) ?? null;
  }

  /** Obras marcadas como destacadas (banner de portada). */
  async destacadas() {
    const items = await this.repo.find({
      where: { destacado: true },
      relations: { generos: true },
      order: { actualizadoEn: 'DESC' },
      take: 8,
    });
    await this.attachLastChapter(items);
    return items;
  }

  /** Ranking por vistas: semana / mes (vistas_diarias) o histórico total. */
  async ranking(periodo: string, limit = 10) {
    const dias = periodo === 'mes' ? 30 : periodo === 'semana' ? 7 : 0;
    if (!dias) {
      return this.ds.query(
        `SELECT id, titulo, slug, portada_url AS "portadaUrl", tipo, vistas FROM mangas ORDER BY vistas DESC, id LIMIT $1`,
        [limit],
      );
    }
    return this.ds.query(
      `SELECT m.id, m.titulo, m.slug, m.portada_url AS "portadaUrl", m.tipo, sum(v.vistas)::int AS vistas
         FROM vistas_diarias v JOIN mangas m ON m.id = v.manga_id
        WHERE v.dia > CURRENT_DATE - $2::int
        GROUP BY m.id ORDER BY vistas DESC, m.id LIMIT $1`,
      [limit, dias],
    );
  }

  /** Obras con géneros en común (más géneros compartidos primero; mismo tipo desempata). */
  async relacionadas(slug: string) {
    const m = await this.repo.findOne({
      where: { slug },
      select: { id: true, tipo: true },
    });
    if (!m) throw new NotFoundException('Obra no encontrada');
    return this.ds.query(
      `SELECT x.id, x.titulo, x.slug, x.portada_url AS "portadaUrl", x.tipo, count(*)::int AS comunes
         FROM manga_generos a
         JOIN manga_generos b ON b.genero_id = a.genero_id AND b.manga_id <> a.manga_id
         JOIN mangas x ON x.id = b.manga_id
        WHERE a.manga_id = $1
        GROUP BY x.id
        ORDER BY comunes DESC, (x.tipo = $2) DESC, x.vistas DESC LIMIT 12`,
      [m.id, m.tipo],
    );
  }

  async findBySlug(slug: string) {
    const manga = await this.repo.findOne({
      where: { slug },
      relations: { generos: true },
    });
    if (!manga) throw new NotFoundException('Obra no encontrada');
    const capitulos = await this.ds.getRepository(Capitulo).find({
      where: { mangaId: manga.id },
      select: {
        id: true,
        numero: true,
        titulo: true,
        volumen: true,
        vistas: true,
        publicadoEn: true,
      },
      order: { numero: 'DESC' },
    });
    return { ...manga, capitulos };
  }

  async byId(id: number) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Obra no encontrada');
    return m;
  }

  private async uniqueSlug(titulo: string, ignoreId?: number) {
    const base = slugify(titulo) || 'obra';
    let slug = base;
    for (let n = 2; ; n++) {
      const found = await this.repo.findOne({
        where: { slug },
        select: { id: true },
      });
      if (!found || found.id === ignoreId) return slug;
      slug = `${base}-${n}`;
    }
  }

  private async resolveGeneros(ids?: number[]) {
    return ids?.length ? this.generosRepo.find({ where: { id: In(ids) } }) : [];
  }

  async create(dto: CrearMangaDto) {
    const { generos, ...rest } = dto;
    const m = this.repo.create({
      ...rest,
      slug: await this.uniqueSlug(dto.titulo),
      generos: await this.resolveGeneros(generos),
    });
    return this.repo.save(m);
  }

  async update(id: number, dto: ActualizarMangaDto) {
    const m = await this.repo.findOne({
      where: { id },
      relations: { generos: true },
    });
    if (!m) throw new NotFoundException('Obra no encontrada');
    const { generos, ...rest } = dto;
    Object.assign(m, rest);
    if (generos) m.generos = await this.resolveGeneros(generos);
    return this.repo.save(m);
  }

  async setCover(id: number, file: Buffer) {
    const m = await this.byId(id);
    const img = await this.images.toWebpSingle(file, 600, 85);
    const key = `portadas/${m.id}-${Date.now().toString(36)}.webp`;
    const url = await this.storage.put({
      key,
      body: img.buffer,
      contentType: 'image/webp',
    });
    const old = m.portadaUrl;
    await this.repo.update(id, { portadaUrl: url });
    if (old) await this.storage.deleteUrls([old]);
    return { portadaUrl: url };
  }

  async remove(id: number) {
    const m = await this.byId(id);
    const pages: { url: string }[] = await this.ds
      .getRepository(CapituloPagina)
      .createQueryBuilder('p')
      .select('p.url', 'url')
      .innerJoin('p.capitulo', 'c')
      .where('c.mangaId = :id', { id })
      .getRawMany();
    await this.repo.delete(id); // ON DELETE CASCADE limpia capítulos, páginas, comentarios, etc.
    await this.storage.deleteUrls([
      ...(m.portadaUrl ? [m.portadaUrl] : []),
      ...pages.map((p) => p.url),
    ]);
  }
}
