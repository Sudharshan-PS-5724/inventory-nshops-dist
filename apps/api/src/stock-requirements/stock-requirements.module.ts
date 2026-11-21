import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { IdempotencyModule } from '../idempotency/idempotency.module.js';
import { StockRequirementsController } from './stock-requirements.controller.js';
import { StockRequirementsService } from './stock-requirements.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, IdempotencyModule],
  controllers: [StockRequirementsController],
  providers: [StockRequirementsService],
})
export class StockRequirementsModule {}
