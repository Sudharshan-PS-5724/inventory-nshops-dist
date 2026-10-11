import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OpeningStockController } from './opening-stock.controller.js';
import { OpeningStockService } from './opening-stock.service.js';

@Module({
  imports: [AuthModule],
  controllers: [OpeningStockController],
  providers: [OpeningStockService],
})
export class OpeningStockModule {}
