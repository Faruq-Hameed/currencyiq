import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../api-keys/entities/api-key.entity';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(@InjectRepository(ApiKey) private apiKeyRepo: Repository<ApiKey>) {
    super();
  }

  async validate(req: Request): Promise<ApiKey> {
    const key = (req.headers['x-api-key'] as string) || (req.query['api_key'] as string);
    if (!key) throw new UnauthorizedException('API key required');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const apiKey = await this.apiKeyRepo.findOne({
      where: { key_hash: hash, is_active: true },
      relations: ['user'],
    });
    if (!apiKey) throw new UnauthorizedException('Invalid API key');
    await this.apiKeyRepo.update(apiKey.id, { last_used_at: new Date() });
    return apiKey;
  }
}
