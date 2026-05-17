import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ unique: true })
  key_hash: string;

  @Column()
  key_prefix: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  last_used_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
