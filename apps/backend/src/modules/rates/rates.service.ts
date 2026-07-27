import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { ProviderManagerService } from './provider-manager.service';
import { RedisService } from '../redis/redis.service';
import { HistoricalRate } from './providers/provider.interface';

const HOUR = 3600;
const DAY = 86400;

@Injectable()
export class RatesService {
  private readonly logger = new Logger(RatesService.name);

  constructor(
    private providerManager: ProviderManagerService,
    private redis: RedisService,
    @InjectRepository(ExchangeRate) private ratesRepo: Repository<ExchangeRate>,
  ) {}

  async getAllRates(base: string): Promise<{ rates: Record<string, number>; meta: object }> {
    const cacheKey = `rates:all:${base}`;
    const cached = await this.redis.getJson<{ rates: Record<string, number>; fetched_at: string; source: string }>(cacheKey);
    if (cached) {
      return {
        rates: cached.rates,
        meta: { cached: true, fetched_at: cached.fetched_at, source: cached.source, stale: false },
      };
    }

    const { rates, provider, stale } = await this.providerManager.getRates(base);
    const now = new Date().toISOString();
    await this.redis.setJson(cacheKey, { rates, fetched_at: now, source: provider }, HOUR);

    return {
      rates,
      meta: {
        cached: false,
        fetched_at: now,
        next_auto_refresh: new Date(Date.now() + HOUR * 1000).toISOString(),
        source: provider,
        stale,
      },
    };
  }

  async convert(from: string, to: string, amount: number) {
    if (from === to) {
      return { from, to, amount, result: amount, rate: 1, meta: { cached: true, source: 'identity' } };
    }
    const cacheKey = `rates:pair:${from}:${to}`;
    const cached = await this.redis.getJson<{ rate: number; fetched_at: string; source: string }>(cacheKey);

    let rate: number;
    let meta: object;

    if (cached) {
      rate = cached.rate;
      meta = { cached: true, fetched_at: cached.fetched_at, source: cached.source, stale: false };
    } else {
      const result = await this.providerManager.getRate(from, to);
      rate = result.rate;
      const now = new Date().toISOString();
      await this.redis.setJson(cacheKey, { rate, fetched_at: now, source: result.provider }, HOUR);
      await this.saveRate(from, to, rate, result.provider);
      meta = {
        cached: false,
        fetched_at: now,
        next_auto_refresh: new Date(Date.now() + HOUR * 1000).toISOString(),
        source: result.provider,
        stale: result.stale,
      };
    }

    return { from, to, amount, result: amount * rate, rate, meta };
  }

  async convertMulti(from: string, targets: string[], amount: number) {
    const results = await Promise.all(
      targets.map(async (to) => {
        try {
          const r = await this.convert(from, to, amount);
          return { currency: to, result: r.result, rate: r.rate };
        } catch {
          return { currency: to, result: null, rate: null };
        }
      }),
    );
    return { from, amount, conversions: results };
  }

  async forceRefresh(from: string, to: string, apiKey: string | null, ip: string): Promise<{ fresh: boolean; reason?: string; data?: any }> {
    const dayEnd = this.getEndOfDayTTL();
    const refreshLimitKey = apiKey ? `refresh:apikey:${apiKey}` : `refresh:ip:${ip}`;
    const maxRefreshes = apiKey ? 5 : 1;
    const count = await this.redis.incr(refreshLimitKey);
    if (count === 1) await this.redis.expire(refreshLimitKey, dayEnd);
    if (count > maxRefreshes) {
      return { fresh: false, reason: 'quota_exceeded' };
    }

    try {
      const result = await this.providerManager.getRate(from, to);
      const now = new Date().toISOString();

      await this.redis.del(`rates:pair:${from}:${to}`);
      await this.redis.del(`rates:pair:${to}:${from}`);
      await this.redis.delPattern(`rates:all:*`);

      await this.redis.setJson(`rates:pair:${from}:${to}`, { rate: result.rate, fetched_at: now, source: result.provider }, HOUR);
      await this.saveRate(from, to, result.rate, result.provider);

      return {
        fresh: true,
        data: {
          from, to, rate: result.rate,
          meta: { cached: false, fetched_at: now, source: result.provider, stale: result.stale },
        },
      };
    } catch (e) {
      return { fresh: false, reason: e.message };
    }
  }

  async getHistory(from: string, to: string, period: string): Promise<{ data: HistoricalRate[]; meta: object }> {
    const cacheKey = `rates:history:${from}:${to}:${period}`;
    const cached = await this.redis.getJson<HistoricalRate[]>(cacheKey);
    if (cached) {
      return { data: cached, meta: { cached: true } };
    }

    const { startDate, endDate } = this.periodToDates(period);

    // Try DB first
    const dbRates = await this.ratesRepo.find({
      where: { base: from, quote: to, fetched_at: MoreThan(new Date(startDate)) },
      order: { fetched_at: 'ASC' },
    });

    let history: HistoricalRate[];
    if (dbRates.length >= 7) {
      history = dbRates
        .filter((r) => r.fetched_at != null)
        .map((r) => ({ date: r.fetched_at.toISOString().split('T')[0], rate: Number(r.rate) || 0 }));
    } else {
      history = await this.providerManager.getHistorical(from, to, startDate, endDate);
    }

    await this.redis.setJson(cacheKey, history, DAY);
    return { data: history, meta: { cached: false } };
  }

  async syncAllRates(bases: string[]): Promise<void> {
    // Each base is independent — run concurrently so the whole batch stays well within
    // a serverless function's time budget instead of paying every provider failover's
    // latency N times over sequentially.
    await Promise.all(
      bases.map(async (base) => {
        try {
          const { rates, provider } = await this.providerManager.getRates(base);
          const now = new Date();
          const entities = Object.entries(rates).map(([quote, rate]) => ({
            base,
            quote,
            rate,
            provider,
            fetched_at: now,
          }));
          // Each sync is a fresh historical snapshot — insert new rows
          await this.ratesRepo.insert(entities).catch(() => {
            // Batch insert on conflict (same second) — skip silently
          });
          await this.redis.setJson(`rates:all:${base}`, { rates, fetched_at: now.toISOString(), source: provider }, HOUR);
        } catch (e) {
          this.logger.error(`Failed to sync rates for ${base}: ${e.message}`);
        }
      }),
    );
    await this.redis.set('rates:last_fetched', new Date().toISOString());
  }

  private async saveRate(base: string, quote: string, rate: number, provider: string): Promise<void> {
    try {
      // Each fetch is a new snapshot row for historical tracking
      await this.ratesRepo.insert({ base, quote, rate, provider, fetched_at: new Date() });
    } catch (e) {
      // Ignore duplicate key on same second; not critical
      if (!String(e.message).includes('duplicate')) {
        this.logger.warn(`Failed to save rate to DB: ${e.message}`);
      }
    }
  }

  private periodToDates(period: string): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    const map: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = map[period] || 7;
    start.setDate(start.getDate() - days);
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  }

  private getEndOfDayTTL(): number {
    const now = new Date();
    // Use UTC midnight to be consistent across server timezones
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
  }
}
