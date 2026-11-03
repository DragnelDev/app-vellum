import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Genero } from './genero.entity';
import { Capitulo } from './capitulo.entity';

export type TipoObra = 'manga' | 'manhwa' | 'manhua' | 'novela';
export type EstadoObra = 'en_emision' | 'finalizado' | 'pausado' | 'cancelado';
export const TIPOS: TipoObra[] = ['manga', 'manhwa', 'manhua', 'novela'];
export const ESTADOS: EstadoObra[] = [
  'en_emision',
  'finalizado',
  'pausado',
  'cancelado',
];

@Entity('mangas')
@Index('idx_mangas_tipo_estado', ['tipo', 'estado'])
@Index('idx_mangas_vistas', ['vistas'])
export class Manga {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 255 }) titulo: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) tituloAlternativo:
    string | null;
  @Column({ length: 140, unique: true }) slug: string;
  @Column({ type: 'text', default: '' }) sinopsis: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) autor:
    string | null;
  @Column({ type: 'text', nullable: true }) portadaUrl: string | null;
  @Column({ type: 'varchar', length: 10, default: 'manga' }) tipo: TipoObra;
  @Column({ type: 'varchar', length: 12, default: 'en_emision' })
  estado: EstadoObra;
  @Column({ type: 'int', default: 0 }) vistas: number;
  /** Aparece en el banner de la portada. */
  @Column({ default: false }) destacado: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) actualizadoEn: Date;

  @ManyToMany(() => Genero, { cascade: false })
  @JoinTable({
    name: 'manga_generos',
    joinColumn: { name: 'manga_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genero_id', referencedColumnName: 'id' },
  })
  generos: Genero[];

  @OneToMany(() => Capitulo, (c) => c.manga) capitulos: Capitulo[];
}
