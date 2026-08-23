import { Controller, Get } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';
import { HealthStatusDto } from './dto/health-status.schema.js';
import { HealthService, type HealthStatus } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ZodResponse({ type: HealthStatusDto })
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.getStatus();
  }
}
