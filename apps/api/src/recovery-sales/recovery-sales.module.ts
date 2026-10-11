import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RecoverySalesController } from './recovery-sales.controller.js';
import { RecoverySalesService } from './recovery-sales.service.js';

@Module({
  imports: [AuthModule],
  controllers: [RecoverySalesController],
  providers: [RecoverySalesService],
})
export class RecoverySalesModule {}
