import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { IdempotencyModule } from '../idempotency/idempotency.module.js';
import { StockClassificationController } from './stock-classification.controller.js';
import { StockClassificationService } from './stock-classification.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, IdempotencyModule],
  controllers: [StockClassificationController],
  providers: [StockClassificationService],
})
export class StockClassificationModule {}
