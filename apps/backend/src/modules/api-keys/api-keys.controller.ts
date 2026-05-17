import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiKeysService } from './api-keys.service';

class CreateKeyDto {
  @IsOptional() @IsString() name?: string;
}

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('keys')
export class ApiKeysController {
  constructor(private service: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'List user API keys' })
  async list(@CurrentUser() user: User) {
    const keys = await this.service.listForUser(user.id);
    return { data: keys.map((k) => ({ id: k.id, prefix: k.key_prefix, name: k.name, is_active: k.is_active, last_used_at: k.last_used_at, created_at: k.created_at })) };
  }

  @Post()
  @ApiOperation({ summary: 'Create API key (plain key shown once)' })
  async create(@CurrentUser() user: User, @Body() dto: CreateKeyDto) {
    const { apiKey, plainKey } = await this.service.create(user.id, dto.name);
    return { data: { id: apiKey.id, key: plainKey, prefix: apiKey.key_prefix, name: apiKey.name } };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke API key' })
  async revoke(@Param('id') id: string, @CurrentUser() user: User) {
    await this.service.revoke(id, user.id);
    return { data: { revoked: true } };
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get key usage stats' })
  async usage(@Param('id') id: string, @CurrentUser() user: User) {
    const stats = await this.service.getUsage(id, user.id);
    return { data: stats };
  }
}
