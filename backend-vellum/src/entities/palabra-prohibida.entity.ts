import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('palabras_prohibidas')
export class PalabraProhibida {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 80, unique: true }) palabra: string;
}
