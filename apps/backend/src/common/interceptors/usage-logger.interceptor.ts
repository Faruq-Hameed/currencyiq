import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ApiUsageLog } from '../../modules/rates/entities/api-usage-log.entity';
import { ApiKey } from '../../modules/api-keys/entities/api-key.entity';

@Injectable()
export class UsageLoggerInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(ApiUsageLog) private logsRepo: Repository<ApiUsageLog>,
    @InjectRepository(ApiKey) private keysRepo: Repository<ApiKey>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const url: string = req.url || '';

    // Only log rate/currency API calls
    if (!url.includes('/rates') && !url.includes('/currencies')) {
      return next.handle();
    }

    const rawKey = (req.headers['x-api-key'] as string) || (req.query?.api_key as string);
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    const action = url.includes('convert/multi') ? 'convert_multi'
      : url.includes('convert') ? 'convert'
      : url.includes('refresh') ? 'refresh'
      : url.includes('history') ? 'history'
      : url.includes('/rates') ? 'rates'
      : 'currency_info';

    return next.handle().pipe(
      tap(async (data) => {
        try {
          let apiKeyId: string | undefined;
          if (rawKey) {
            const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
            const keyRecord = await this.keysRepo.findOne({ where: { key_hash: hash } });
            if (keyRecord) apiKeyId = keyRecord.id;
          }

          const cached = !!(data?.meta?.cached ?? data?.data?.meta?.cached ?? true);
          const providerUsed = data?.meta?.source || data?.data?.meta?.source || null;

          await this.logsRepo.insert({
            api_key_id: apiKeyId || undefined,
            ip,
            endpoint: url.split('?')[0],
            action,
            provider_used: providerUsed,
            cached,
          });
        } catch {
          // Non-critical — don't let logging failure affect response
        }
      }),
    );
  }
}
