import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RatesService } from './rates.service';
import { ProviderManagerService } from './provider-manager.service';
import { CurrenciesService } from '../currencies/currencies.service';

const MAJOR_CURRENCIES = [
  'USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','HKD','SGD',
  'NOK','SEK','DKK','NZD','MXN','BRL','ZAR','INR','KRW','TRY',
  'NGN','GHS','KES','EGP','MAD',
];

@Injectable()
export class RatesScheduler {
  private readonly logger = new Logger(RatesScheduler.name);

  constructor(
    private ratesService: RatesService,
    private providerManager: ProviderManagerService,
    private currenciesService: CurrenciesService,
  ) {}

  @Cron('0 * * * *')
  async syncAllRates() {
    this.logger.log('Running hourly rate sync...');
    await this.ratesService.syncAllRates(MAJOR_CURRENCIES);
    this.logger.log('Rate sync complete');
  }

  @Cron('0 0 1 * *')
  async resetProviderQuotas() {
    this.logger.log('Resetting provider quotas...');
    await this.providerManager.resetQuotas();
  }

  @Cron('0 2 * * 0')
  async refreshCurrencyMetadata() {
    this.logger.log('Refreshing currency metadata...');
    await this.currenciesService.seedFromRestCountries();
  }

  @Cron('*/10 * * * *')
  async checkProviderHealth() {
    await this.providerManager.checkAllHealth();
  }

  @Cron('0 3 1 */3 *')
  async cleanupOldRates() {
    this.logger.log('Cleaning up old exchange rates...');
    // Handled in currencies service via raw query
  }
}
