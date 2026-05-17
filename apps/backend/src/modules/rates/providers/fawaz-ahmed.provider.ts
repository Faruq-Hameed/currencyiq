import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { HistoricalRate, IRateProvider } from './provider.interface';

@Injectable()
export class FawazAhmedProvider implements IRateProvider {
  name = 'fawaz_ahmed';
  priority = 5;
  quotaLimit = 999999;
  supportsHistorical = false;
  supportedCurrencies: string[] = [];

  private readonly logger = new Logger(FawazAhmedProvider.name);
  private readonly baseUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';

  async getRates(base: string): Promise<Record<string, number>> {
    const code = base.toLowerCase();
    const resp = await axios.get(`${this.baseUrl}/currencies/${code}.json`, { timeout: 10000 });
    const rates = resp.data[code] as Record<string, number>;
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(rates)) {
      result[k.toUpperCase()] = v;
    }
    return result;
  }

  async getRate(from: string, to: string): Promise<number> {
    const rates = await this.getRates(from);
    const rate = rates[to];
    if (rate == null || isNaN(rate)) throw new Error(`Rate not found for ${from}/${to}`);
    return rate;
  }

  async getHistorical(): Promise<HistoricalRate[]> {
    return [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/currencies/usd.json`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
