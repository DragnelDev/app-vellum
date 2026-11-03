import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Comentario } from './comentario.entity';
import { Usuario } from './usuario.entity';

export type EstadoReporte = 'pendiente' | 'resuelto' | 'descartado';

@Entity('reportes_comentarios')
@Unique('uq_reporte_comentario_usuario', ['comentarioId', 'usuarioId'])
export class ReporteComentario {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) comentarioId: number;
  @ManyToOne(() => Comentario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comentario_id' })
  comentario: Comentario;
  @Column({ type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Column({ type: 'varchar', length: 40 }) motivo: string;
  @Column({ type: 'varchar', length: 300, nullable: true }) detalle:
    string | null;
  @Column({ type: 'varchar', length: 12, default: 'pendiente' })
  estado: EstadoReporte;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
}
