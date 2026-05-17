import { Module } from '@nestjs/common';
import { RedisThrottleGuard } from './redis-throttle.guard';

@Module({
  providers: [RedisThrottleGuard],
  exports: [RedisThrottleGuard],
})
export class ThrottleModule {}
