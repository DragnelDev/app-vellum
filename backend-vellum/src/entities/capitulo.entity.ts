import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Manga } from './manga.entity';
import { CapituloPagina } from './capitulo-pagina.entity';
import { numericTransformer } from '../common/utils/numeric.transformer';

@Entity('capitulos')
@Unique('uq_capitulo_manga_numero', ['mangaId', 'numero'])
@Index('idx_capitulos_publicado', ['publicadoEn'])
export class Capitulo {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) mangaId: number;
  @ManyToOne(() => Manga, (m) => m.capitulos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'manga_id' })
  manga: Manga;

  /** Soporta decimales: 130.5 */
  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: numericTransformer,
  })
  numero: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) titulo:
    string | null;
  @Column({ type: 'int', nullable: true }) volumen: number | null;
  @Column({ type: 'int', default: 0 }) vistas: number;
  /** Solo para novelas ligeras (texto del capítulo). */
  @Column({ type: 'text', nullable: true, select: false }) contenidoTexto:
    string | null;
  @Column({ type: 'timestamptz', default: () => 'now()' }) publicadoEn: Date;

  @OneToMany(() => CapituloPagina, (p) => p.capitulo) paginas: CapituloPagina[];
}
