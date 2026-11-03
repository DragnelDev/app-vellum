import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** Vistas agregadas por obra y día: alimenta el ranking semanal/mensual. */
@Entity('vistas_diarias')
@Index('idx_vistas_diarias_dia', ['dia'])
export class VistaDiaria {
  @PrimaryColumn({ type: 'int' }) mangaId: number;
  @PrimaryColumn({ type: 'date' }) dia: string;
  @Column({ type: 'int', default: 0 }) vistas: number;
}
