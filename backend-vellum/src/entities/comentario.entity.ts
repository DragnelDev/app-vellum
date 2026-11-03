import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Capitulo } from './capitulo.entity';
import { ComentarioMultimedia } from './comentario-multimedia.entity';

@Entity('comentarios')
@Index('idx_comentarios_capitulo', [
  'capituloId',
  'comentarioPadreId',
  'creadoEn',
])
@Index('idx_comentarios_padre', ['comentarioPadreId'])
export class Comentario {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) capituloId: number;
  @ManyToOne(() => Capitulo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'capitulo_id' })
  capitulo: Capitulo;
  @Column({ type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  /** Respuestas anidadas */
  @Column({ type: 'int', nullable: true }) comentarioPadreId: number | null;
  @ManyToOne(() => Comentario, (c) => c.respuestas, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'comentario_padre_id' })
  padre: Comentario | null;
  @OneToMany(() => Comentario, (c) => c.padre) respuestas: Comentario[];
  @Column({ type: 'text' }) contenido: string;
  @Column({ default: false }) eliminado: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
  @OneToMany(() => ComentarioMultimedia, (m) => m.comentario)
  multimedia: ComentarioMultimedia[];
}
