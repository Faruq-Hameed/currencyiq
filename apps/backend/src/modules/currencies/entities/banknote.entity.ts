import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Currency } from './currency.entity';

@Entity('banknotes')
export class Banknote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Currency, (c) => c.banknotes)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @Column()
  currency_id: string;

  @Column({ type: 'decimal', precision: 20, scale: 4 })
  denomination: number;

  @Column({ nullable: true, length: 50 })
  label: string;

  @Column({ default: 'note', length: 20 })
  type: string;
}
