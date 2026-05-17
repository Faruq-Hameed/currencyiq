import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ProviderManagerService } from './provider-manager.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiUsageLog } from './entities/api-usage-log.entity';
import { Repository } from 'typeorm';

@ApiTags('Usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage')
export class UsageController {
  constructor(
    private providerManager: ProviderManagerService,
    @InjectRepository(ApiUsageLog) private logsRepo: Repository<ApiUsageLog>,
  ) {}

  @Get('me')
  async myUsage(@CurrentUser() user: User) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [month, day] = await Promise.all([
      this.logsRepo.createQueryBuilder('l').innerJoin('l.api_key', 'k').where('k.user_id = :id', { id: user.id }).andWhere('l.created_at >= :start', { start: startOfMonth }).getCount(),
      this.logsRepo.createQueryBuilder('l').innerJoin('l.api_key', 'k').where('k.user_id = :id', { id: user.id }).andWhere('l.created_at >= :today', { today }).getCount(),
    ]);
    return { data: { requests_this_month: month, requests_today: day } };
  }

  @Get('providers')
  async providerStatus() {
    const statuses = await this.providerManager.getProviderStatuses();
    return { data: statuses };
  }
}
