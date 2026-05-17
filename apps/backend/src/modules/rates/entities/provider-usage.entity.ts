import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('provider_usage')
@Unique(['provider', 'month'])
export class ProviderUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  provider: string;

  @Column({ type: 'date' })
  month: string;

  @Column({ default: 0 })
  request_count: number;

  @Column()
  quota_limit: number;

  @Column({ default: true })
  is_healthy: boolean;

  @Column({ nullable: true, type: 'text' })
  last_error: string;

  @Column({ nullable: true })
  last_error_at: Date;

  @Column({ nullable: true })
  last_used_at: Date;
}
