import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { ProviderUsage } from './entities/provider-usage.entity';
import { ApiUsageLog } from './entities/api-usage-log.entity';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { RatesService } from './rates.service';
import { RatesController } from './rates.controller';
import { RatesScheduler } from './rates.scheduler';
import { ProviderManagerService } from './provider-manager.service';
import { OpenExchangeProvider } from './providers/open-exchange.provider';
import { FrankfurterProvider } from './providers/frankfurter.provider';
import { ExchangeRateApiProvider } from './providers/exchangerate-api.provider';
import { CurrencyFreaksProvider } from './providers/currencyfreaks.provider';
import { FawazAhmedProvider } from './providers/fawaz-ahmed.provider';
import { ThrottleModule } from '../throttle/throttle.module';
import { CurrenciesModule } from '../currencies/currencies.module';
import { UsageController } from './usage.controller';
import { UsageLoggerInterceptor } from '../../common/interceptors/usage-logger.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExchangeRate, ProviderUsage, ApiUsageLog, ApiKey]),
    ThrottleModule,
    CurrenciesModule,
  ],
  providers: [
    RatesService,
    RatesScheduler,
    ProviderManagerService,
    OpenExchangeProvider,
    FrankfurterProvider,
    ExchangeRateApiProvider,
    CurrencyFreaksProvider,
    FawazAhmedProvider,
    UsageLoggerInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: UsageLoggerInterceptor,
    },
  ],
  controllers: [RatesController, UsageController],
  exports: [RatesService, ProviderManagerService, TypeOrmModule],
})
export class RatesModule {}
