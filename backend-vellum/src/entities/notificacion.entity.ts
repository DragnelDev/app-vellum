import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

export type TipoNotificacion = 'nuevo_capitulo' | 'respuesta' | 'sistema';

@Entity('notificaciones')
@Index('idx_notificaciones_usuario', ['usuarioId', 'leida', 'creadoEn'])
export class Notificacion {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Column({ type: 'varchar', length: 20 }) tipo: TipoNotificacion;
  @Column({ type: 'varchar', length: 255 }) titulo: string;
  @Column({ type: 'text', default: '' }) cuerpo: string;
  @Column({ type: 'text', nullable: true }) url: string | null;
  @Column({ default: false }) leida: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
}
