import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity';
import { Banknote } from './entities/banknote.entity';
import { CurrenciesService } from './currencies.service';
import { CurrenciesController } from './currencies.controller';
import { ThrottleModule } from '../throttle/throttle.module';

@Module({
  imports: [TypeOrmModule.forFeature([Currency, Banknote]), ThrottleModule],
  providers: [CurrenciesService],
  controllers: [CurrenciesController],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
