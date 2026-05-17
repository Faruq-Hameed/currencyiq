export interface HistoricalRate {
  date: string;
  rate: number;
  high?: number;
  low?: number;
}

export interface IRateProvider {
  name: string;
  priority: number;
  quotaLimit: number;
  supportedCurrencies: string[];
  supportsHistorical: boolean;
  getRate(from: string, to: string): Promise<number>;
  getRates(base: string): Promise<Record<string, number>>;
  getHistorical(from: string, to: string, startDate: string, endDate: string): Promise<HistoricalRate[]>;
  healthCheck(): Promise<boolean>;
}
