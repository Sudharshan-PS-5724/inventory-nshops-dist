import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { InventoryAvailabilityService } from './inventory-availability.service.js';
import { InventoryController } from './inventory.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [InventoryController],
  providers: [InventoryAvailabilityService],
})
export class InventoryModule {}
