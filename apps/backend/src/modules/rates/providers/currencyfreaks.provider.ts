import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HistoricalRate, IRateProvider } from './provider.interface';

@Injectable()
export class CurrencyFreaksProvider implements IRateProvider {
  name = 'currencyfreaks';
  priority = 4;
  quotaLimit = 1000;
  supportsHistorical = false;
  supportedCurrencies: string[] = [];

  private readonly logger = new Logger(CurrencyFreaksProvider.name);
  private readonly baseUrl = 'https://api.currencyfreaks.com/v2.0';
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = config.get<string>('providers.currencyFreaksApiKey') || '';
  }

  async getRates(base: string): Promise<Record<string, number>> {
    const resp = await axios.get(`${this.baseUrl}/rates/latest`, {
      params: { apikey: this.apiKey, base },
      timeout: 10000,
    });
    return resp.data.rates;
  }

  async getRate(from: string, to: string): Promise<number> {
    const rates = await this.getRates(from);
    const rate = parseFloat(rates[to] as any);
    if (rate == null || isNaN(rate)) throw new Error(`Rate not found for ${from}/${to}`);
    return rate;
  }

  async getHistorical(): Promise<HistoricalRate[]> {
    return [];
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await axios.get(`${this.baseUrl}/rates/latest`, {
        params: { apikey: this.apiKey, base: 'USD' },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
