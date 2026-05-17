import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Banknote } from './banknote.entity';

@Entity('currencies')
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 10 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 10 })
  symbol: string;

  @Column({ nullable: true, length: 50 })
  subunit: string;

  @Column({ default: 100 })
  subunit_to_unit: number;

  @Column({ nullable: true, type: 'text' })
  flag_url: string;

  @Column({ type: 'text', array: true, nullable: true })
  countries: string[];

  @Column({ type: 'text', array: true, nullable: true })
  country_codes: string[];

  @Column({ nullable: true, length: 200 })
  central_bank: string;

  @Column({ nullable: true, type: 'text' })
  central_bank_url: string;

  @Column({ nullable: true, length: 50 })
  currency_type: string;

  @Column({ nullable: true, length: 50 })
  exchange_regime: string;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => Banknote, (b) => b.currency)
  banknotes: Banknote[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
