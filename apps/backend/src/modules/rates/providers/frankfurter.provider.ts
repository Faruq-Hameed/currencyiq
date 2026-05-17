import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { HistoricalRate, IRateProvider } from './provider.interface';

export const FRANKFURTER_CURRENCIES = [
  'AUD','BGN','BRL','CAD','CHF','CNY','CZK','DKK','EUR','GBP',
  'HKD','HUF','IDR','ILS','INR','ISK','JPY','KRW','MXN','MYR',
  'NOK','NZD','PHP','PLN','RON','SEK','SGD','THB','TRY','USD','ZAR',
];

const BASE_URL = 'https://api.frankfurter.app';

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

const PERIOD_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

@Injectable()
export class FrankfurterProvider implements IRateProvider {
  name = 'frankfurter';
  priority = 2;
  quotaLimit = 999999;
  supportsHistorical = true;
  supportedCurrencies = FRANKFURTER_CURRENCIES;

  private readonly logger = new Logger(FrankfurterProvider.name);

  async getRates(base: string): Promise<Record<string, number>> {
    if (!FRANKFURTER_CURRENCIES.includes(base)) {
      throw new Error(`Frankfurter does not support base currency ${base}`);
    }
    const resp = await axios.get(`${BASE_URL}/latest`, {
      params: { from: base },
      timeout: 10000,
    });
    // Include the base itself at rate 1
    return { ...resp.data.rates, [base]: 1 } as Record<string, number>;
  }

  async getRate(from: string, to: string): Promise<number> {
    if (!FRANKFURTER_CURRENCIES.includes(from) || !FRANKFURTER_CURRENCIES.includes(to)) {
      throw new Error(`Frankfurter does not support ${from}/${to}`);
    }
    if (from === to) return 1;
    const resp = await axios.get(`${BASE_URL}/latest`, {
      params: { from, to },
      timeout: 10000,
    });
    const rate = resp.data.rates?.[to];
    if (rate == null) throw new Error(`Frankfurter returned no rate for ${from}/${to}`);
    return rate;
  }

  /**
   * Uses Frankfurter's date-range endpoint:
   *   GET /YYYY-MM-DD..YYYY-MM-DD?from=X&to=Y
   *
   * Weekends and ECB holidays are skipped in the response — gaps are normal.
   * The caller's chart should connect dots rather than show zeros.
   */
  async getHistorical(from: string, to: string, startDate: string, endDate: string): Promise<HistoricalRate[]> {
    if (!FRANKFURTER_CURRENCIES.includes(from) || !FRANKFURTER_CURRENCIES.includes(to)) {
      throw new Error(`Frankfurter does not support historical for ${from}/${to}`);
    }
    const url = `${BASE_URL}/${startDate}..${endDate}`;
    const resp = await axios.get(url, {
      params: { from, to },
      timeout: 15000,
    });

    const rawRates = resp.data.rates as Record<string, Record<string, number>>;
    if (!rawRates) return [];

    return Object.entries(rawRates)
      .map(([date, rates]) => ({
        date,
        rate: rates[to] ?? null,
      }))
      .filter((r): r is HistoricalRate => r.rate !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Build the history URL from a period string (7d / 30d / 90d / 1y).
   * Exported so RatesService can call it directly when routing history requests.
   */
  buildHistoricalUrl(from: string, to: string, period: string): string {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (PERIOD_DAYS[period] ?? 30));
    return `${BASE_URL}/${fmt(start)}..${fmt(end)}?from=${from}&to=${to}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const resp = await axios.get(`${BASE_URL}/latest`, {
        params: { from: 'USD', to: 'EUR' },
        timeout: 5000,
      });
      return !!resp.data?.rates;
    } catch {
      return false;
    }
  }
}
