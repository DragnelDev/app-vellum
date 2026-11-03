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

export type EstadoLectura = 'leyendo' | 'completado' | 'pendiente';
export const ESTADOS_LECTURA: EstadoLectura[] = [
  'leyendo',
  'completado',
  'pendiente',
];

@Entity('biblioteca_usuario')
@Unique('uq_biblioteca_usuario_manga', ['usuarioId', 'mangaId'])
@Index('idx_biblioteca_usuario_estado', ['usuarioId', 'estado'])
export class BibliotecaUsuario {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Column({ type: 'int' }) mangaId: number;
  @ManyToOne(() => Manga, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'manga_id' })
  manga: Manga;
  @Column({ type: 'varchar', length: 12, default: 'pendiente' })
  estado: EstadoLectura;
  @UpdateDateColumn({ type: 'timestamptz' }) actualizadoEn: Date;
}
