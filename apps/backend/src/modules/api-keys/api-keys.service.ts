import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { ApiUsageLog } from '../rates/entities/api-usage-log.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey) private repo: Repository<ApiKey>,
    @InjectRepository(ApiUsageLog) private logsRepo: Repository<ApiUsageLog>,
  ) {}

  async create(userId: string, name?: string): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const plain = 'ciq_' + crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(plain).digest('hex');
    const prefix = plain.slice(0, 12);

    const apiKey = this.repo.create({ user_id: userId, key_hash: hash, key_prefix: prefix, name });
    await this.repo.save(apiKey);
    return { apiKey, plainKey: plain };
  }

  async listForUser(userId: string): Promise<ApiKey[]> {
    return this.repo.find({ where: { user_id: userId }, order: { created_at: 'DESC' } });
  }

  async revoke(id: string, userId: string): Promise<void> {
    const key = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.repo.update(id, { is_active: false });
  }

  async getUsage(id: string, userId: string) {
    const key = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!key) throw new NotFoundException('API key not found');

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [monthCount, todayCount] = await Promise.all([
      this.logsRepo
        .createQueryBuilder('log')
        .where('log.api_key_id = :id', { id })
        .andWhere('log.created_at >= :startOfMonth', { startOfMonth })
        .getCount(),
      this.logsRepo
        .createQueryBuilder('log')
        .where('log.api_key_id = :id', { id })
        .andWhere('log.created_at >= :startOfToday', { startOfToday })
        .getCount(),
    ]);

    return { key_prefix: key.key_prefix, name: key.name, requests_today: todayCount, requests_this_month: monthCount };
  }
}
