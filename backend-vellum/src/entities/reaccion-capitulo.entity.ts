import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Capitulo } from './capitulo.entity';

export const EMOJIS_REACCION = ['🔥', '😍', '😂', '😮', '😭', '😡'] as const;

@Entity('reacciones_capitulo')
@Unique('uq_reaccion_capitulo_usuario', ['capituloId', 'usuarioId'])
@Index('idx_reaccion_capitulo', ['capituloId', 'emoji'])
export class ReaccionCapitulo {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) capituloId: number;
  @ManyToOne(() => Capitulo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'capitulo_id' })
  capitulo: Capitulo;
  @Column({ type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Column({ type: 'varchar', length: 16 }) emoji: string;
}
