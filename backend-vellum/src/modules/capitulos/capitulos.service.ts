import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Capitulo,
  CapituloPagina,
  HistorialLectura,
  Manga,
} from '../../entities';
import { UltimosDto } from './capitulos.dto';

@Injectable()
export class CapitulosService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(Capitulo) private readonly caps: Repository<Capitulo>,
    @InjectRepository(CapituloPagina)
    private readonly paginas: Repository<CapituloPagina>,
    @InjectRepository(Manga) private readonly mangas: Repository<Manga>,
    @InjectRepository(HistorialLectura)
    private readonly historial: Repository<HistorialLectura>,
  ) {}

  /** Listado cronológico global de "Últimos capítulos". */
  async ultimos(q: UltimosDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 24;
    const qb = this.caps
      .createQueryBuilder('c')
      .innerJoin('c.manga', 'm')
      .select(['c.id', 'c.numero', 'c.titulo', 'c.volumen', 'c.publicadoEn'])
      .addSelect(['m.id', 'm.titulo', 'm.slug', 'm.portadaUrl', 'm.tipo'])
      .orderBy('c.publicadoEn', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (q.tipo) qb.where('m.tipo = :tipo', { tipo: q.tipo });
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /** Capítulo para el lector: páginas ordenadas + navegación + progreso del usuario. */
  async lector(slug: string, numero: number, userId?: string) {
    const manga = await this.mangas.findOne({
      where: { slug },
      select: {
        id: true,
        titulo: true,
        slug: true,
        tipo: true,
        portadaUrl: true,
      },
    });
    if (!manga) throw new NotFoundException('Obra no encontrada');

    const cap = await this.caps
      .createQueryBuilder('c')
      .addSelect('c.contenidoTexto')
      .where('c.mangaId = :id AND c.numero = :numero', { id: manga.id, numero })
      .getOne();
    if (!cap) throw new NotFoundException('Capítulo no encontrado');

    const [paginas, anterior, siguiente, progreso] = await Promise.all([
      cap.contenidoTexto !== null && manga.tipo === 'novela'
        ? Promise.resolve([])
        : this.paginas.find({
            where: { capituloId: cap.id },
            select: { orden: true, url: true, ancho: true, alto: true },
            order: { orden: 'ASC' },
          }),
      this.adjacent(manga.id, numero, 'prev'),
      this.adjacent(manga.id, numero, 'next'),
      userId
        ? this.historial.findOne({
            where: { usuarioId: userId, mangaId: manga.id, capituloId: cap.id },
          })
        : null,
    ]);

    const lista: { numero: string; titulo: string | null }[] =
      await this.ds.query(
        'SELECT numero, titulo FROM capitulos WHERE manga_id = $1 ORDER BY numero DESC',
        [manga.id],
      );
    const { contenidoTexto, ...capitulo } = cap;
    return {
      manga,
      capitulo: { ...capitulo, contenido: contenidoTexto },
      paginas,
      anterior,
      siguiente,
      capitulos: lista.map((c) => ({
        numero: parseFloat(c.numero),
        titulo: c.titulo,
      })),
      progreso: progreso ? { pagina: progreso.pagina } : null,
    };
  }

  private async adjacent(
    mangaId: number,
    numero: number,
    dir: 'prev' | 'next',
  ) {
    const rows: { numero: string }[] = await this.ds.query(
      dir === 'prev'
        ? `SELECT numero FROM capitulos WHERE manga_id = $1 AND numero < $2 ORDER BY numero DESC LIMIT 1`
        : `SELECT numero FROM capitulos WHERE manga_id = $1 AND numero > $2 ORDER BY numero ASC LIMIT 1`,
      [mangaId, numero],
    );
    return rows[0] ? { numero: parseFloat(rows[0].numero) } : null;
  }

  async registrarVista(id: number) {
    const rows: { manga_id: number }[] = await this.ds.query(
      `UPDATE capitulos SET vistas = vistas + 1 WHERE id = $1 RETURNING manga_id`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Capítulo no encontrado');
    await this.ds.query(`UPDATE mangas SET vistas = vistas + 1 WHERE id = $1`, [
      rows[0].manga_id,
    ]);
    await this.ds.query(
      `INSERT INTO vistas_diarias (manga_id, dia, vistas) VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (manga_id, dia) DO UPDATE SET vistas = vistas_diarias.vistas + 1`,
      [rows[0].manga_id],
    );
    return { ok: true };
  }

  async actualizar(
    id: number,
    data: { titulo?: string; volumen?: number; numero?: number },
  ) {
    try {
      const res = await this.caps.update(id, data);
      if (!res.affected) throw new NotFoundException('Capítulo no encontrado');
    } catch (e) {
      if ((e as { code?: string }).code === '23505')
        throw new ConflictException('Ya existe un capítulo con ese número');
      throw e;
    }
    return { ok: true };
  }
}
