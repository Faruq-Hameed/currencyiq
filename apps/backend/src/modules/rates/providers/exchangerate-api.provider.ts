import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HistoricalRate, IRateProvider } from './provider.interface';

@Injectable()
export class ExchangeRateApiProvider implements IRateProvider {
  name = 'exchangerate_api';
  priority = 3;
  quotaLimit = 1500;
  supportsHistorical = false;
  supportedCurrencies: string[] = [];

  private readonly logger = new Logger(ExchangeRateApiProvider.name);
  private readonly baseUrl = 'https://v6.exchangerate-api.com/v6';
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = config.get<string>('providers.exchangeRateApiKey') || '';
  }

  async getRates(base: string): Promise<Record<string, number>> {
    const resp = await axios.get(`${this.baseUrl}/${this.apiKey}/latest/${base}`, { timeout: 10000 });
    return resp.data.conversion_rates;
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
    if (!this.apiKey) return false;
    try {
      await axios.get(`${this.baseUrl}/${this.apiKey}/latest/USD`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
