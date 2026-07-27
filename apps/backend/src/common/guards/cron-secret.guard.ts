import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guards internal cron-trigger endpoints. Vercel Cron Jobs automatically send
 * `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET env var is set on the
 * project, so this doubles as verification that the request actually came from
 * Vercel's scheduler (or another trusted scheduler configured with the same secret).
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('cronSecret');
    if (!secret) {
      throw new UnauthorizedException('CRON_SECRET is not configured');
    }
    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'];
    if (header !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return true;
  }
}
