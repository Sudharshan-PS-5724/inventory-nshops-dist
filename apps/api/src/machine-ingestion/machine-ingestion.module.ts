import { Module } from '@nestjs/common';
import { CollectorTokenGuard } from './collector-token.guard.js';
import { MachineIngestionController } from './machine-ingestion.controller.js';
import { MachineIngestionService } from './machine-ingestion.service.js';

@Module({
  controllers: [MachineIngestionController],
  providers: [CollectorTokenGuard, MachineIngestionService],
})
export class MachineIngestionModule {}
