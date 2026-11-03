import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Capitulo } from './capitulo.entity';

@Entity('capitulo_paginas')
@Unique('uq_pagina_capitulo_orden', ['capituloId', 'orden'])
export class CapituloPagina {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) capituloId: number;
  @ManyToOne(() => Capitulo, (c) => c.paginas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'capitulo_id' })
  capitulo: Capitulo;
  @Column({ type: 'int' }) orden: number;
  @Column({ type: 'text' }) url: string;
  @Column({ type: 'int', nullable: true }) ancho: number | null;
  @Column({ type: 'int', nullable: true }) alto: number | null;
}
