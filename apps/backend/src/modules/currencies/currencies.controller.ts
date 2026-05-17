import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { RedisThrottleGuard, RateLimit } from '../throttle/redis-throttle.guard';

@ApiTags('Currencies')
@UseGuards(RedisThrottleGuard)
@Controller('currencies')
export class CurrenciesController {
  constructor(private service: CurrenciesService) {}

  @Get()
  @RateLimit(99999, 3600)
  @ApiOperation({ summary: 'List all currencies' })
  @ApiQuery({ name: 'search', required: false })
  async list(@Query('search') search?: string) {
    const currencies = await this.service.listAll(search);
    return { data: currencies };
  }

  @Get(':code')
  @RateLimit(99999, 3600)
  @ApiOperation({ summary: 'Get full currency info' })
  async getOne(@Param('code') code: string) {
    const currency = await this.service.findByCode(code.toUpperCase());
    return { data: currency };
  }
}
