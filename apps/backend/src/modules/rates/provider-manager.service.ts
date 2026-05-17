import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderUsage } from './entities/provider-usage.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { RedisService } from '../redis/redis.service';
import { IRateProvider, HistoricalRate } from './providers/provider.interface';
import { OpenExchangeProvider } from './providers/open-exchange.provider';
import { FrankfurterProvider, FRANKFURTER_CURRENCIES } from './providers/frankfurter.provider';
import { ExchangeRateApiProvider } from './providers/exchangerate-api.provider';
import { CurrencyFreaksProvider } from './providers/currencyfreaks.provider';
import { FawazAhmedProvider } from './providers/fawaz-ahmed.provider';

@Injectable()
export class ProviderManagerService {
  private readonly logger = new Logger(ProviderManagerService.name);
  private providers: IRateProvider[];

  constructor(
    private openExchange: OpenExchangeProvider,
    private frankfurter: FrankfurterProvider,
    private exchangeRateApi: ExchangeRateApiProvider,
    private currencyFreaks: CurrencyFreaksProvider,
    private fawazAhmed: FawazAhmedProvider,
    @InjectRepository(ProviderUsage) private usageRepo: Repository<ProviderUsage>,
    @InjectRepository(ExchangeRate) private ratesRepo: Repository<ExchangeRate>,
    private redis: RedisService,
  ) {
    this.providers = [openExchange, frankfurter, exchangeRateApi, currencyFreaks, fawazAhmed];
  }

  private getProvidersForPair(from: string, to: string): IRateProvider[] {
    const involves = (c: string) => from === c || to === c;

    if (involves('USD')) {
      return [this.openExchange, this.frankfurter, this.exchangeRateApi, this.currencyFreaks, this.fawazAhmed];
    }
    const bothInFrankfurter = FRANKFURTER_CURRENCIES.includes(from) && FRANKFURTER_CURRENCIES.includes(to);
    if (involves('EUR') || bothInFrankfurter) {
      return [this.frankfurter, this.exchangeRateApi, this.currencyFreaks, this.fawazAhmed];
    }
    return [this.exchangeRateApi, this.currencyFreaks, this.fawazAhmed];
  }

  async getRate(from: string, to: string): Promise<{ rate: number; provider: string; stale: boolean }> {
    const providers = this.getProvidersForPair(from, to);

    for (const provider of providers) {
      const healthKey = `provider:health:${provider.name}`;
      const isUnhealthy = await this.redis.get(healthKey);
      if (isUnhealthy === 'false') continue;

      const usage = await this.getUsage(provider.name);
      if (usage && usage.request_count >= usage.quota_limit) continue;

      try {
        const rate = await provider.getRate(from, to);
        await this.logUsage(provider.name, provider.quotaLimit);
        return { rate, provider: provider.name, stale: false };
      } catch (e) {
        this.logger.warn(`Provider ${provider.name} failed: ${e.message}`);
        await this.redis.set(healthKey, 'false', 600);
        await this.markProviderError(provider.name, e.message);
      }
    }

    // fallback to DB
    const lastRate = await this.ratesRepo.findOne({
      where: { base: from, quote: to },
      order: { fetched_at: 'DESC' },
    });
    if (lastRate) {
      return { rate: Number(lastRate.rate), provider: lastRate.provider, stale: true };
    }
    throw new Error(`No rate available for ${from}/${to}`);
  }

  async getRates(base: string): Promise<{ rates: Record<string, number>; provider: string; stale: boolean }> {
    const providers = this.getProvidersForPair(base, 'USD');
    for (const provider of providers) {
      const healthKey = `provider:health:${provider.name}`;
      const isUnhealthy = await this.redis.get(healthKey);
      if (isUnhealthy === 'false') continue;

      const usage = await this.getUsage(provider.name);
      if (usage && usage.request_count >= usage.quota_limit) continue;

      try {
        const rates = await provider.getRates(base);
        await this.logUsage(provider.name, provider.quotaLimit);
        return { rates, provider: provider.name, stale: false };
      } catch (e) {
        this.logger.warn(`Provider ${provider.name} getRates failed: ${e.message}`);
        await this.redis.set(`provider:health:${provider.name}`, 'false', 600);
        await this.markProviderError(provider.name, e.message);
      }
    }
    // Fallback: return last known rates from DB grouped by base
    const lastRates = await this.ratesRepo.find({
      where: { base },
      order: { fetched_at: 'DESC' },
      take: 200,
    });
    if (lastRates.length > 0) {
      const rates: Record<string, number> = {};
      const seen = new Set<string>();
      for (const r of lastRates) {
        if (!seen.has(r.quote)) { rates[r.quote] = Number(r.rate); seen.add(r.quote); }
      }
      return { rates, provider: lastRates[0].provider, stale: true };
    }
    throw new Error(`No rates available for base ${base}`);
  }

  async getHistorical(from: string, to: string, startDate: string, endDate: string): Promise<HistoricalRate[]> {
    const providers = this.getProvidersForPair(from, to).filter((p) => p.supportsHistorical);
    for (const provider of providers) {
      try {
        return await provider.getHistorical(from, to, startDate, endDate);
      } catch (e) {
        this.logger.warn(`Historical fetch failed from ${provider.name}: ${e.message}`);
      }
    }
    return [];
  }

  async checkAllHealth(): Promise<void> {
    for (const provider of this.providers) {
      const healthy = await provider.healthCheck();
      const key = `provider:health:${provider.name}`;
      if (!healthy) {
        await this.redis.set(key, 'false', 600);
      } else {
        await this.redis.del(key);
      }
      const month = new Date();
      month.setUTCDate(1);
      const monthStr = month.toISOString().split('T')[0];
      await this.usageRepo.upsert(
        {
          provider: provider.name,
          month: monthStr,
          quota_limit: provider.quotaLimit,
          is_healthy: healthy,
        },
        ['provider', 'month'],
      );
    }
  }

  async resetQuotas(): Promise<void> {
    const month = new Date();
    month.setUTCDate(1);
    const monthStr = month.toISOString().split('T')[0];
    for (const provider of this.providers) {
      await this.usageRepo.save({
        provider: provider.name,
        month: monthStr,
        request_count: 0,
        quota_limit: provider.quotaLimit,
        is_healthy: true,
      });
    }
  }

  async getProviderStatuses() {
    const month = new Date();
    month.setUTCDate(1);
    const monthStr = month.toISOString().split('T')[0];
    return this.usageRepo.find({ where: { month: monthStr } });
  }

  private async getUsage(providerName: string): Promise<ProviderUsage | null> {
    const month = new Date();
    month.setUTCDate(1);
    const monthStr = month.toISOString().split('T')[0];
    return this.usageRepo.findOne({ where: { provider: providerName, month: monthStr } });
  }

  private async logUsage(providerName: string, quotaLimit: number): Promise<void> {
    const month = new Date();
    month.setUTCDate(1);
    const monthStr = month.toISOString().split('T')[0];
    // Single atomic upsert: insert with count=1, on conflict increment count atomically
    await this.usageRepo
      .createQueryBuilder()
      .insert()
      .into(ProviderUsage)
      .values({ provider: providerName, month: monthStr, quota_limit: quotaLimit, request_count: 1, last_used_at: new Date() })
      .orIgnore()
      .execute()
      .catch(() => {/* row exists, proceed to increment */});
    // Atomic increment — safe under concurrent load
    await this.usageRepo
      .createQueryBuilder()
      .update(ProviderUsage)
      .set({ request_count: () => 'request_count + 1', last_used_at: new Date() })
      .where('provider = :p AND month = :m', { p: providerName, m: monthStr })
      .execute();
  }

  private async markProviderError(providerName: string, error: string): Promise<void> {
    const month = new Date();
    month.setUTCDate(1);
    const monthStr = month.toISOString().split('T')[0];
    await this.usageRepo.update(
      { provider: providerName, month: monthStr },
      { is_healthy: false, last_error: error, last_error_at: new Date() },
    );
  }
}
