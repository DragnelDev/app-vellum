import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Comentario } from './comentario.entity';

export type TipoMultimedia = 'imagen' | 'gif' | 'sticker';
export const TIPOS_MULTIMEDIA: TipoMultimedia[] = ['imagen', 'gif', 'sticker'];

@Entity('comentario_multimedia')
export class ComentarioMultimedia {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) comentarioId: number;
  @ManyToOne(() => Comentario, (c) => c.multimedia, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comentario_id' })
  comentario: Comentario;
  @Column({ type: 'varchar', length: 10 }) tipo: TipoMultimedia;
  @Column({ type: 'text' }) url: string;
  @Column({ type: 'int', nullable: true }) ancho: number | null;
  @Column({ type: 'int', nullable: true }) alto: number | null;
}
