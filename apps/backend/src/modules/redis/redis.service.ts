import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  // Upstash's REST client avoids holding a TCP connection open per serverless invocation.
  // automaticDeserialization is disabled so get()/set() behave identically to ioredis
  // (raw strings in/out) — getJson/setJson already handle JSON themselves.
  private upstash: UpstashRedis | null = null;

  constructor(private config: ConfigService) {
    const restUrl = config.get<string>('redis.restUrl');
    const restToken = config.get<string>('redis.restToken');
    if (restUrl && restToken) {
      this.upstash = new UpstashRedis({ url: restUrl, token: restToken, automaticDeserialization: false });
      return;
    }

    const url = config.get<string>('redis.url');
    this.client = url
      ? new Redis(url, { lazyConnect: true })
      : new Redis({
          host: config.get<string>('redis.host') || 'localhost',
          port: config.get<number>('redis.port') || 6379,
          password: config.get<string>('redis.password') || undefined,
          tls: config.get<boolean>('redis.tls') ? {} : undefined,
          lazyConnect: true,
        });
    this.client.on('error', (err) => this.logger.error('Redis error', err));
    this.client.connect().catch(() => this.logger.warn('Redis not connected — caching disabled'));
  }

  async get(key: string): Promise<string | null> {
    try {
      return this.upstash ? await this.upstash.get<string>(key) : await this.client!.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (this.upstash) {
        if (ttlSeconds) await this.upstash.set(key, value, { ex: ttlSeconds });
        else await this.upstash.set(key, value);
        return;
      }
      if (ttlSeconds) {
        await this.client!.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client!.set(key, value);
      }
    } catch (e) {
      this.logger.warn(`Redis set failed: ${e.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.upstash) await this.upstash.del(key);
      else await this.client!.del(key);
    } catch {}
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      // Use SCAN to avoid blocking Redis in production (KEYS can block on large datasets)
      let cursor: string | number = '0';
      do {
        if (this.upstash) {
          const result: [string, string[]] = await this.upstash.scan(cursor, { match: pattern, count: 100 });
          cursor = result[0];
          if (result[1].length) await this.upstash.del(...result[1]);
        } else {
          const result: [string, string[]] = await this.client!.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = result[0];
          if (result[1].length) await this.client!.del(...result[1]);
        }
      } while (cursor !== '0');
    } catch {}
  }

  async incr(key: string): Promise<number> {
    try {
      return this.upstash ? await this.upstash.incr(key) : await this.client!.incr(key);
    } catch {
      return 0;
    }
  }

  async incrBy(key: string, amount: number): Promise<number> {
    try {
      return this.upstash ? await this.upstash.incrby(key, amount) : await this.client!.incrby(key, amount);
    } catch {
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      if (this.upstash) await this.upstash.expire(key, ttlSeconds);
      else await this.client!.expire(key, ttlSeconds);
    } catch {}
  }

  async ttl(key: string): Promise<number> {
    try {
      return this.upstash ? await this.upstash.ttl(key) : await this.client!.ttl(key);
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
    this.client?.disconnect();
  }
}
