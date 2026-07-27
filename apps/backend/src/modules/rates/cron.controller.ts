import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CronSecretGuard } from '../../common/guards/cron-secret.guard';
import { RatesScheduler } from './rates.scheduler';

/**
 * HTTP-triggered equivalents of RatesScheduler's @Cron jobs, for platforms (like Vercel)
 * where functions don't stay alive between requests and in-process cron can't fire.
 * Wired up via the `crons` entries in vercel.json; ScheduleModule.forRoot() (and therefore
 * the @Cron decorators themselves) stays active for long-running deployments (Docker/Railway/etc).
 * GET, not POST: Vercel Cron Jobs invoke their target path with a GET request.
 */
@ApiExcludeController()
@UseGuards(CronSecretGuard)
@Controller('internal/cron')
export class CronController {
  constructor(private scheduler: RatesScheduler) {}

  @Get('sync-rates')
  syncRates() {
    return this.scheduler.syncAllRates();
  }

  @Get('reset-quotas')
  resetQuotas() {
    return this.scheduler.resetProviderQuotas();
  }

  @Get('refresh-metadata')
  refreshMetadata() {
    return this.scheduler.refreshCurrencyMetadata();
  }

  @Get('check-health')
  checkHealth() {
    return this.scheduler.checkProviderHealth();
  }

  @Get('cleanup-rates')
  cleanupRates() {
    return this.scheduler.cleanupOldRates();
  }
}
