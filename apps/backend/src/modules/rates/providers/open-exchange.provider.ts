import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HistoricalRate, IRateProvider } from './provider.interface';

@Injectable()
export class OpenExchangeProvider implements IRateProvider {
  name = 'open_exchange_rates';
  priority = 1;
  quotaLimit = 1000;
  supportsHistorical = true;
  supportedCurrencies: string[] = [];

  private readonly logger = new Logger(OpenExchangeProvider.name);
  private readonly baseUrl = 'https://openexchangerates.org/api';
  private readonly appId: string;

  constructor(private config: ConfigService) {
    this.appId = config.get<string>('providers.openExchangeAppId') || '';
  }

  async getRates(base: string): Promise<Record<string, number>> {
    // Open Exchange free tier only supports USD as base; cross-rates are computed client-side
    const resp = await axios.get(`${this.baseUrl}/latest.json`, {
      params: { app_id: this.appId },
      timeout: 10000,
    });
    const usdRates = resp.data.rates as Record<string, number>;
    if (base === 'USD') return usdRates;
    // Re-base: divide all USD rates by the base currency's USD rate
    const baseRate = usdRates[base];
    if (!baseRate) throw new Error(`Open Exchange: base currency ${base} not available`);
    const result: Record<string, number> = {};
    for (const [code, rate] of Object.entries(usdRates)) {
      result[code] = rate / baseRate;
    }
    result[base] = 1;
    return result;
  }

  async getRate(from: string, to: string): Promise<number> {
    const rates = await this.getRates('USD');
    const fromRate = from === 'USD' ? 1 : rates[from];
    const toRate = to === 'USD' ? 1 : rates[to];
    if (!fromRate || !toRate) throw new Error(`Rate not found for ${from}/${to}`);
    return toRate / fromRate;
  }

  async getHistorical(from: string, to: string, startDate: string, endDate: string): Promise<HistoricalRate[]> {
    const results: HistoricalRate[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      try {
        const resp = await axios.get(`${this.baseUrl}/historical/${dateStr}.json`, {
          params: { app_id: this.appId },
          timeout: 10000,
        });
        const rates = resp.data.rates;
        const fromRate = from === 'USD' ? 1 : rates[from];
        const toRate = rates[to];
        if (fromRate && toRate) {
          results.push({ date: dateStr, rate: toRate / fromRate });
        }
      } catch (e) {
        this.logger.warn(`Historical fetch failed for ${dateStr}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return results;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.appId) return false;
    try {
      await axios.get(`${this.baseUrl}/latest.json`, {
        params: { app_id: this.appId },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
