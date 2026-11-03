import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('generos')
export class Genero {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 60, unique: true }) nombre: string;
  @Column({ length: 80, unique: true }) slug: string;
}
