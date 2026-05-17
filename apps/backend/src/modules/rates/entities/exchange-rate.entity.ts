import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('exchange_rates')
@Index('idx_rates_pair_time', ['base', 'quote', 'fetched_at'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  base: string;

  @Column({ length: 10 })
  quote: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  rate: number;

  @Column({ length: 50 })
  provider: string;

  @Column()
  fetched_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
