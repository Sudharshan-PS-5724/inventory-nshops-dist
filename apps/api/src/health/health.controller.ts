import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService, type HealthStatus } from './health.service.js';

@ApiTags('operations')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly database: DatabaseService,
  ) {}

  @Get('ready')
  @ApiOperation({ summary: 'Database readiness check' })
  async getReady() {
    try {
      await this.database.checkConnectivity();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is not ready.',
      });
    }
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness check' })
  @ApiOkResponse({ description: 'The API process is running.' })
  getLive(): HealthStatus {
    return this.healthService.getLive();
  }
}
