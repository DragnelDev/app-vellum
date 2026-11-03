import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { Comentario } from './comentario.entity';
import { Usuario } from './usuario.entity';

/** "Likes" a comentarios. */
@Entity('reacciones_comentarios')
@Unique('uq_reaccion_comentario_usuario', ['comentarioId', 'usuarioId'])
export class ReaccionComentario {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) comentarioId: number;
  @ManyToOne(() => Comentario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comentario_id' })
  comentario: Comentario;
  @Column({ type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
}
