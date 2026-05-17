import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private config: ConfigService) {
    this.client = new Redis({
      host: config.get<string>('redis.host') || 'localhost',
      port: config.get<number>('redis.port') || 6379,
      password: config.get<string>('redis.password') || undefined,
      lazyConnect: true,
    });
    this.client.on('error', (err) => this.logger.error('Redis error', err));
    this.client.connect().catch(() => this.logger.warn('Redis not connected — caching disabled'));
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (e) {
      this.logger.warn(`Redis set failed: ${e.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {}
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      // Use SCAN to avoid blocking Redis in production (KEYS can block on large datasets)
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) await this.client.del(...keys);
      } while (cursor !== '0');
    } catch {}
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  async incrBy(key: string, amount: number): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch {
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
    } catch {}
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch {
      return -1;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const val = await this.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
