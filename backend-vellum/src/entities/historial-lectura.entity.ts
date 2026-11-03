import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Manga } from './manga.entity';
import { Capitulo } from './capitulo.entity';

@Entity('historial_lectura')
@Unique('uq_historial_usuario_manga', ['usuarioId', 'mangaId'])
@Index('idx_historial_usuario_fecha', ['usuarioId', 'actualizadoEn'])
export class HistorialLectura {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Column({ type: 'int' }) mangaId: number;
  @ManyToOne(() => Manga, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'manga_id' })
  manga: Manga;
  @Column({ type: 'int' }) capituloId: number;
  @ManyToOne(() => Capitulo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'capitulo_id' })
  capitulo: Capitulo;
  /** Última página leída (índice base 1) */
  @Column({ type: 'int', default: 1 }) pagina: number;
  @UpdateDateColumn({ type: 'timestamptz' }) actualizadoEn: Date;
}
