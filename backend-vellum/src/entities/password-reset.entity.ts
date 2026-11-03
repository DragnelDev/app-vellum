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

/** Tokens de recuperación (se guarda solo el hash SHA-256). */
@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  tokenHash: string;
  @Column({ type: 'timestamptz' }) expiraEn: Date;
  @Column({ default: false }) usado: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
}
