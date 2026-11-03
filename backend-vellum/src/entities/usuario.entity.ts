import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type Rol = 'admin' | 'uploader' | 'lector';
export const ROLES: Rol[] = ['admin', 'uploader', 'lector'];

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 32, unique: true }) username: string;
  @Column({ length: 255, unique: true }) email: string;
  @Column({ type: 'varchar', length: 255, select: false }) passwordHash: string;
  @Column({ type: 'text', nullable: true }) avatarUrl: string | null;
  @Column({ type: 'varchar', length: 16, default: 'lector' }) rol: Rol;
  @Column({ default: true }) activo: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) actualizadoEn: Date;
}
