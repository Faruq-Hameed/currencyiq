import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (limit: number, windowSeconds: number) =>
  (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, { limit, windowSeconds }, descriptor?.value || target);
    return descriptor;
  };

@Injectable()
export class RedisThrottleGuard implements CanActivate {
  constructor(private redis: RedisService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const meta = this.reflector.get<{ limit: number; windowSeconds: number }>(RATE_LIMIT_KEY, handler);
    if (!meta) return true;

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const apiKey = req.headers['x-api-key'] || req.query['api_key'];
    const ip = req.ip || req.connection.remoteAddress;

    const identifier = apiKey
      ? `ratelimit:key:${crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16)}`
      : `ratelimit:ip:${ip}`;

    const limit = apiKey ? meta.limit : Math.floor(meta.limit / 10);
    const windowKey = `${identifier}:${meta.windowSeconds}`;

    const current = await this.redis.incr(windowKey);
    if (current === 1) await this.redis.expire(windowKey, meta.windowSeconds);

    const ttl = await this.redis.ttl(windowKey);
    const reset = Math.floor(Date.now() / 1000) + ttl;

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));
    res.setHeader('X-RateLimit-Reset', reset);
    res.setHeader('X-RateLimit-Window', meta.windowSeconds);

    if (current > limit) {
      const resetAt = new Date(reset * 1000).toISOString();
      const minutesLeft = Math.ceil(ttl / 60);
      throw new HttpException(
        {
          success: false,
          data: null,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Resets in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
            reset_at: resetAt,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
