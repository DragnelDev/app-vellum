import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

export type ModoLectura = 'vertical' | 'paginado' | 'paginado_rtl';
export type SeparacionVinetas = 'sin_espacio' | 'fina' | 'amplia';

@Entity('preferencias_usuario')
export class PreferenciaUsuario {
  @PrimaryColumn('uuid') usuarioId: string;
  @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 8, default: 'oscuro' }) tema:
    'oscuro' | 'claro';
  @Column({ type: 'varchar', length: 9, default: '#0f172a' })
  colorFondo: string;
  @Column({ type: 'varchar', length: 9, default: '#f59e0b' })
  colorAcento: string;
  /** Ancho máximo de página en px (webtoon) */
  @Column({ type: 'int', default: 800 }) anchoPagina: number;
  @Column({ type: 'varchar', length: 12, default: 'sin_espacio' })
  separacionVinetas: SeparacionVinetas;
  /** Brillo en % (40-100) */
  @Column({ type: 'int', default: 100 }) brillo: number;
  @Column({ default: true }) gestosTactiles: boolean;
  @Column({ default: true }) ocultarBarras: boolean;
  @Column({ type: 'varchar', length: 14, default: 'vertical' })
  modoLectura: ModoLectura;
  /** Tamaño de fuente para novelas ligeras (px) */
  @Column({ type: 'int', default: 18 }) tamanoFuente: number;
  @UpdateDateColumn({ type: 'timestamptz' }) actualizadoEn: Date;
}
