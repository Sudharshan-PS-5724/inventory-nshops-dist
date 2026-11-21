import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CollectorTokenGuard } from './collector-token.guard.js';
import { MachineIngestionService } from './machine-ingestion.service.js';

@ApiTags('machine-ingestion')
@UseGuards(CollectorTokenGuard)
@Controller('machine-events')
export class MachineIngestionController {
  constructor(private readonly ingestion: MachineIngestionService) {}

  @Post('dahua')
  @ApiHeader({ name: 'X-Collector-Token', required: true })
  @ApiOperation({
    summary:
      'Ingest one decoded Dahua sale event, preserving raw evidence and quarantining invalid records.',
  })
  ingest(@Headers('x-collector-token') _collectorToken: string | undefined, @Body() body: unknown) {
    return this.ingestion.ingest(body);
  }
}
