import { Controller, Get, Post, Query, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { Request } from 'express';
import { RatesService } from './rates.service';
import { RedisThrottleGuard, RateLimit } from '../throttle/redis-throttle.guard';

const CURRENCY_RE = /^[A-Z]{2,10}$/;

function validateCurrency(code: string, name = 'currency'): string {
  const upper = code.toUpperCase().trim();
  if (!CURRENCY_RE.test(upper)) throw new BadRequestException(`Invalid ${name} code: ${code}`);
  return upper;
}

class RefreshDto {
  @IsString() @Matches(/^[A-Za-z]{2,10}$/) from: string;
  @IsString() @Matches(/^[A-Za-z]{2,10}$/) to: string;
}

@ApiTags('Rates')
@UseGuards(RedisThrottleGuard)
@Controller('rates')
export class RatesController {
  constructor(private ratesService: RatesService) {}

  @Get()
  @RateLimit(500, 3600)
  @ApiOperation({ summary: 'Get all rates for a base currency' })
  @ApiQuery({ name: 'base', required: false, example: 'USD' })
  async getAllRates(@Query('base') base = 'USD') {
    return this.ratesService.getAllRates(validateCurrency(base, 'base'));
  }

  @Get('convert')
  @RateLimit(500, 3600)
  @ApiOperation({ summary: 'Convert an amount between two currencies' })
  @ApiQuery({ name: 'from', required: true, example: 'USD' })
  @ApiQuery({ name: 'to', required: true, example: 'NGN' })
  @ApiQuery({ name: 'amount', required: false, example: '100' })
  async convert(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount') amount = '1',
  ) {
    if (!from || !to) throw new BadRequestException('from and to are required');
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) throw new BadRequestException('Invalid amount');
    return this.ratesService.convert(validateCurrency(from, 'from'), validateCurrency(to, 'to'), parsed);
  }

  @Get('convert/multi')
  @RateLimit(200, 3600)
  @ApiOperation({ summary: 'Convert to multiple currencies at once' })
  @ApiQuery({ name: 'to', description: 'Comma-separated currency codes', example: 'NGN,GBP,EUR' })
  async convertMulti(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount') amount = '1',
  ) {
    if (!from || !to) throw new BadRequestException('from and to are required');
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) throw new BadRequestException('Invalid amount');
    const targets = to.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (targets.length === 0) throw new BadRequestException('At least one target currency required');
    if (targets.length > 20) throw new BadRequestException('Maximum 20 target currencies');
    return this.ratesService.convertMulti(validateCurrency(from, 'from'), targets, parsed);
  }

  @Post('refresh')
  @RateLimit(5, 86400)
  @ApiOperation({ summary: 'Force refresh rate for a pair (rate-limited per API key / IP)' })
  @ApiSecurity('api-key')
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    if (!dto.from || !dto.to) throw new BadRequestException('from and to are required');
    const apiKey = (req.headers['x-api-key'] as string) || (req.query['api_key'] as string) || null;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return this.ratesService.forceRefresh(validateCurrency(dto.from, 'from'), validateCurrency(dto.to, 'to'), apiKey, ip);
  }

  @Get('history')
  @RateLimit(200, 3600)
  @ApiOperation({ summary: 'Get historical rates for a currency pair' })
  @ApiQuery({ name: 'period', enum: ['7d', '30d', '90d', '1y'], required: false })
  async history(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('period') period = '7d',
  ) {
    if (!from || !to) throw new BadRequestException('from and to are required');
    const validPeriods = ['7d', '30d', '90d', '1y'];
    const safePeriod = validPeriods.includes(period) ? period : '7d';
    return this.ratesService.getHistory(validateCurrency(from, 'from'), validateCurrency(to, 'to'), safePeriod);
  }
}
