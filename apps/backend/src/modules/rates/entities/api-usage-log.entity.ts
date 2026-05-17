import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApiKey } from '../../api-keys/entities/api-key.entity';

@Entity('api_usage_logs')
export class ApiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  api_key_id: string;

  @ManyToOne(() => ApiKey, { nullable: true })
  @JoinColumn({ name: 'api_key_id' })
  api_key: ApiKey;

  @Column({ nullable: true, length: 50 })
  ip: string;

  @Column({ nullable: true, length: 200 })
  endpoint: string;

  @Column({ nullable: true, length: 50 })
  action: string;

  @Column({ nullable: true, length: 50 })
  provider_used: string;

  @Column({ default: true })
  cached: boolean;

  @CreateDateColumn()
  created_at: Date;
}
