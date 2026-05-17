import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { RatesModule } from './modules/rates/rates.module';
import { ThrottleModule } from './modules/throttle/throttle.module';
import { User } from './modules/users/entities/user.entity';
import { ApiKey } from './modules/api-keys/entities/api-key.entity';
import { Currency } from './modules/currencies/entities/currency.entity';
import { Banknote } from './modules/currencies/entities/banknote.entity';
import { ExchangeRate } from './modules/rates/entities/exchange-rate.entity';
import { ProviderUsage } from './modules/rates/entities/provider-usage.entity';
import { ApiUsageLog } from './modules/rates/entities/api-usage-log.entity';
import { CurrenciesService } from './modules/currencies/currencies.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.pass'),
        database: config.get<string>('database.name'),
        entities: [User, ApiKey, Currency, Banknote, ExchangeRate, ProviderUsage, ApiUsageLog],
        synchronize: true,
        logging: config.get<string>('nodeEnv') === 'development',
      }),
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    AuthModule,
    UsersModule,
    ApiKeysModule,
    CurrenciesModule,
    RatesModule,
    ThrottleModule,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private currenciesService: CurrenciesService) {}

  async onApplicationBootstrap() {
    await this.currenciesService.seedIfEmpty();
  }
}
